import mongoose from "mongoose";
import { Tour } from "../models/Tour.js";
import { Booking } from "../models/Booking.js";
import { sendMail } from "../services/mailer.js";
import { buildVNPayPayUrl } from "../utils/vnpay.js";
import { createMoMoPayment } from "../utils/momo.js";
import { notifyTourConfirmed } from "../services/notify.js";
import axios from "axios";
import crypto from "crypto";
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
  try {
    await session.startTransaction();

    const {
      tourId,
      numAdults = 1,
      numChildren = 0,
      fullName,
      email,
      phoneNumber,
      address,
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

    // Số khách đặt
    const guestsRequested = (Number(numAdults) || 0) + (Number(numChildren) || 0);
    if (guestsRequested <= 0) {
      return res.status(400).json({ message: "Invalid guests" });
    }

    // Kiểm tra còn slot
    if (Number.isFinite(tour.quantity)) {
      const after = (tour.current_guests || 0) + guestsRequested;
      if (after > tour.quantity) {
        return res.status(400).json({
          message: "Not enough slots",
          available: Math.max(0, (tour.quantity || 0) - (tour.current_guests || 0))
        });
      }
    }

    const priceAdult = tour.priceAdult ?? 0;
    const priceChild = tour.priceChild ?? Math.round(priceAdult * 0.6);
    const totalPrice = (Number(numAdults) * priceAdult) + (Number(numChildren) * priceChild);

    const alreadyConfirmed = tour.status === "confirmed" || (tour.current_guests >= (tour.min_guests || 0));
    const depositRate   = alreadyConfirmed ? 1 : Number(process.env.BOOKING_DEPOSIT_RATE ?? 0.2);
    const depositAmount = Math.round(totalPrice * depositRate);

    const code = "BK" + Math.random().toString(36).slice(2, 8).toUpperCase();
    const [booking] = await Booking.create([{
      code,
      tourId,
      userId: req.user.id,
      fullName, email, phoneNumber, address, note,
      numAdults, numChildren,
      totalPrice,
      bookingStatus: "p",
      depositRate, depositAmount,
      paymentMethod: "momo",
      paidAmount: 0,
      depositPaid: false,
      paymentRefs: [],
      requireFullPayment: alreadyConfirmed
    }], { session });

    await session.commitTransaction();
    session.endSession();

    const partnerCode = process.env.MOMO_PARTNER_CODE;
    const accessKey   = process.env.MOMO_ACCESS_KEY;
    const secretKey   = process.env.MOMO_SECRET_KEY;
    const endpoint    = process.env.MOMO_API;
    const redirectUrl = process.env.MOMO_REDIRECT_URL;
    const ipnUrl      = process.env.MOMO_IPN_URL;    

    const amount = String(depositAmount);
    const orderId   = `${booking.code}-${Date.now()}`;
    const requestId = orderId;
    const orderInfo = alreadyConfirmed
      ? `Thanh toan 100% tour ${tour.title} - ${booking.code}`
      : `Coc tour ${tour.title} - ${booking.code}`;

    const rawSignature =
      "accessKey=" + accessKey +
      "&amount=" + amount +
      "&extraData=" + "" +
      "&ipnUrl=" + ipnUrl +
      "&orderId=" + orderId +
      "&orderInfo=" + orderInfo +
      "&partnerCode=" + partnerCode +
      "&redirectUrl=" + redirectUrl +
      "&requestId=" + requestId +
      "&requestType=captureWallet";

    const signature = crypto.createHmac("sha256", secretKey).update(rawSignature).digest("hex");

    const requestBody = {
      partnerCode, accessKey, requestId,
      amount, orderId, orderInfo, redirectUrl, ipnUrl,
      requestType: "captureWallet",
      signature, extraData: ""
    };

    const momoResp = await axios.post(endpoint, requestBody, {
      headers: { "Content-Type": "application/json" },
      validateStatus: () => true
    });

    if (momoResp.status !== 200 || momoResp.data?.resultCode !== 0) {
      return res.status(502).json({
        message: "MoMo create payment failed",
        error: momoResp.data?.message || `HTTP ${momoResp.status}`,
        raw: momoResp.data,
        booking
      });
    }

    return res.status(201).json({
      message: alreadyConfirmed
        ? "Tour đã xác nhận, vui lòng thanh toán 100%"
        : "Booking created, please pay deposit",
      booking,
      payUrl: momoResp.data.payUrl,
      deeplink: momoResp.data.deeplink
    });

  } catch (err) {
    try { if (session.inTransaction()) await session.abortTransaction(); } catch {}
    try { session.endSession(); } catch {}
    return res.status(500).json({ message: err.message });
  }
};




export const onPaymentReceived = async (req, res) => {
  try {
    const { code, amount, provider = "momo", ref = Date.now() } = req.body;
    const booking = await Booking.findOne({ code });
    if (!booking) return res.status(404).json({ message: "Booking not found" });

    if (booking.paymentRefs?.some(p => p.ref === String(ref) && p.provider === provider)) {
      return res.json({ message: "Already processed", booking });
    }

    const wasDeposited = Boolean(booking.depositPaid);
    const isFirstDeposit = !wasDeposited && Number(amount) > 0;

    booking.paidAmount = (booking.paidAmount || 0) + Number(amount || 0);
    booking.paymentRefs = booking.paymentRefs || [];
    booking.paymentRefs.push({ provider, ref: String(ref), amount: Number(amount||0), at: new Date() });
    if (isFirstDeposit) booking.depositPaid = true;

    if ((booking.paidAmount || 0) >= (booking.totalPrice || Number.MAX_SAFE_INTEGER)) {
      booking.bookingStatus = "c";
    }
    await booking.save();

    if (isFirstDeposit && booking.email) {
      try {
        await sendMail({
          to: booking.email,
          subject: `Đã nhận tiền cọc - ${booking.code}`,
          html: `
            <p>Xin chào ${booking.fullName || "Quý khách"},</p>
            <p>Chúng tôi đã nhận tiền cọc cho đơn <b>${booking.code}</b> với số tiền <b>${Number(amount).toLocaleString()} VND</b>.</p>
            <p>Tổng giá: <b>${(booking.totalPrice||0).toLocaleString()} VND</b> — Đã trả: <b>${(booking.paidAmount||0).toLocaleString()} VND</b>.</p>
            <p>Chúng tôi sẽ thông báo ngay khi tour xác nhận khởi hành.</p>
          `
        });
      } catch (e) { console.error("Send deposit mail error:", e); }
    }

    // TĂNG current_guests
    if (isFirstDeposit) {
      const guestsToAdd = (booking.numAdults||0) + (booking.numChildren||0);
      await Tour.updateOne({ _id: booking.tourId }, { $inc: { current_guests: guestsToAdd } });
      const tour = await Tour.findById(booking.tourId);

        if (Number.isFinite(tour.quantity)) {
        if ((tour.current_guests || 0) + guestsToAdd > tour.quantity) {
            return res.status(409).json({ message: "Sold out while paying. Please contact support for refund." });
        }
        }
      if (tour && (tour.current_guests||0) >= (tour.min_guests||0) && tour.status !== "confirmed") {
        tour.status = "confirmed";
        await tour.save();
        await notifyTourConfirmed(tour._id);
      }
    } else {

      if (booking.bookingStatus === "c" && booking.email) {
        try {
          await sendMail({
            to: booking.email,
            subject: `Xác nhận thanh toán đủ - ${booking.code}`,
            html: `<p>Đơn <b>${booking.code}</b> đã thanh toán đủ. Hẹn gặp bạn tại tour!</p>`
          });
        } catch (e) { console.error("Send fully-paid mail error:", e); }
      }
    }

    return res.json({ message: "Payment recorded", booking });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


// Lịch sử đơn
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

export const cancelBookingByUser = async (req, res) => {
  const { code } = req.params;
  const bk = await Booking.findOne({ code });
  if (!bk) return res.status(404).json({ message: "Booking not found" });
  if (bk.bookingStatus !== "p") {
    return res.status(400).json({ message: "Only pending bookings can be canceled" });
  }

  bk.bookingStatus = "x";
  await bk.save();

  res.json({ message: "Canceled", booking: bk });
};
