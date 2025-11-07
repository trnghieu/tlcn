import { Router } from "express";
import { auth } from "../middleware/auth.js";
import {
  createReview,
  getReviewsOfTour,
  myReviews,
} from "../controllers/review.controller.js";

const router = Router();

/**
 * @openapi
 * /api/reviews:
 *   post:
 *     tags: [Reviews]
 *     summary: Tạo/sửa đánh giá tour (chỉ user đã hoàn thành tour)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [tourId, rating]
 *             properties:
 *               tourId:
 *                 type: string
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Review saved
 */
router.post("/", auth, createReview);

/**
 * @openapi
 * /api/reviews/tour/{tourId}:
 *   get:
 *     tags: [Reviews]
 *     summary: Danh sách review của 1 tour + rating trung bình
 *     parameters:
 *       - in: path
 *         name: tourId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/tour/:tourId", getReviewsOfTour);

/**
 * @openapi
 * /api/reviews/me:
 *   get:
 *     tags: [Reviews]
 *     summary: Review của chính tôi
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: OK
 */
router.get("/me", auth, myReviews);

export default router;
