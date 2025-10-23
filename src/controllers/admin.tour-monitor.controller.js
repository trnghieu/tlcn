import mongoose from "mongoose";
import { Tour } from "../models/Tour.js";
import { Expense } from "../models/Expense.js";

// A) Liệt kê tour đang diễn ra (đang chạy/trong ngày)
export const listOngoingTours = async (req, res) => {
  const now = new Date();
  const onlyToday = String(req.query.onlyToday || "0") === "1";

  const filter = { status: { $in: ["confirmed", "in_progress"] } };
  if (onlyToday) {
    filter.startDate = { $lte: now };
    filter.endDate   = { $gte: now };
  }

  const data = await Tour.find(filter)
    .select("title destination startDate endDate status leader current_guests min_guests max_guests departedAt arrivedAt finishedAt")
    .sort({ startDate: 1 })
    .lean();

  res.json({ total: data.length, data });
};

// B) Cập nhật leader
export const updateLeader = async (req, res) => {
  const { id } = req.params;
  const { fullName, phoneNumber, note } = req.body;
  if (!fullName || !phoneNumber) {
    return res.status(400).json({ message: "fullName & phoneNumber are required" });
  }
  const tour = await Tour.findByIdAndUpdate(
    id,
    { $set: { leader: { fullName, phoneNumber, note: note || "" } } },
    { new: true }
  );
  if (!tour) return res.status(404).json({ message: "Tour not found" });
  res.json({ message: "Leader updated", tour });
};

// C) Thêm sự kiện timeline (khởi hành, đến nơi, checkpoint, ghi chú, kết thúc)
export const addTimelineEvent = async (req, res) => {
  const { id } = req.params;
  const { eventType, at, place, note } = req.body;

  if (!["departed", "arrived", "checkpoint", "note", "finished"].includes(eventType)) {
    return res.status(400).json({ message: "Invalid eventType" });
  }

  const event = {
    eventType,
    at: at ? new Date(at) : new Date(),
    place: place || "",
    note: note || "",
    createdBy: req.user.id
  };

  const update = { $push: { timeline: event } };
  if (eventType === "departed") {
    update.$set = { ...(update.$set||{}), departedAt: event.at, status: "in_progress" };
  }
  if (eventType === "arrived") {
    update.$set = { ...(update.$set||{}), arrivedAt: event.at };
  }
  if (eventType === "finished") {
    update.$set = { ...(update.$set||{}), finishedAt: event.at, status: "completed" };
  }

  const tour = await Tour.findByIdAndUpdate(id, update, { new: true });
  if (!tour) return res.status(404).json({ message: "Tour not found" });

  res.json({ message: "Timeline updated", tour });
};

// D) Expenses CRUD (Admin)
export const createExpense = async (req, res) => {
  const { id } = req.params; // tourId
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid tourId" });

  const { title, amount, occurredAt, note, visibleToCustomers = true } = req.body;
  if (!title || !Number.isFinite(Number(amount))) {
    return res.status(400).json({ message: "title & amount are required" });
  }

  const expense = await Expense.create({
    tourId: id,
    title,
    amount: Number(amount),
    occurredAt: occurredAt ? new Date(occurredAt) : new Date(),
    note: note || "",
    visibleToCustomers: Boolean(visibleToCustomers),
    createdBy: req.user.id
  });

  res.status(201).json({ message: "Expense created", expense });
};

export const listExpensesAdmin = async (req, res) => {
  const { id } = req.params; // tourId
  if (!mongoose.isValidObjectId(id)) return res.status(400).json({ message: "Invalid tourId" });

  const items = await Expense.find({ tourId: id }).sort({ occurredAt: 1, _id: 1 }).lean();
  const total = items.reduce((s, e) => s + (e.amount || 0), 0);
  res.json({ total, count: items.length, items });
};

export const updateExpense = async (req, res) => {
  const { expenseId } = req.params;
  if (!mongoose.isValidObjectId(expenseId)) return res.status(400).json({ message: "Invalid expenseId" });

  const e = await Expense.findByIdAndUpdate(expenseId, req.body, { new: true });
  if (!e) return res.status(404).json({ message: "Expense not found" });
  res.json({ message: "Expense updated", expense: e });
};

export const deleteExpense = async (req, res) => {
  const { expenseId } = req.params;
  if (!mongoose.isValidObjectId(expenseId)) return res.status(400).json({ message: "Invalid expenseId" });

  const e = await Expense.findByIdAndDelete(expenseId);
  if (!e) return res.status(404).json({ message: "Expense not found" });
  res.json({ message: "Expense deleted" });
};
