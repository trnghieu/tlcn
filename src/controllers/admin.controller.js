import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Admin } from "../models/Admin.js";

export const adminLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    const find = identifier.includes("@")
      ? { email: identifier.toLowerCase() }
      : { username: identifier };

    // Với Mongoose: chỉ cần { email }
    const admin = await Admin.findOne(find);

    if (!admin) return res.status(404).json({ message: "Admin not found" });

    const ok = await bcrypt.compare(password, admin.password);
    if (!ok) return res.status(400).json({ message: "Wrong password" });

    // _id thay cho adminId
    const token = jwt.sign(
      { id: String(admin._id), type: "admin" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
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
