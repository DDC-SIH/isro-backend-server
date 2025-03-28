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
  // writeJsonToFile,
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
      writeJsonToFile(
        path.join(
          __dirname,
          `../../Requests/${new Date().getFullYear()}/${new Date().getMonth()}/${new Date().getDay()}/data_${new Date().toISOString()}.json`
        ),
        data
      ).catch((err) => console.error(err));
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

    let productRef = await Product.findOne({ productId });
    console.log({
      message: productRef ? "got previous product " + productId : "new product",
    });
    const newProduct = new Product({
      productId,
      name,
      description,
      satellite: sat._id,
      satelliteId: satellite,
      processingLevel,
      version,
      revision,
      aquisition_datetime: timestamp,
    });

    const newCog = new COG({
      filename,
      satellite: sat._id,
      satelliteId: satellite,
      filepath,
      coverage,
      coordinateSystem,
      size,
      cornerCoords,
      bands,
      processingLevel,
      version,
      revision,
      product: productRef ? productRef._id : newProduct._id,
      aquisition_datetime: timestamp,
    });

    if (productRef) {
      productRef
        .updateOne(
          {
            $addToSet: { cogs: newCog._id },
          },
          {
            new: true,
          }
        )
        .exec();
    } else {
      newProduct
        .updateOne(
          {
            $addToSet: { cogs: newCog._id },
          },
          {
            new: true,
          }
        )
        .exec();
      await newProduct.save();
      // await newProduct.save();
      await SatelliteModel.findOneAndUpdate(
        {
          satelliteId: satellite,
        },
        {
          $addToSet: { products: newProduct._id },
        },
        {
          new: true,
        }
      ).exec();
    }
    await newCog.save();

    res.status(200).send({
      message: "metadata saved successful",
      product: productRef ? productRef : newProduct,
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

metadataRouter.get(
  "/:satId/product/all",
  async (req: Request, res: Response) => {
    const satId = req.params.satId;
    try {
      const productList = await ProductModel.find({ satelliteId: satId });

      res.status(200).json({
        message: "Retrieved Data Successfully",
        products: productList,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

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

metadataRouter.get("/:satId/cog/all", async (req: Request, res: Response) => {
  const satId = req.params.satId;

  try {
    const cogList = await CogModel.find({ satelliteId: satId });

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

metadataRouter.get(
  "/:satId/product/range",
  async (req: Request, res: Response) => {
    try {
      const { start, end } = req.query;
      if (!start || !end) {
        return res.status(400).json({ message: "start and end time required" });
      }
      const satId = req.params.satId;

      const startTimestamp = new Date(start as string).getTime();
      const endTimestamp = new Date(end as string).getTime();
      console.log({ startTimestamp, endTimestamp });

      // const products = await ProductModel.find(filter).populate({
      //   path: "satellite",
      //   match: { satelliteId: satId },
      // });

      const products = await ProductModel.find({
        aquisition_datetime: { $gte: startTimestamp, $lte: endTimestamp },
        satelliteId: satId,
      });

      if (products.length < 1) {
        return res.status(404).json({ message: "Invalid query" });
      }
      res.status(200).json(products);
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

metadataRouter.get("/:satId/cog/range", async (req: Request, res: Response) => {
  try {
    const { start, end, processingLevel } = req.query;
    if (!start || !end) {
      return res.status(400).json({ message: "start adn end time required" });
    }
    const satId = req.params.satId;

    const startDate = new Date(start as string).getTime();
    const endDate = new Date(end as string).getTime();
    let filter: any = {
      aquisition_datetime: { $gte: startDate, $lte: endDate },
      satelliteId: satId,
    };
    if (processingLevel) {
      filter = { ...filter, processingLevel: processingLevel };
    }
    const cogs = await CogModel.find(filter);
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get("/:satId/cog/last", async (req: Request, res: Response) => {
  try {
    const { timestamp, count } = req.query;

    const limit = count ? parseInt(count as string, 10) : DEFAULT_FRAME_COUNT;

    if (!VALID_FRAME_COUNTS.includes(limit)) {
      return res
        .status(400)
        .json({ message: "invalid frame count, not allowed" });
    }
    const satId = req.params.satId;

    const query = timestamp
      ? {
          aquisition_datetime: {
            $lte: new Date(timestamp as string).getTime(),
          },
          satelliteId: satId,
        }
      : { satelliteId: satId };
    // const cogs = await SatelliteModel.findOne({ satelliteId: satId })
    //   .select("products")
    //   .populate({
    //     path: "products",
    //     populate: {
    //       path: "cogs",
    //       match: query,
    //       options: { limit: limit, sort: { aquisition_datetime: -1 } },
    //     },
    //   });
    const cogs = await CogModel.find(query)
      .sort({ aquisition_datetime: -1 })
      .limit(limit);
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

metadataRouter.get(
  "/:satId/product/last",
  async (req: Request, res: Response) => {
    try {
      const { timestamp, count } = req.query;
      const satId = req.params.satId;
      const limit = count ? parseInt(count as string, 10) : DEFAULT_FRAME_COUNT;

      if (!VALID_FRAME_COUNTS.includes(limit)) {
        return res
          .status(400)
          .json({ message: "invalid frame count, not allowed" });
      }
      const query = timestamp
        ? {
            aquisition_datetime: {
              $lte: new Date(timestamp as string).getTime(),
            },
            satelliteId: satId,
          }
        : { satelliteId: satId };
      // const sat = await SatelliteModel.findOne({ satelliteId: satId })
      //   .select("products")
      //   .populate({
      //     path: "products",
      //     match: query,
      //     options: { limit: limit, sort: { aquisition_datetime: -1 } },
      //   });

      const products = await ProductModel.find(query)
        .limit(limit)
        .sort({ aquisition_datetime: -1 });

      if (products.length < 1) {
        return res.status(404).json({ message: "sat not found" });
      }
      res.status(200).json({ products });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

export default metadataRouter;
