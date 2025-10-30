// src/controllers/admin.controller.js
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";

import { Admin } from "../models/Admin.js";
import { Leader } from "../models/Leader.js";      // ⬅️ dùng khi gán leaderId
import { Tour } from "../models/Tour.js";
import { Expense } from "../models/Expense.js";

/* ===========================
 *  AUTH: ADMIN LOGIN (JWT)
 * =========================== */
export const adminLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body || {};
    if (!identifier || !password) {
      return res.status(400).json({ message: "identifier & password are required" });
    }

    const find = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { username: identifier };

    const admin = await Admin.findOne(find);
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const ok = await bcrypt.compare(password, admin.password || "");
    if (!ok) return res.status(400).json({ message: "Wrong password" });

    // ⬅️ THỐNG NHẤT: payload dùng role = "admin"
    const token = jwt.sign(
      { id: String(admin._id), role: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES || "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production"
    });

    res.json({
      message: "Admin login success",
      token,
      admin: {
        id: String(admin._id),
        fullName: admin.fullName,
        email: admin.email,
        username: admin.username,
      },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ====================================
 *  A) DANH SÁCH TOUR ĐANG DIỄN RA
 * ==================================== */
export const listOngoingTours = async (req, res) => {
  try {
    const now = new Date();
    const onlyToday = String(req.query.onlyToday || "0") === "1";

    const filter = { status: { $in: ["confirmed", "in_progress"] } };
    if (onlyToday) {
      filter.startDate = { $lte: now };
      filter.endDate   = { $gte: now };
    }

    const data = await Tour.find(filter)
      .select("title destination startDate endDate status leader leaderId current_guests min_guests max_guests departedAt arrivedAt finishedAt")
      .sort({ startDate: 1 })
      .lean();

    res.json({ total: data.length, data });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ====================================
 *  B) GÁN/CẬP NHẬT LEADER CHO TOUR
 *  - Cho phép gán leaderId (tham chiếu Leader)
 *  - Đồng thời snapshot leader(fullName, phoneNumber, note)
 * ==================================== */
export const updateLeader = async (req, res) => {
  try {
    const { id } = req.params;                   // tourId
    const { leaderId, fullName, phoneNumber, note } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tourId" });
    }

    const update = {};

    // Nếu truyền leaderId -> tìm Leader và gán
    if (leaderId) {
      if (!mongoose.isValidObjectId(leaderId)) {
        return res.status(400).json({ message: "Invalid leaderId" });
      }
      const leader = await Leader.findById(leaderId);
      if (!leader) return res.status(404).json({ message: "Leader not found" });

      update.leaderId = leader._id;
      // snapshot thông tin hiện tại vào embed leader
      update.leader = {
        fullName: leader.fullName,
        phoneNumber: leader.phoneNumber || "",
        note: note || ""
      };
    }

    // Nếu muốn cập nhật nhanh embed leader (không đổi leaderId)
    if (!leaderId && (fullName || phoneNumber || note !== undefined)) {
      if (!fullName || !phoneNumber) {
        return res.status(400).json({ message: "fullName & phoneNumber are required when updating leader snapshot" });
      }
      update.leader = { fullName, phoneNumber, note: note || "" };
    }

    if (!Object.keys(update).length) {
      return res.status(400).json({ message: "No changes" });
    }

    const tour = await Tour.findByIdAndUpdate(
      id,
      { $set: update },
      { new: true }
    );
    if (!tour) return res.status(404).json({ message: "Tour not found" });

    res.json({ message: "Leader updated", tour });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ====================================
 *  C) THÊM SỰ KIỆN TIMELINE (ADMIN)
 *  - Đảm bảo createdBy là ObjectId
 *  - Cập nhật trạng thái theo eventType
 * ==================================== */
export const addTimelineEvent = async (req, res) => {
  try {
    const { id } = req.params;                   // tourId
    const { eventType, at, place, note } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tourId" });
    }

    const ALLOWED = ["departed", "arrived", "checkpoint", "note", "finished"];
    if (!ALLOWED.includes(eventType)) {
      return res.status(400).json({ message: "Invalid eventType" });
    }

    const atDate = at ? new Date(at) : new Date();
    if (isNaN(atDate.getTime())) {
      return res.status(400).json({ message: "Invalid 'at' datetime" });
    }

    if (!req.user?.id || !mongoose.isValidObjectId(req.user.id)) {
      return res.status(401).json({ message: "Invalid admin ID" });
    }

    const event = {
      eventType,
      at: atDate,
      place: place || "",
      note: note || "",
      createdBy: new mongoose.Types.ObjectId(req.user.id)
    };

    const update = { $push: { timeline: event } };

    if (eventType === "departed") {
      update.$set = { ...(update.$set || {}), departedAt: atDate, status: "in_progress" };
    }
    if (eventType === "arrived") {
      update.$set = { ...(update.$set || {}), arrivedAt: atDate };
    }
    if (eventType === "finished") {
      update.$set = { ...(update.$set || {}), finishedAt: atDate, status: "completed" };
    }

    const tour = await Tour.findByIdAndUpdate(id, update, { new: true });
    if (!tour) return res.status(404).json({ message: "Tour not found" });

    res.json({ message: "Timeline updated", tour });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

/* ====================================
 *  D) CHI PHÍ PHÁT SINH (CRUD - ADMIN)
 *  - occurredAt = thời gian hiện tại server
 *  - addedBy = admin ObjectId
 *  - chặn sửa occurredAt/addedBy khi update
 * ==================================== */
export const createExpense = async (req, res) => {
  try {
    const { id } = req.params; // tourId
    const { title, amount, note, visibleToCustomers = true } = req.body || {};

    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tourId" });
    }
    if (!title || !Number.isFinite(Number(amount))) {
      return res.status(400).json({ message: "title & amount are required" });
    }
    if (!req.user?.id || !mongoose.isValidObjectId(req.user.id)) {
      return res.status(401).json({ message: "Invalid admin ID" });
    }

    const expense = await Expense.create({
      tourId: new mongoose.Types.ObjectId(id),
      title,
      amount: Number(amount),
      occurredAt: new Date(),                        // ⏱ server time
      note: note || "",
      visibleToCustomers: Boolean(visibleToCustomers),
      addedBy: new mongoose.Types.ObjectId(req.user.id)
    });

    res.status(201).json({ message: "Expense created", expense });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const listExpensesAdmin = async (req, res) => {
  try {
    const { id } = req.params; // tourId
    if (!mongoose.isValidObjectId(id)) {
      return res.status(400).json({ message: "Invalid tourId" });
    }
    const items = await Expense.find({ tourId: id })
      .sort({ occurredAt: 1, _id: 1 })
      .lean();

    const total = items.reduce((s, e) => s + (e.amount || 0), 0);
    res.json({ total, count: items.length, items });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    if (!mongoose.isValidObjectId(expenseId)) {
      return res.status(400).json({ message: "Invalid expenseId" });
    }

    // Không cho phép đổi occurredAt / addedBy
    const body = { ...req.body };
    delete body.occurredAt;
    delete body.addedBy;

    const e = await Expense.findByIdAndUpdate(expenseId, body, { new: true });
    if (!e) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense updated", expense: e });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  try {
    const { expenseId } = req.params;
    if (!mongoose.isValidObjectId(expenseId)) {
      return res.status(400).json({ message: "Invalid expenseId" });
    }

    const e = await Expense.findByIdAndDelete(expenseId);
    if (!e) return res.status(404).json({ message: "Expense not found" });
    res.json({ message: "Expense deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
