import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const User = sequelize.define("tbl_users", {
  userId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  google_id: { type: DataTypes.STRING, allowNull: true },
  fullName: DataTypes.STRING,
  username: { type: DataTypes.STRING, unique: true },
  email:    { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING, allowNull: true },
  avatar:   DataTypes.STRING,
  phoneNumber: DataTypes.STRING,
  address:  DataTypes.STRING,
  isActive: { type: DataTypes.ENUM("y","n"), defaultValue:"y" },
  status:   { type: DataTypes.ENUM("y","n"), defaultValue:"y" }
}, { timestamps: false });
