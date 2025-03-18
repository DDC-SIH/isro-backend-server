import express, { Request, Response } from "express";
import Product from "../models/ProductModel";
import COG from "../models/CogModel";

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
      prodcutId,
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
      prodcutId,
      name,
      description,
      satellite,
      aquisition_datetime,
      processingLevel,
      version,
      revision,
    });
    newProduct.save();

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
    newCog.save();

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

export default metadataRouter;
