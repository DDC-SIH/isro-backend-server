import express, { Request, Response } from "express";
import Satellite from "../models/SatelliteModel";

const satelliteRouter = express.Router();

satelliteRouter.post("/", async (req: Request, res: Response) => {
  const satellite = new Satellite(req.body);
  try {
    await satellite.save();
    res
      .status(201)
      .json({ message: "Satellite created successfully!", satellite });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

satelliteRouter.get("/", async (req: Request, res: Response) => {
  try {
    const satellites = await Satellite.find();
    res
      .status(200)
      .json({ message: "All satellites fetched successfully!", satellites });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

satelliteRouter.get("/:id", async (req: Request, res: Response) => {
  try {
    const satellite = await Satellite.findById(req.params.id);
    if (!satellite)
      return res.status(404).json({ error: "Satellite not found!" });
    res
      .status(200)
      .json({ message: "Satellite fetched successfully!", satellite });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

export default satelliteRouter;
