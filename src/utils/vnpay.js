import crypto from "crypto";

/** Chuẩn hoá & sort object theo key tăng dần, encode theo VNPay */
function canonicalizeParams(obj = {}) {
  const sortedKeys = Object.keys(obj).sort();
  const parts = [];
  for (const k of sortedKeys) {
    const v = obj[k];
    if (v !== undefined && v !== null && v !== "") {
      parts.push(encodeURIComponent(k) + "=" + encodeURIComponent(String(v)));
    }
  }
  return parts.join("&");
}

/** Tạo chữ ký HMAC SHA512 theo tài liệu VNPay */
function signVNPay(queryString, secret) {
  return crypto.createHmac("sha512", secret).update(queryString, "utf8").digest("hex");
}

/**
 * Build payUrl cho VNPay
 * @param {Object} p
 * @param {string} p.tmnCode
 * @param {string} p.hashSecret
 * @param {string} p.vnpUrl
 * @param {string} p.returnUrl
 * @param {number} p.amountVND Số tiền VND (ví dụ: 1600000) — SẼ NHÂN 100 THEO QUY ĐỊNH VNPay
 * @param {string} p.orderInfo Mô tả đơn hàng
 * @param {string} p.txnRef Mã đơn (duy nhất) — ví dụ booking.code
 * @param {string} p.ipAddr IP client
 * @param {string} [p.locale="vn"]
 * @param {string} [p.orderType="other"]
 */
export function buildVNPayPayUrl({
  tmnCode, hashSecret, vnpUrl, returnUrl,
  amountVND, orderInfo, txnRef, ipAddr,
  locale = "vn",
  orderType = "other"
}) {
  const now = new Date();
  // YYYYMMDDHHmmss theo giờ VN
  const pad = n => String(n).padStart(2, "0");
  const y = now.getFullYear();
  const M = pad(now.getMonth() + 1);
  const d = pad(now.getDate());
  const h = pad(now.getHours());
  const m = pad(now.getMinutes());
  const s = pad(now.getSeconds());
  const vnp_CreateDate = `${y}${M}${d}${h}${m}${s}`;

  const params = {
    vnp_Version: "2.1.0",
    vnp_Command: "pay",
    vnp_TmnCode: tmnCode,
    vnp_Locale: locale,                // "vn" hoặc "en"
    vnp_CurrCode: "VND",
    vnp_TxnRef: txnRef,                // duy nhất
    vnp_OrderInfo: orderInfo,
    vnp_OrderType: orderType,          // theo bảng của VNPay; "other" cũng được
    vnp_Amount: Math.round(Number(amountVND) * 100), // QUAN TRỌNG: x100
    vnp_ReturnUrl: returnUrl,
    vnp_IpAddr: ipAddr || "0.0.0.0",
    vnp_CreateDate
    // Có thể thêm: vnp_ExpireDate
  };

  const qs = canonicalizeParams(params);
  const vnp_SecureHash = signVNPay(qs, hashSecret);

  const url = `${vnpUrl}?${qs}&vnp_SecureHash=${vnp_SecureHash}`;
  return url;
}

/** Xác minh chữ ký từ VNPay trả về (exclude 2 field SecureHash*) */
export function verifyVNPayReturn(queryObj, secret) {
  const { vnp_SecureHash, vnp_SecureHashType, ...rest } = queryObj || {};
  const qs = canonicalizeParams(rest);
  const calc = signVNPay(qs, secret);
  return (vnp_SecureHash || "").toLowerCase() === calc.toLowerCase();
}
