import express, { Request, Response } from "express";
import Product from "../models/ProductModel";
import COG from "../models/CogModel";
import ProductModel from "../models/ProductModel";
import CogModel from "../models/CogModel";
import { VALID_FRAME_COUNTS } from "../consts";

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
    console.log(req.body);

    const newProduct = new Product({
      productId,
      name,
      description,
      satellite,
      aquisition_datetime,
      processingLevel,
      version,
      revision,
    });
    await newProduct.save();

    console.log(newProduct);
    
    const newCog = new COG({
      filename,
      filepath,
      coverage,
      coordinateSystem,
      size,
      cornerCoords,
      bands,
      product: newProduct._id,
      aquisition_datetime,
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

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);
    const products = await ProductModel.find({
      aquisition_datetime: { $gte: startDate, $lte: endDate },
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

    const startDate = new Date(start as string);
    const endDate = new Date(end as string);

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

    const limit = count ? parseInt(count as string, 10) : VALID_FRAME_COUNTS[0];

    if (!VALID_FRAME_COUNTS.includes(limit)) {
      return res
        .status(400)
        .json({ message: "invalid frame count, not allowed" });
    }

    const query = timestamp
      ? { aquisition_datetime: { $lte: new Date(timestamp as string) } }
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
