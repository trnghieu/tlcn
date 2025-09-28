import { Router } from "express";
import { adminLogin } from "../controllers/admin.controller.js";
import { Admin } from "../models/Admin.js";

const router = Router();

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     summary: Đăng nhập bằng username hoặc email
 *     tags: [admin]
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
 *                 example: "admin"   # hoặc "a@example.com"
 *               password:
 *                 type: string
 *                 example: "Abc@1234"
 *     responses:
 *       200: { description: Login success }
 */

router.post("/login", adminLogin);

export default router;
