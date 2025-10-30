import { Router } from "express";
import { auth, adminOnly } from "../middleware/auth.js";
import {
  adminLogin,
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
 *     tags:
 *       - Admin
 *     summary: Đăng nhập admin bằng username hoặc email
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - identifier
 *               - password
 *             properties:
 *               identifier:
 *                 type: string
 *                 description: Username hoặc email
 *                 example: admin
 *               password:
 *                 type: string
 *                 example: Abc@1234
 *     responses:
 *       200:
 *         description: Login success
 */
router.post("/login", adminLogin);

/**
 * @openapi
 * /api/admin/tours/ongoing:
 *   get:
 *     tags:
 *       - Admin
 *     summary: Danh sách tour đang diễn ra (hoặc confirmed sắp chạy)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: onlyToday
 *         schema:
 *           type: integer
 *           enum: [0, 1]
 *           default: 0
 *         description: 1 = chỉ lấy tour mà thời điểm hiện tại nằm trong khoảng [startDate, endDate]
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
 *     summary: Gán/cập nhật leader cho tour
 *     description: |
 *       Có 2 cách:
 *       1) Gán leader theo `leaderId` (ObjectId tham chiếu collection tbl_leader) → hệ thống sẽ snapshot `leader{fullName, phoneNumber}` theo dữ liệu Leader hiện tại.
 *       2) Hoặc cập nhật nhanh snapshot `leader` (không đổi leaderId) bằng `fullName` + `phoneNumber` (+ `note`).
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ObjectId (24 hex)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             oneOf:
 *               - type: object
 *                 required:
 *                   - leaderId
 *                 properties:
 *                   leaderId:
 *                     type: string
 *                     description: Leader ObjectId
 *                     example: 68f30a0c9a9e2d9f3f8b5c10
 *                   note:
 *                     type: string
 *                     example: Leader miền Bắc
 *               - type: object
 *                 required:
 *                   - fullName
 *                   - phoneNumber
 *                 properties:
 *                   fullName:
 *                     type: string
 *                     example: Nguyễn Văn B
 *                   phoneNumber:
 *                     type: string
 *                     example: 0901234567
 *                   note:
 *                     type: string
 *                     example: Hỗ trợ tuyến vịnh
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
 *     summary: Thêm sự kiện timeline (departed/arrived/checkpoint/note/finished)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - eventType
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
 *                 example: Hà Nội
 *               note:
 *                 type: string
 *                 example: Xuất phát đúng giờ
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
 *     summary: Thêm chi phí phát sinh (occurredAt = thời gian server)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ObjectId
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - amount
 *             properties:
 *               title:
 *                 type: string
 *                 example: Vé tham quan Hang Sửng Sốt
 *               amount:
 *                 type: number
 *                 example: 800000
 *               note:
 *                 type: string
 *                 example: Phát sinh tại điểm A
 *               visibleToCustomers:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       201:
 *         description: Expense created
 *   get:
 *     tags:
 *       - Admin
 *     summary: Danh sách chi phí của tour
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Tour ObjectId
 *     responses:
 *       200:
 *         description: OK
 */
router.post("/tours/:id/expenses", auth, adminOnly, createExpense);
router.get("/tours/:id/expenses",  auth, adminOnly, listExpensesAdmin);

/**
 * @openapi
 * /api/admin/expenses/{expenseId}:
 *   patch:
 *     tags:
 *       - Admin
 *     summary: Sửa chi phí phát sinh (không cho sửa occurredAt/addedBy)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: expenseId
 *         required: true
 *         schema:
 *           type: string
 *         description: Expense ObjectId
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
 *         description: Expense ObjectId
 *     responses:
 *       200:
 *         description: Expense deleted
 */
router.patch("/expenses/:expenseId", auth, adminOnly, updateExpense);
router.delete("/expenses/:expenseId", auth, adminOnly, deleteExpense);

export default router;
