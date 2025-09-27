import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getMyProfile, updateMyProfile, changePassword } from "../controllers/user.controller.js";

const router = Router();

/**
 * @openapi
 * /api/users/me:
 *   get:
 *     tags: [Users]
 *     summary: Xem hồ sơ của chính mình
 *     security: [ { bearerAuth: [] } ]
 *     responses:
 *       200: { description: OK }
 */
router.get("/me", auth, getMyProfile);

/**
 * @openapi
 * /api/users/me:
 *   put:
 *     tags: [Users]
 *     summary: Cập nhật hồ sơ (fullName, phoneNumber, address, avatar, username)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fullName: { type: string, example: "Nguyen Van A" }
 *               phoneNumber: { type: string, example: "0912345678" }
 *               address: { type: string, example: "Hà Nội" }
 *               avatar: { type: string, example: "https://.../avatar.jpg" }
 *               username: { type: string, example: "nguyenvana" }
 *     responses:
 *       200: { description: Updated }
 */
router.put("/me", auth, updateMyProfile);

/**
 * @openapi
 * /api/users/change-password:
 *   put:
 *     tags: [Users]
 *     summary: Đổi mật khẩu (cần oldPassword, newPassword)
 *     security: [ { bearerAuth: [] } ]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [oldPassword, newPassword]
 *             properties:
 *               oldPassword: { type: string, example: "123456" }
 *               newPassword: { type: string, example: "newStrongPass1!" }
 *     responses:
 *       200: { description: Password changed }
 */
router.put("/change-password", auth, changePassword);

export default router;
