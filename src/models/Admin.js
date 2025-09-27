import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Admin = sequelize.define("tbl_admin", {
  adminId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  fullName: DataTypes.STRING,
  username: { type: DataTypes.STRING, unique: true },
  password: { type: DataTypes.STRING, allowNull: false },
  email:    { type: DataTypes.STRING, unique: true },
  address:  DataTypes.STRING,
  createdDate: DataTypes.DATE
}, { tableName: "tbl_admin", freezeTableName: true, timestamps: false });


