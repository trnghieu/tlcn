import mongoose from "mongoose";

const tourSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: String,
  description: String,
  quantity: Number,
  priceAdult: Number,
  priceChild: Number,
  destination: String,
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  startDate: Date,
  endDate: Date,
}, { timestamps: false });

export const Tour = mongoose.model("Tour", tourSchema, "tbl_tours");
