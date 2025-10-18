import { Router } from "express";
import { verifyMoMoIPN } from "../utils/momo.js";
import { onDepositPaid } from "../controllers/booking.controller.js";

const router = Router();

/**
 * MoMo RETURN (User redirect về sau khi thanh toán)
 * Thường MoMo bắn query bằng GET; có thể cấu hình POST.
 * Ở dev, chỉ cần verify signature và gọi onDepositPaid khi resultCode === 0
 */
router.get("/momo/return", async (req, res) => {
  try {
    const q = req.query;
    const ok = verifyMoMoIPN(q, process.env.MOMO_SECRET_KEY);
    if (!ok) return res.status(400).send("INVALID_SIGNATURE");

    // 0 = success (MoMo)
    if (String(q.resultCode) === "0") {
      req.body = {
        code:    q.orderId,               // booking.code bạn đã set = orderId
        amount:  Number(q.amount),        // VND
        provider:"momo",
        ref:     String(q.transId || q.requestId || "MoMo")
      };
      await onDepositPaid(req, res);      // cập nhật DB (đã send JSON trong onDepositPaid)
    } else {
      res.status(400).send("PAYMENT_FAILED:" + q.resultCode);
    }
  } catch (err) {
    res.status(500).send(err.message);
  }
});

/**
 * MoMo IPN (server-to-server, đáng tin cậy)
 * MoMo thường gửi POST JSON; nhưng sandbox cũng có thể GET.
 * Ta hỗ trợ cả hai bằng cách đọc req.body trước, fallback sang req.query.
 */
router.post("/momo/ipn", async (req, res) => {
  try {
    const q = Object.keys(req.body || {}).length ? req.body : req.query;
    const ok = verifyMoMoIPN(q, process.env.MOMO_SECRET_KEY);
    if (!ok) return res.status(400).json({ message: "INVALID_SIGNATURE" });

    if (String(q.resultCode) === "0") {
      req.body = {
        code:    q.orderId,
        amount:  Number(q.amount),
        provider:"momo",
        ref:     String(q.transId || q.requestId || "MoMo")
      };
      await onDepositPaid(req, res); // đã res.json bên trong
    } else {
      res.status(400).json({ message: "PAYMENT_FAILED", resultCode: q.resultCode });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
