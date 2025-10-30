import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Leader } from "../models/Leader.js";

export const leaderLogin = async (req,res)=>{
  const { identifier, password } = req.body;
  const find = identifier.includes("@") ? { email: identifier } : { username: identifier };
  const leader = await Leader.findOne(find);
  if (!leader) return res.status(404).json({ message:"Leader not found" });
  if (leader.status !== "active") return res.status(403).json({ message:"Leader inactive" });

  const ok = await bcrypt.compare(password, leader.password);
  if (!ok) return res.status(400).json({ message:"Wrong password" });

  const token = jwt.sign({ id: String(leader._id), role:"leader" }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES || "7d" });
  res.cookie("token", token, { httpOnly:true, sameSite:"lax" });
  res.json({ message:"Login success", token });
};

export const LeaderLogout = (req, res) => {
  res.clearCookie("token");
  res.json({ message: "Logged out" });
};