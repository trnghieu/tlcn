import { Tour } from "../models/Tour.js";

export const getTours = async (req, res) => {
  const { page=1, limit=10, destination, title } = req.query;
  const filter = {};
  if (destination) filter.destinationSlug = new RegExp("^" + destination
    .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g," ").trim().replace(/[.*+?^${}()|[\]\\]/g,"\\$&"));
  if (title) filter.title = { $regex: title, $options: "i" };

  const p = Math.max(parseInt(page,10)||1, 1);
  const l = Math.min(parseInt(limit,10)||10, 50);

  const [data, total] = await Promise.all([
    Tour.find(filter).sort({ startDate: 1, _id: 1 }).skip((p-1)*l).limit(l).lean(),
    Tour.countDocuments(filter)
  ]);

  res.json({ total, page:p, limit:l, data });
};

export const getTourById = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid tour id" });
  const tour = await Tour.findById(id).lean();
  if (!tour) return res.status(404).json({ message: "Tour not found" });
  res.json(tour);
};

export const createTour = async (req, res) => {
  try {
    const body = req.body;

    // Bảo đảm images có 5 ảnh (tự bổ sung nếu thiếu)
    if (!Array.isArray(body.images)) body.images = [];
    if (body.images.length < 5) {
      const base = (body.destination||"tour").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-");
      while (body.images.length < 5) {
        body.images.push(`/images/${base}/${body.images.length+1}.jpg`);
      }
    }

    // Itinerary: cho phép theo đúng structure client gửi (đã validate ở routes nếu có)
    const tour = await Tour.create(body);
    res.status(201).json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateTour = async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid tour id" });

    const update = { ...req.body };

    // Nếu client gửi images < 5, tự fill đủ 5
    if (Array.isArray(update.images) && update.images.length < 5) {
      const base = (update.destination || update.destinationSlug || "tour").toString()
        .normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().replace(/\s+/g,"-");
      while (update.images.length < 5) {
        update.images.push(`/images/${base}/${update.images.length+1}.jpg`);
      }
    }

    const tour = await Tour.findByIdAndUpdate(id, update, { new: true, runValidators: true });
    if (!tour) return res.status(404).json({ message: "Tour not found" });
    res.json(tour);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteTour = async (req, res) => {
  const { id } = req.params;
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid tour id" });
  const ok = await Tour.findByIdAndDelete(id);
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