import { Op } from "sequelize";
import bcrypt from "bcryptjs";
import { User } from "../models/User.js";

/**
 * GET /api/users/me
 * Lấy thông tin hồ sơ của chính mình (từ JWT)
 */
export const getMyProfile = async (req, res) => {
  try {
    const me = await User.findByPk(req.user.id, {
      attributes: { exclude: ["password"] }
    });
    if (!me) return res.status(404).json({ message: "User not found" });
    res.json(me);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const updateMyProfile = async (req, res) => {
  try {
    const { fullName, phoneNumber, address, avatar, username } = req.body;

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (username && username !== user.username) {
      const exist = await User.findOne({
        where: { username, userId: { [Op.ne]: user.userId } }
      });
      if (exist) return res.status(400).json({ message: "Username already taken" });
      user.username = username;
    }

    if (fullName !== undefined) user.fullName = fullName;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (address !== undefined) user.address = address;
    if (avatar !== undefined) user.avatar = avatar;

    await user.save();

    const safe = user.toJSON();
    delete safe.password;
    res.json({ message: "Profile updated", user: safe });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    if (!oldPassword || !newPassword)
      return res.status(400).json({ message: "oldPassword and newPassword are required" });

    const user = await User.findByPk(req.user.id);
    if (!user) return res.status(404).json({ message: "User not found" });

    if (!user.password)
      return res.status(400).json({ message: "This account uses Google Login; set password via reset email" });

    const ok = await bcrypt.compare(oldPassword, user.password);
    if (!ok) return res.status(400).json({ message: "Old password is incorrect" });

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.json({ message: "Password changed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
