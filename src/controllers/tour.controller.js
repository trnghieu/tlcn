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

export const suggestDestinations = async (req, res) => {
  try {
    const term = (req.query.term || "").trim();
    const limit = Math.min(parseInt(req.query.limit || "8", 10), 20);
    if (!term) return res.json([]);

    // chuẩn hóa term
    const slug = term
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .toLowerCase().replace(/\s+/g, " ").trim();

    // match prefix bằng regex ^slug
    const regex = new RegExp("^" + slug.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));

    // Lấy distinct theo destination + đếm mức độ phổ biến
    const rows = await Tour.aggregate([
      { $match: { destinationSlug: { $regex: regex } } },
      { $group: { _id: "$destination", cnt: { $sum: 1 } } },
      { $sort: { cnt: -1, _id: 1 } },
      { $limit: limit }
    ]);

    // Trả mảng tên địa điểm
    res.json(rows.map(r => r._id).filter(Boolean));
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const searchTours = async (req, res) => {
  try {
    const {
      q,                      // keyword (tự do)
      destination,            // text người dùng chọn/nhập
      from,                   // YYYY-MM-DD
      to,                     // YYYY-MM-DD
      budgetMin,              // số tiền (USD/VND tùy theo hệ)
      budgetMax,
      page = 1,
      limit = 10
    } = req.query;

    const filter = {};

    // keyword: dùng $text nếu muốn; nếu chưa build text index, fallback regex
    if (q && q.trim()) {
      filter.$or = [
        { title: { $regex: q.trim(), $options: "i" } },
        { description: { $regex: q.trim(), $options: "i" } },
        { destination: { $regex: q.trim(), $options: "i" } }
      ];
      // Nếu bạn đã bật text index, có thể dùng:
      // filter.$text = { $search: q.trim() };
    }

    // destination: chuẩn hóa rồi so sánh slug prefix hoặc exact (tùy UX)
    if (destination && destination.trim()) {
      const destSlug = destination
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/\s+/g, " ").trim();

      // prefix match để nới lỏng
      filter.destinationSlug = slugOf(destination);
      function slugOf(s=""){
        return s.normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim();
      }
    }

    // date range (tour chạy trong khoảng từ-to)
    if (from || to) {
      filter.startDate = filter.startDate || {};
      filter.endDate = filter.endDate || {};

      if (from) filter.startDate.$gte = new Date(from);
      if (to)   filter.endDate.$lte   = new Date(to);
    }

    // ngân sách: so theo priceAdult (có thể cộng thêm logic priceChild)
    const min = budgetMin ? Number(budgetMin) : undefined;
    const max = budgetMax ? Number(budgetMax) : undefined;
    if (Number.isFinite(min) || Number.isFinite(max)) {
      filter.priceAdult = {};
      if (Number.isFinite(min)) filter.priceAdult.$gte = min;
      if (Number.isFinite(max)) filter.priceAdult.$lte = max;
    }

    const p = Math.max(parseInt(page, 10) || 1, 1);
    const l = Math.min(parseInt(limit, 10) || 10, 50);

    const [data, total] = await Promise.all([
      Tour.find(filter).sort({ startDate: 1, _id: 1 }).skip((p - 1) * l).limit(l).lean(),
      Tour.countDocuments(filter)
    ]);

    res.json({ total, page: p, limit: l, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};