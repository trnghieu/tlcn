import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../models/User.js";
import crypto from "crypto";
import { sendMail } from "../services/mailer.js";
import { Op } from "sequelize";

export const register = async (req,res)=>{
  try {
    const { fullName, username,phoneNumber, email, password } = req.body;

    if (!username || !email || !password)
      return res.status(400).json({ message: "username, email, password are required" });

    const exist = await User.findOne({
      where: { [Op.or]: [{ email }, { username }] }
    });
    if (exist) {
      const field = exist.email === email ? "email" : "username";
      return res.status(400).json({ message: `${field} already exists` });
    }

    const hash = await bcrypt.hash(password,10);
    const user = await User.create({ fullName, username,phoneNumber, email, password: hash });
    res.status(201).json({ message:"Registered", user });
  } catch(err){
    res.status(500).json({ message: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password)
      return res.status(400).json({ message: "identifier and password are required" });

    // nếu có '@' thì coi là email, ngược lại là username
    const where = identifier.includes("@")
      ? { email: identifier }
      : { username: identifier };

    const user = await User.findOne({ where });
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) return res.status(400).json({ message: "This account uses Google Login" });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(400).json({ message: "Wrong password" });

    const token = jwt.sign(
      { id: user.userId, type: "user" },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES }
    );

    res.cookie("token", token, { httpOnly: true, sameSite: "lax" });
    res.json({ message: "Login success", token });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};


export const resetPassword = async (req,res)=>{
  try {
    const { email } = req.body;
    const user = await User.findOne({ where: { email } });
    if(!user) return res.status(404).json({ message:"Email not found" });

    const newPass = crypto.randomBytes(4).toString("hex");
    user.password = await bcrypt.hash(newPass,10);
    await user.save();

    await sendMail({
      to: email,
      subject: "Reset password",
      html: `<p>Your new password: <b>${newPass}</b></p>`
    });

    res.json({ message:"New password sent to email" });
  } catch(err){
    res.status(500).json({ message: err.message });
  }
};

export const logout = (req,res)=>{
  res.clearCookie("token");
  res.json({ message:"Logged out" });
};