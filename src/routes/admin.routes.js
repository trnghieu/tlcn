import { Router } from "express";
import { adminLogin } from "../controllers/admin.controller.js";
import { Admin } from "../models/Admin.js";
import { auth, adminOnly } from "../middleware/auth.js";
import {
  listOngoingTours,
  updateLeader,
  addTimelineEvent,
  createExpense,
  listExpensesAdmin,
  updateExpense,
  deleteExpense
} from "../controllers/admin.controller.js";
const router = Router();

/**
 * @openapi
 * /api/admin/login:
 *   post:
 *     summary: Đăng nhập bằng username hoặc email
 *     tags: [Admin]
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

/**
 * @openapi
 * /api/admin/tours/ongoing:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Danh sách tour đang diễn ra
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: onlyToday
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *           default: 0
 *         description: 1 = chỉ tour có now nằm trong [startDate, endDate]
 *     responses:
 *       200:
 *         description: OK
 */

router.get("/tours/ongoing", auth, adminOnly, listOngoingTours);

/**
 * @openapi
 * /api/admin/tours/{id}/leader:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Cập nhật người dẫn tour (leader)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *           example: "68f30a0c9a9e2d9f3f8b5c10"
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [fullName, phoneNumber]
 *             properties:
 *               fullName:
 *                 type: string
 *                 example: "Nguyễn Văn B"
 *               phoneNumber:
 *                 type: string
 *                 example: "0901234567"
 *               note:
 *                 type: string
 *                 example: "Leader miền Bắc"
 *     responses:
 *       200:
 *         description: Leader updated
 */
router.patch("/tours/:id/leader", auth, adminOnly, updateLeader);

/**
 * @openapi
 * /api/admin/tours/{id}/timeline:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Thêm sự kiện timeline (khởi hành/đến nơi/checkpoint/ghi chú/kết thúc)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventType]
 *             properties:
 *               eventType:
 *                 type: string
 *                 enum: [departed, arrived, checkpoint, note, finished]
 *               at:
 *                 type: string
 *                 format: date-time
 *                 example: "2025-12-01T07:30:00.000Z"
 *               place:
 *                 type: string
 *                 example: "Hà Nội"
 *               note:
 *                 type: string
 *                 example: "Xuất phát đúng giờ"
 *     responses:
 *       200:
 *         description: Timeline updated
 */
router.post("/tours/:id/timeline", auth, adminOnly, addTimelineEvent);

/**
 * @openapi
 * /api/admin/tours/{id}/expenses:
 *   post:
 *     tags:
 *       - Admin
 *     summary: Thêm chi phí phát sinh cho tour (thời gian sẽ lấy theo server)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [title, amount]
 *             properties:
 *               title:
 *                 type: string
 *                 example: "Vé tham quan Hang Sửng Sốt"
 *               amount:
 *                 type: number
 *                 example: 800000
 *               note:
 *                 type: string
 *                 example: "Phát sinh tại điểm A"
 *               visibleToCustomers:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Expense created (occurredAt = server time)
 */
router.post("/tours/:id/expenses", auth, adminOnly, createExpense);
router.get("/tours/:id/expenses",  auth, adminOnly, listExpensesAdmin);

/**
 * @openapi
 * /api/admin/expenses/{expenseId}:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Sửa chi phí phát sinh
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Expense updated
 *   delete:
 *     tags:
 *       - Admin
 *     summary: Xóa chi phí phát sinh
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Expense deleted
 */
router.patch("/expenses/:expenseId", auth, adminOnly, updateExpense);
router.delete("/expenses/:expenseId", auth, adminOnly, deleteExpense);

export default router;
