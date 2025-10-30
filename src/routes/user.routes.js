import { Router } from "express";
import { auth } from "../middleware/auth.js";
import { getMyProfile, updateMyProfile, changePassword } from "../controllers/user.controller.js";
import { passwordValidator } from "../utils/passwordValidator.js";
import { body } from "express-validator";
import { validate } from "../middleware/validate.js";
import { uploadAvatarMulter } from "../middleware/upload.js";
import { uploadMyAvatar } from "../controllers/user.controller.js";

const VN_PHONE = /^(?:\+?84|0)(?:3|5|7|8|9)\d{8}$/;

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
router.put(
  "/me",
  auth,
  [
    body("fullName").optional().isLength({ min: 2, max: 100 }).withMessage("fullName 2-100 kí tự"),
    body("phoneNumber").optional({ nullable: true, checkFalsy: true })
      .matches(VN_PHONE).withMessage("Số điện thoại VN không hợp lệ"),
    body("address").optional().isLength({ max: 255 }).withMessage("address tối đa 255 kí tự"),
    body("avatar").optional().isURL().withMessage("avatar phải là URL hợp lệ"),
    body("username").optional()
      .isLength({ min: 3, max: 32 }).withMessage("username 3-32 kí tự")
      .matches(/^[a-zA-Z0-9_]+$/).withMessage("username chỉ gồm chữ, số, _")
  ],
  validate,
  updateMyProfile
);

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
router.put(
  "/change-password",
  auth,
  [
    body("oldPassword").notEmpty().withMessage("oldPassword không được để trống"),
    body("newPassword").custom(passwordValidator),
  ],
  validate,
  changePassword
);

/**
 * @openapi
 * /api/users/me/avatar:
 *   post:
 *     tags: [Users]
 *     summary: Upload avatar cho user hiện tại
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               avatar:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Avatar updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 avatarPath: { type: string, example: "/uploads/avatars/68f...-173..jpg" }
 *                 avatarUrl:  { type: string, example: "http://localhost:4000/uploads/avatars/..." }
 */
router.post("/me/avatar", auth, uploadAvatarMulter.single("avatar"), uploadMyAvatar);
export default router;
