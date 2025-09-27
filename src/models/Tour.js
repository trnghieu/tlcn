import { DataTypes } from "sequelize";
import { sequelize } from "../config/db.js";

export const Tour = sequelize.define("tbl_tours", {
  tourId: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  title: { type: DataTypes.STRING, allowNull: false },
  time: DataTypes.STRING,
  description: DataTypes.TEXT,
  quantity: DataTypes.INTEGER,
  priceAdult: DataTypes.DOUBLE,
  priceChild: DataTypes.DOUBLE,
  destination: DataTypes.STRING,
  adminId: DataTypes.INTEGER,
  startDate: DataTypes.DATE,
  endDate: DataTypes.DATE,
}, {
  timestamps: false
});
