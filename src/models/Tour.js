import mongoose from "mongoose";

function slugify(str = "") {
  return str
    .normalize("NFD")                 // tách dấu
    .replace(/[\u0300-\u036f]/g, "")  // bỏ dấu
    .toLowerCase()
    .replace(/\s+/g, " ")             // gộp khoảng trắng
    .trim();
}

const tourSchema = new mongoose.Schema({
  title: { type: String, required: true },
  time: String,
  description: String,
  quantity: Number,
  priceAdult: Number,
  priceChild: Number,
  destination: String,
  destinationSlug: String,   
  adminId: { type: mongoose.Schema.Types.ObjectId, ref: "Admin" },
  startDate: Date,
  endDate: Date,
}, { timestamps: false });

tourSchema.pre("save", function(next) {
  if (this.isModified("destination") || !this.destinationSlug) {
    this.destinationSlug = slugify(this.destination || "");
  }
  next();
});

tourSchema.index({ destinationSlug: 1 });          // cho autocomplete prefix
tourSchema.index({ startDate: 1, endDate: 1 });    // lọc theo ngày
tourSchema.index({ priceAdult: 1, priceChild: 1 }); // lọc theo ngân sách
tourSchema.index({ title: "text", description: "text", destination: "text" });
export const Tour = mongoose.model("Tour", tourSchema, "tbl_tours");
