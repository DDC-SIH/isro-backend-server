import express, { Request, Response } from "express";
import { check, validationResult } from "express-validator";
import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import User from "../models/UserModel";
import verifyToken from "../middleware/auth";

const usersRouter = express.Router();

usersRouter.post("/register", async (req: Request, res: Response) => {
  try {
    const existingUser = await User.findOne({ email: req.body.email });
    if (existingUser) {
      return res
        .status(400)
        .json({ message: "User with provided email already exists" });
    }
    const hashedPassword = await bcrypt.hash(req.body.password, 8);

    const user = new User({ ...req.body, password: hashedPassword });
    user.save();
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET_KEY as string,
      { expiresIn: "1d" }
    );
    res.cookie("auth_token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 86400,
    });
    res
      .status(200)
      .json({ message: "User registered successfully", userId: user._id });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

usersRouter.get("/me", verifyToken, async (req: Request, res: Response) => {
  try {
    const user = User.findById(req.userId);
    if (!user) {
      return res.status(400).json("User Not Found");
    }

    res.json(user);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

export default usersRouter;
