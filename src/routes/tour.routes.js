import { Router } from "express";
import {
  getTours,
  getTourById,
  createTour,
  updateTour,
  deleteTour
} from "../controllers/tour.controller.js";
import { auth, adminOnly} from "../middleware/auth.js";

const router = Router();

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
 *         schema: { type: integer }
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
 *         schema: { type: integer }
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
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Tour deleted
 *       404:
 *         description: Tour not found
 */
router.delete("/:id", auth, adminOnly, deleteTour);

export default router;
