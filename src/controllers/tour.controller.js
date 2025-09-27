import { Tour } from "../models/Tour.js";
import { Op } from "sequelize";

// Lấy danh sách tour (có phân trang + search)
export const getTours = async (req, res) => {
  try {
    const { page = 1, limit = 10, destination, title } = req.query;

    const where = {};
    if (destination) where.destination = destination;
    if (title) where.title = { [Op.like]: `%${title}%` };

    const { count, rows } = await Tour.findAndCountAll({
      where,
      offset: (page - 1) * limit,
      limit: +limit,
      order: [["tourId", "DESC"]],
    });

    res.json({
      total: count,
      page: +page,
      limit: +limit,
      data: rows,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Lấy chi tiết tour
export const getTourById = async (req, res) => {
  try {
    const tour = await Tour.findByPk(req.params.id);
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Tạo tour mới (admin)
export const createTour = async (req, res) => {
  try {
    const tour = await Tour.create(req.body);
    res.status(201).json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Cập nhật tour (admin)
export const updateTour = async (req, res) => {
  try {
    const tour = await Tour.findByPk(req.params.id);
    if (!tour) return res.status(404).json({ message: "Tour not found" });

    await tour.update(req.body);
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Xóa tour (admin)
export const deleteTour = async (req, res) => {
  try {
    const tour = await Tour.findByPk(req.params.id);
    if (!tour) return res.status(404).json({ message: "Tour not found" });

    await tour.destroy();
    res.json({ message: "Tour deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
