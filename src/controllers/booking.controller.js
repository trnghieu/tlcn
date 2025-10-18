import mongoose from "mongoose";
import { Tour } from "../models/Tour.js";
import { Booking } from "../models/Booking.js";
import { sendMail } from "../services/mailer.js";
import { buildVNPayPayUrl } from "../utils/vnpay.js";


function getClientIp(req) {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return xf.split(",")[0].trim();
  return req.socket?.remoteAddress || "127.0.0.1";
}

function genCode() {
  return "BK" + Math.random().toString(36).slice(2, 8).toUpperCase();
}


export const createBooking = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const {
      tourId,
      numAdults = 1,
      numChildren = 0,
      fullName,
      email,
      phoneNumber,
      address,
      paymentMethod = "momo", // đổi mặc định sang momo
      note
    } = req.body;

    if (!mongoose.isValidObjectId(tourId)) {
      return res.status(400).json({ message: "Invalid tourId" });
    }

    const tour = await Tour.findById(tourId).session(session);
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    if (tour.status === "closed") {
      return res.status(400).json({ message: "Tour is closed" });
    }

    // snapshot giá
    const priceAdult = tour.priceAdult ?? 0;
    const priceChild = tour.priceChild ?? Math.round(priceAdult * 0.6);
    const totalPrice = numAdults * priceAdult + numChildren * priceChild;

    const depositRate   = Number(process.env.BOOKING_DEPOSIT_RATE ?? 0.2);
    const depositAmount = Math.round(totalPrice * depositRate);

    const [booking] = await Booking.create([{
      code: genCode(),
      tourId,
      userId: req.user.id,
      fullName, email, phoneNumber, address,
      numAdults, numChildren,
      totalPrice,
      bookingStatus: "p",
      depositRate, depositAmount,
      paymentMethod: "momo",
      paidAmount: 0,
      depositPaid: false,
      paymentRefs: []
    }], { session });

    await session.commitTransaction();
    session.endSession();

    // === Tạo payUrl MoMo ===
    const orderId   = booking.code;          // duy nhất
    const requestId = booking.code;          // có thể dùng cùng mã
    const orderInfo = `Coc tour ${tour.title} - ${booking.code}`;

    const { payUrl, deeplink, error, raw } = await createMoMoPayment({
      partnerCode: process.env.MOMO_PARTNER_CODE,
      accessKey:   process.env.MOMO_ACCESS_KEY,
      secretKey:   process.env.MOMO_SECRET_KEY,
      momoApi:     process.env.MOMO_API,
      redirectUrl: process.env.MOMO_REDIRECT_URL,
      ipnUrl:      process.env.MOMO_IPN_URL,
      amountVND:   depositAmount,
      orderId,
      requestId,
      orderInfo,
      requestType: "captureWallet",   // hoặc "payWithATM"
      extraData:   ""                 // nếu cần, base64(JSON)…
    });

    if (error) {
      return res.status(502).json({ message: "MoMo create payment failed", error, raw });
    }

    res.status(201).json({
      message: "Booking created, please pay deposit",
      booking,
      payUrl,      // FE redirect tới URL này
      deeplink     // nếu mở app MoMo
    });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};



export const onDepositPaid = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { code, amount, provider, ref } = req.body;

    const bk = await Booking.findOne({ code }).session(session);
    if (!bk) return res.status(404).json({ message: "Booking not found" });

    if (bk.depositPaid) {
      await session.commitTransaction();
      session.endSession();
      return res.json({ message: "Already processed", booking: bk });
    }

    if (amount < bk.depositAmount) {
      throw new Error("Deposit amount not enough");
    }

    // ghi nhận cọc
    bk.paidAmount  = (bk.paidAmount || 0) + amount;
    bk.depositPaid = true;
    bk.paymentRefs.push({ provider, ref, amount, at: new Date() });
    await bk.save({ session });

    // tăng số khách đã gom của tour
    const guests = bk.numAdults + bk.numChildren;
    const tour = await Tour.findByIdAndUpdate(
      bk.tourId,
      { $inc: { current_guests: guests } },
      { new: true, session }
    );

    // Nếu đủ khách => chuyển tour sang confirmed (và có thể cập nhật toàn bộ booking liên quan)
    if (tour.current_guests >= tour.min_guests && tour.status !== "confirmed") {
      tour.status = "confirmed";
      await tour.save({ session });

      // (tuỳ chính sách) chuyển những booking đã cọc sang 'c'
      await Booking.updateMany(
        { tourId: tour._id, depositPaid: true, bookingStatus: "p" },
        { $set: { bookingStatus: "c" } },
        { session }
      );
    }

    await session.commitTransaction();
    session.endSession();

    // Gửi mail thông báo
    if (bk.email) {
      await sendMail({
        to: bk.email,
        subject: "Đã nhận tiền đặt cọc",
        html: `<p>Đơn <b>${bk.code}</b> đã nhận cọc ${amount}. Trạng thái hiện tại: <b>${bk.bookingStatus}</b>.</p>`
      });
    }

    res.json({ message: "Deposit recorded", booking: bk });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    res.status(500).json({ message: err.message });
  }
};

// Lịch sử đơn của tôi
export const myBookings = async (req, res) => {
  const page  = Math.max(parseInt(req.query.page || "1", 10), 1);
  const limit = Math.min(parseInt(req.query.limit || "10", 10), 50);

  const [rows, total] = await Promise.all([
    Booking.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Booking.countDocuments({ userId: req.user.id })
  ]);

  res.json({ total, page, limit, data: rows });
};

// Người dùng hủy khi chưa confirm (tuỳ chính sách refund)
export const cancelBookingByUser = async (req, res) => {
  const { code } = req.params;
  const bk = await Booking.findOne({ code });
  if (!bk) return res.status(404).json({ message: "Booking not found" });
  if (bk.bookingStatus !== "p") {
    return res.status(400).json({ message: "Only pending bookings can be canceled" });
  }

  // Nếu đã cọc rồi thì xử lý theo chính sách (hoàn cọc hay mất cọc...). Ở đây giả sử hoàn cọc thủ công.
  bk.bookingStatus = "x";
  await bk.save();

  res.json({ message: "Canceled", booking: bk });
};
