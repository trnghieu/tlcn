import { Tour } from "../models/Tour.js";

export const getTours = async (req, res) => {
  const { page = 1, limit = 10, destination, title } = req.query;
  const filter = {};
  if (destination) filter.destination = destination;
  if (title) filter.title = { $regex: title, $options: "i" };

  const [data, total] = await Promise.all([
    Tour.find(filter)
        .sort({ _id: -1 })
        .skip((+page - 1) * +limit)
        .limit(+limit),
    Tour.countDocuments(filter)
  ]);

  res.json({ total, page:+page, limit:+limit, data });
};

export const getTourById = async (req, res) => {
  const tour = await Tour.findById(req.params.id);
  if (!tour) return res.status(404).json({ message: "Tour not found" });
  res.json(tour);
};

export const createTour = async (req, res) => {
  const tour = await Tour.create(req.body);
  res.status(201).json(tour);
};

export const updateTour = async (req, res) => {
  const tour = await Tour.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!tour) return res.status(404).json({ message: "Tour not found" });
  res.json(tour);
};

export const deleteTour = async (req, res) => {
  const ok = await Tour.findByIdAndDelete(req.params.id);
  if (!ok) return res.status(404).json({ message: "Tour not found" });
  res.json({ message: "Tour deleted" });
};
