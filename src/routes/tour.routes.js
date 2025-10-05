import { Router } from "express";
import {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour,
  searchTours,
  suggestDestinations 
} from "../controllers/tour.controller.js";
import { auth, adminOnly} from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { query } from "express-validator";

const router = Router();


/**
 * @openapi
 * /api/tours/suggest:
 *   get:
 *     tags: [Tours]
 *     summary: Gợi ý địa điểm theo prefix (không cần đăng nhập)
 *     parameters:
 *       - in: query
 *         name: term
 *         schema: { type: string, example: "ha" }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 8 }
 *     responses:
 *       200: { description: OK }
 */
router.get("/suggest", suggestDestinations);

// Tìm kiếm tour
/**
 * @openapi
 * /api/tours/search:
 *   get:
 *     tags: [Tours]
 *     summary: Tìm kiếm tour theo địa điểm, thời gian, ngân sách, từ khóa
 *     parameters:
 *       - in: query
 *         name: q
 *         schema: { type: string, example: "vinh ha long" }
 *       - in: query
 *         name: destination
 *         schema: { type: string, example: "ha noi" }
 *       - in: query
 *         name: from
 *         schema: { type: string, example: "2025-12-01" }
 *       - in: query
 *         name: to
 *         schema: { type: string, example: "2025-12-31" }
 *       - in: query
 *         name: budgetMin
 *         schema: { type: number, example: 100 }
 *       - in: query
 *         name: budgetMax
 *         schema: { type: number, example: 500 }
 *       - in: query
 *         name: page
 *         schema: { type: integer, example: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, example: 10 }
 *     responses:
 *       200: { description: OK }
 */
router.get("/search", searchTours);

/**
 * @openapi
 * /api/tours:
 *   get:
 *     tags: [Tours]
 *     summary: Danh sách tour (phân trang & lọc)
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: destination
 *         schema: { type: string }
 *       - in: query
 *         name: title
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 total: { type: integer, example: 42 }
 *                 page: { type: integer, example: 1 }
 *                 limit: { type: integer, example: 10 }
 *                 data:
 *                   type: array
 *                   items: { $ref: "#/components/schemas/Tour" }
 */
router.get("/", getTours);

/**
 * @openapi
 * /api/tours/{id}:
 *   get:
 *     tags: [Tours]
 *     summary: Chi tiết tour
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Tour" }
 *       404:
 *         description: Tour not found
 */
router.get("/:id", getTourById);

/**
 * @openapi
 * /api/tours:
 *   post:
 *     tags: [Tours]
 *     summary: Tạo tour (Admin)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TourCreateInput" }
 *     responses:
 *       201:
 *         description: Created
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Tour" }
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.post("/", auth, adminOnly, createTour);

/**
 * @openapi
 * /api/tours/{id}:
 *   put:
 *     tags: [Tours]
 *     summary: Cập nhật tour (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema: { $ref: "#/components/schemas/TourCreateInput" }
 *     responses:
 *       200:
 *         description: OK
 *         content:
 *           application/json:
 *             schema: { $ref: "#/components/schemas/Tour" }
 *       404:
 *         description: Tour not found
 */
router.put("/:id", auth, adminOnly, updateTour);

/**
 * @openapi
 * /api/tours/{id}:
 *   delete:
 *     tags: [Tours]
 *     summary: Xoá tour (Admin)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: Tour deleted
 *       404:
 *         description: Tour not found
 */
router.delete("/:id", auth, adminOnly, deleteTour);


export default router;
