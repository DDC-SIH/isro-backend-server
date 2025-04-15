import cookieParser from "cookie-parser";
import express, { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";
import {
  convertFromTimestamp,
  convertToTimestamp,
  logRequest,
} from "./lib/utils";
import metadataRoutes from "./routes/metadata";
import authRoutes from "./routes/auth";
import usersRoutes from "./routes/users";
import satelliteRouter from "./routes/satellite";
import { swaggerSpec } from "./swagger"; // path to your swagger.ts
import swaggerUi from "swagger-ui-express";

import { config } from "dotenv";

// load env variables
config();

// mongo uri
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/trinetra";
console.log(convertFromTimestamp(1742607900000));
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Db connected to " + MONGO_URI);
  })
  .catch((err) => console.error("mongodb connection error: ", err));

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 7000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(logRequest);

// app.use(express.static(path.join(__dirname,"../../frontend/dist")))

app.get("/api/test", (req: Request, res: Response) => {
  res.json({ status: 200, message: "working" });
});

// routes
app.use("/api/metadata", metadataRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/users", usersRoutes);
app.use("/api/satellite", satelliteRouter);
app.use("/api/docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// app.get("*", (req:Request, res:Response)=>{
//     res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"))
// })

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
