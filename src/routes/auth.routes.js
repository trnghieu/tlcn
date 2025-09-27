import { Router } from "express";
import {
  register,
  login,
  logout,
  resetPassword
} from "../controllers/auth.controller.js";
import { auth } from "../middleware/auth.js";
import passport from "../config/passport.js";  
import jwt from "jsonwebtoken";

const router = Router();

// Đăng ký
/**
 * @openapi
 * /api/auth/register:
 *   post:
 *     summary: Đăng ký tài khoản (thêm phoneNumber)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [username, email, password]
 *             properties:
 *               fullName: { type: string, example: "Nguyen Van A" }
 *               username: { type: string, example: "nguyenvana" }
 *               email: { type: string, example: "a@example.com" }
 *               password: { type: string, example: "123456" }
 *               phoneNumber: { type: string, example: "0912345678" }
 *     responses:
 *       201: { description: Registered }
 */
router.post("/register", register);

// Đăng nhập
/**
 * @openapi
 * /api/auth/login:
 *   post:
 *     summary: Đăng nhập bằng username hoặc email
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [identifier, password]
 *             properties:
 *               identifier:
 *                 type: string
 *                 example: "nguyenvana"   # hoặc "a@example.com"
 *               password:
 *                 type: string
 *                 example: "123456"
 *     responses:
 *       200: { description: Login success }
 */
router.post("/login", login);

router.get("/google", passport.authenticate("google", { scope: ["profile", "email"] }));

router.get("/google/callback",
  passport.authenticate("google", { failureRedirect: "/login" }),
  (req, res) => {
    // Đăng nhập thành công → cấp JWT hoặc set cookie
    const token = jwt.sign(
      { id: req.user.userId, role: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );
    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Login with Google success", token, user: req.user });
  }
);

// Đăng xuất
/**
 * @openapi
 * /api/auth/logout:
 *   post:
 *     summary: Đăng xuất
 *     tags: [Auth]
 *     responses:
 *       200:
 *         description: Logout success
 */
router.post("/logout", logout);

// Quên mật khẩu
/**
 * @openapi
 * /api/auth/forgot-password:
 *   post:
 *     summary: Quên mật khẩu (gửi mật khẩu mới qua email)
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *     responses:
 *       200:
 *         description: New password sent
 */
router.post("/forgot-password", resetPassword);

// Lấy thông tin người dùng hiện tại (test middleware)
/**
 * @openapi
 * /api/auth/me:
 *   get:
 *     summary: Lấy thông tin user hiện tại
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Current user
 */
router.get("/me", auth, (req, res) => {
  res.json({ user: req.user });
});

export default router;
