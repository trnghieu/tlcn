import bcrypt from "bcryptjs";
import { User } from "../models/User.js";
import fs from "node:fs";
import path from "node:path";

export const getMyProfile = async (req, res) => {
  try {
    const me = await User.findById(req.user.id).select("-password").lean();
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, avatar, username } = req.body;

    if (
      fullName === undefined &&
      phoneNumber === undefined &&
      address === undefined &&
      avatar === undefined &&
      username === undefined
    ) {
      return res.status(400).json({ message: "No fields to update" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username && username !== user.username) {
      // có thể thêm regex chặn ký tự lạ
      const exist = await User.findOne({ username });
      if (exist) return res.status(400).json({ message: "Username already taken" });
      user.username = username;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    const safe = user.toObject();
    delete safe.password;
    res.json({ message: "Profile updated", user: safe });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword) {
      return res.status(400).json({ message: "oldPassword and newPassword are required" });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password) {
      return res.status(400).json({ message: "This account uses Google Login" });
    }

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

function baseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/+$/,"");
  const proto = (req.headers["x-forwarded-proto"] || req.protocol || "http");
  const host  = req.headers["x-forwarded-host"]  || req.get("host");
  return `${proto}://${host}`;
}

export const uploadMyAvatar = async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ message: "No file uploaded" });

    const me = await User.findById(req.user.id);
    if (!me) return res.status(404).json({ message: "User not found" });

    // (tuỳ chọn) xoá file avatar cũ nếu nằm ở /uploads/avatars
    if (me.avatar?.startsWith("/uploads/avatars/")) {
      const p = path.resolve("." + me.avatar);
      fs.existsSync(p) && fs.unlink(p, () => {});
    }

    const urlPath = `/uploads/avatars/${req.file.filename}`;       // path public
    me.avatar = urlPath;                                           // lưu path (FE tự prepend domain)
    await me.save();

    const safe = me.toObject();
    delete safe.password;

    res.json({
      message: "Avatar updated",
      avatarPath: urlPath,
      avatarUrl: `${baseUrl(req)}${urlPath}`,  // tiện cho FE test
      user: safe
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};