import cookieParser from "cookie-parser";
import express, { Request, Response } from "express";
import mongoose from "mongoose";
import cors from "cors";
import path from "path";

// routes

// mongo uri
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/trinetra";
mongoose
  .connect(MONGO_URI)
  .then(async () => {
    console.log("Db connected");

    // const db = mongoose.connection.db
    // await db.createCollection("users").catch(()=>{})
  })
  .catch((err) => console.error("mongodb connection error: ", err));

const app = express();
app.use(cookieParser());

const PORT = process.env.PORT || 7000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());

// app.use(express.static(path.join(__dirname,"../../frontend/dist")))

// routes
app.get("/api/test", (req: Request, res: Response) => {
  res.json({ status: 200, message: "working" });
});

// app.use("/api/auth", authRoutes)

// app.get("*", (req:Request, res:Response)=>{
//     res.sendFile(path.join(__dirname, "../../frontend/dist/index.html"))
// })

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
