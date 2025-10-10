import mongoose from "mongoose";

function slugify(str = "") {
  return str
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .toLowerCase().replace(/\s+/g, " ").trim();
}

const segmentSchema = new mongoose.Schema({
  timeOfDay: { type: String, enum: ["morning", "afternoon", "evening"], required: true },
  title:     { type: String, required: true },
  items:     { type: [String], default: [] }
}, { _id: false });

const daySchema = new mongoose.Schema({
  day:     { type: Number, required: true, min: 1 },
  title:   { type: String, required: true },
  summary: { type: String, default: "" },
  segments:{ type: [segmentSchema], default: [] },
  photos:  { type: [String], default: [] } // ảnh theo ngày (nếu muốn)
}, { _id: false });

const tourSchema = new mongoose.Schema({
  title:        { type: String, required: true },
  time:         { type: String },
  description:  { type: String },
  quantity:     { type: Number },
  priceAdult:   { type: Number },
  priceChild:   { type: Number },
  destination:  { type: String },
  destinationSlug: { type: String, index: true },
  adminId:      { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  startDate:    { type: Date },
  endDate:      { type: Date },

  // 👇 NEW
  images:     { type: [String], default: [] }, // ảnh tổng quan tour (yêu cầu 5 ảnh)
  itinerary:  { type: [daySchema], default: [] }
}, { timestamps: false });

// Tự tạo slug khi save
tourSchema.pre("save", function(next) {
  if (this.isModified("destination") || !this.destinationSlug) {
    this.destinationSlug = slugify(this.destination || "");
  }
  next();
});

// Tự tạo slug khi update qua findOneAndUpdate
tourSchema.pre("findOneAndUpdate", function(next) {
  const update = this.getUpdate() || {};
  if (update.destination) {
    update.destinationSlug = slugify(update.destination);
    this.setUpdate(update);
  }
  next();
});

tourSchema.index({ startDate: 1, endDate: 1 });
tourSchema.index({ priceAdult: 1, priceChild: 1 });
tourSchema.index({ title: "text", description: "text", destination: "text" });

export const Tour = mongoose.model("Tour", tourSchema, "tbl_tours");
