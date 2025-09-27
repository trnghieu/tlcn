import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";

export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;
    const admin = await Admin.findOne({ where: { email } });
    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: admin.adminId, type: "admin" },  // 👈 đánh dấu là admin
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Admin login success", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
