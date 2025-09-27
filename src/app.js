import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import session from "express-session";

import authRouter from "./routes/auth.routes.js";
import tourRouter from "./routes/tour.routes.js";
import adminRouter from "./routes/admin.routes.js";
import passport from "./config/passport.js";

import swaggerUi from "swagger-ui-express";
import { swaggerSpec } from "./config/swagger.js";

const app = express();

// Middleware chung
app.use(cors({ origin: "http://localhost:3000", credentials: true }));
app.use(express.json());
app.use(cookieParser());

app.use(session({
  secret: process.env.JWT_SECRET || "keyboard cat",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, sameSite: "lax" } // dev HTTP
}));

app.use(passport.initialize());
app.use(passport.session());

// Route chính
app.use("/api/auth", authRouter);
app.use("/api/tours", tourRouter);
app.use("/api/admin", adminRouter);

app.use("/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// 404 fallback
app.use((req, res) => res.status(404).json({ message: "Not Found" }));



export default app;
