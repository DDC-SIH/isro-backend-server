import express, { Request, Response } from "express";
import Product from "../models/ProductModel";
import COG from "../models/CogModel";
import ProductModel from "../models/ProductModel";
import CogModel from "../models/CogModel";
import { DEFAULT_FRAME_COUNT, VALID_FRAME_COUNTS } from "../consts";
import SatelliteModel, { SatelliteType } from "../models/SatelliteModel";
import {
  convertFromTimestamp,
  convertToTimestamp,
  writeJsonToFile,
} from "../lib/utils";
import path from "path";

const metadataRouter = express.Router();

metadataRouter.post("/test-add", async (req: Request, res: Response) => {
  try {
    const product = new Product(req.body);
    product.save();
    res.status(200).send("test add successful");
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.post("/save", async (req: Request, res: Response) => {
  try {
    const {
      productId,
      name,
      description,
      satellite,
      aquisition_datetime,
      processingLevel,
      version,
      revision,
      filename,
      filepath,
      coverage,
      coordinateSystem,
      size,
      cornerCoords,
      bands,
    } = req.body;
    try {
      const data: any = {};

      // Parse the request body
      Object.keys(req.body).forEach((key) => {
        data[key] = req.body[key];
      });

      // Save the data to a file
      writeJsonToFile(path.join(__dirname, "data.json"), data).catch((err) =>
        console.error(err)
      );
    } catch (error) {
      console.error(error);
    }

    const sat = await SatelliteModel.findOne({ satelliteId: satellite });
    if (!sat) {
      return res.status(400).json({ message: "Satellite is not defined yet." });
    }
    const timestamp = convertToTimestamp(aquisition_datetime);
    console.log("Timestamp: ", timestamp);
    console.log("Verifying Timestmap: ", convertFromTimestamp(timestamp));
    const newProduct = new Product({
      productId,
      name,
      description,
      satellite: sat._id,
      processingLevel,
      version,
      revision,
      aquisition_datetime: timestamp,
    });
    await newProduct.save();

    const newCog = new COG({
      filename,
      filepath,
      coverage,
      coordinateSystem,
      size,
      cornerCoords,
      bands,
      processingLevel,
      version,
      revision,
      product: newProduct._id,
      aquisition_datetime: timestamp,
    });
    await newCog.save();

    res.status(200).send({
      message: "metadata saved successful",
      product: newProduct,
      cog: newCog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/all", async (req: Request, res: Response) => {
  try {
    const productList = await ProductModel.find();
    const cogList = await CogModel.find();

    res.status(200).json({
      message: "Retrieved Data Successfully",
      products: productList,
      cogs: cogList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/product/all", async (req: Request, res: Response) => {
  try {
    const productList = await ProductModel.find();

    res.status(200).json({
      message: "Retrieved Data Successfully",
      products: productList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/cog/all", async (req: Request, res: Response) => {
  try {
    const cogList = await CogModel.find();

    res.status(200).json({
      message: "Retrieved Data Successfully",
      cogs: cogList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/product/info/:id", async (req: Request, res: Response) => {
  try {
    const product = await ProductModel.findById(req.params.id);

    res.status(200).json(product);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/cog/info/:id", async (req: Request, res: Response) => {
  try {
    const cog = await CogModel.findById(req.params.id);

    res.status(200).json(cog);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/product/range", async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "start and end time required" });
    }

    const startTimestamp = new Date(start as string).getTime();
    const endTimestamp = new Date(end as string).getTime();
    console.log({ startTimestamp, endTimestamp });
    const products = await ProductModel.find({
      aquisition_datetime: { $gte: startTimestamp, $lte: endTimestamp },
    });
    res.status(200).json(products);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/cog/range", async (req: Request, res: Response) => {
  try {
    const { start, end } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "start adn end time required" });
    }

    const startDate = new Date(start as string).getTime();
    const endDate = new Date(end as string).getTime();

    const cogs = await CogModel.find({
      aquisition_datetime: { $gte: startDate, $lte: endDate },
    });
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/cog/last", async (req: Request, res: Response) => {
  try {
    const { timestamp, count } = req.query;

    const limit = count ? parseInt(count as string, 10) : DEFAULT_FRAME_COUNT;

    if (!VALID_FRAME_COUNTS.includes(limit)) {
      return res
        .status(400)
        .json({ message: "invalid frame count, not allowed" });
    }

    const query = timestamp
      ? { aquisition_datetime: { $lte: new Date(timestamp as string).getTime() } }
      : {};

    const cogs = await CogModel.find(query)
      .sort({ aquisition_datetime: -1 })
      .limit(limit);
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

export default metadataRouter;
