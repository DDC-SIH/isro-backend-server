import express, { Request, Response } from "express";
import Product from "../models/ProductModel";
import COG from "../models/CogModel";
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

/**
 * @swagger
 * components:
 *   schemas:
 *     COG:
 *       type: object
 *       required:
 *         - satellite
 *         - satelliteId
 *         - filepath
 *         - aquisition_datetime
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         filename:
 *           type: string
 *           description: Name of the COG file
 *         satellite:
 *           type: string
 *           description: Reference to the satellite ID
 *         satelliteId:
 *           type: string
 *           description: The satellite identifier
 *         filepath:
 *           type: string
 *           description: Path to the COG file
 *         coverage:
 *           type: object
 *           description: Geographic coverage information
 *         coordinateSystem:
 *           type: string
 *           description: Coordinate system used
 *         size:
 *           type: object
 *           description: Size information of the COG
 *         cornerCoords:
 *           type: object
 *           description: Coordinates of the corners
 *         bands:
 *           type: array
 *           description: Array of bands available in the COG
 *         processingLevel:
 *           type: string
 *           description: Processing level of the data (e.g., L1B)
 *         version:
 *           type: string
 *           description: Version of the data
 *         type:
 *           type: string
 *           description: Type of the COG (e.g., VIS, IR)
 *         revision:
 *           type: string
 *           description: Revision information
 *         aquisition_datetime:
 *           type: number
 *           description: Timestamp when the data was acquired
 *         productCode:
 *           type: string
 *           description: Product code associated with the COG
 *         product:
 *           type: string
 *           description: Reference to the product ID
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the COG was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the COG was last updated
 */


/**
 * @swagger
 * /api/metadata/save:
 *   post:
 *     summary: Save COG metadata
 *     tags: [Metadata]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - satellite
 *               - filepath
 *               - aquisition_datetime
 *             properties:
 *               productId:
 *                 type: string
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               satellite:
 *                 type: string
 *               aquisition_datetime:
 *                 type: string
 *                 format: date-time
 *               processingLevel:
 *                 type: string
 *               version:
 *                 type: string
 *               revision:
 *                 type: string
 *               filename:
 *                 type: string
 *               filepath:
 *                 type: string
 *               coverage:
 *                 type: object
 *               coordinateSystem:
 *                 type: string
 *               size:
 *                 type: object
 *               cornerCoords:
 *                 type: object
 *               type:
 *                 type: string
 *               bands:
 *                 type: array
 *                 items:
 *                   type: object
 *               product_code:
 *                 type: string
 *     responses:
 *       200:
 *         description: Metadata saved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cog:
 *                   $ref: '#/components/schemas/COG'
 *       400:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
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
      type,
      bands,
      product_code,
    } = req.body;
    try {
      const data: any = {};

      // Parse the request body
      Object.keys(req.body).forEach((key) => {
        data[key] = req.body[key];
      });

      // Extract date parts
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, "0");
      const day = String(now.getDate()).padStart(2, "0");
      const satelliteId = req.body.satellite || "unknown";

      const savePath = path.join(
        __dirname,
        `../../Requests/${satelliteId}/${year}/${month}/${day}`,
        `data_${now.toISOString()}.json`
      );

      // Save the data to a file
      await writeJsonToFile(savePath, data).catch((err) => console.error(err));
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


    // check product exists or not
    let product = await Product.findOne({
      productId: product_code,
      satelliteId: satellite,
      processingLevel,
    });
    if (!product) {
      product = new Product({
        product_code,
        satelliteId: satellite,
        processingLevel,
        isVisible: true,
        productId: product_code,
        cogs: [],
      });
      await product.save();
      await SatelliteModel.findOneAndUpdate(
        {
          satelliteId: satellite,
        },
        {
          $addToSet: { products: product._id },
        },
        {
          new: true,
        }
      ).exec();
      console.log("Product created and added to satellite");
    } else {
      console.log("Product already exists");
      // check if product is already added to satellite
      const isProductAdded = product ? sat.products.some(
        (productId) => productId.toString() === product?._id.toString()
      ) : false;
      if (!isProductAdded) {
        await SatelliteModel.findOneAndUpdate(
          {
            satelliteId: satellite,
          },
          {
            $addToSet: { products: product._id },
          },
          {
            new: true,
          }
        ).exec();
        console.log("Product added to satellite");
      } else {
        console.log("Product already added to satellite");
      }
    }
    // check if product is already added to cog






    const newCog = new COG({
      // name,
      // description,
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
      type,
      revision,
      aquisition_datetime: timestamp,
      productCode: product_code,
      product: product ? product._id : null,
    });

    await SatelliteModel.findOneAndUpdate(
      {
        satelliteId: satellite,
      },
      {
        $addToSet: { cogs: newCog._id },
      },
      {
        new: true,
      }
    ).exec();


    // check if cog is already added to product
    if (product) {

      await Product.findOneAndUpdate(
        {
          productId: product_code,
          satelliteId: satellite,
          processingLevel,
        },
        {
          $addToSet: { cogs: newCog._id },
        },
        {
          new: true,
        }
      ).exec();
      console.log("COG added to product");

    }
    // Save the new COG to the database
    console.log("Saving new COG to database");
    await newCog.save();

    res.status(200).send({
      message: "metadata saved successful",
      cog: newCog,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

/**
 * @swagger
 * /api/metadata/cog/all:
 *   get:
 *     summary: Get all COGs
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of all COGs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/COG'
 *       500:
 *         description: Server error
 */
metadataRouter.get("/cog/all", async (req: Request, res: Response) => {
  try {
    const showHidden = req.query.showHidden === 'true';

    let cogList;

    if (showHidden) {
      // If showHidden is true, get all COGs
      cogList = await CogModel.find();
    } else {
      // Otherwise, get only COGs from visible products
      // First, get all visible products
      const visibleProducts = await Product.find({ isVisible: true });
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Then get COGs associated with those products
      cogList = await CogModel.find({ product: { $in: visibleProductIds } });
    }

    res.status(200).json({
      message: "Retrieved Data Successfully",
      cogs: cogList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});



/**
 * @swagger
 * /api/metadata/{satId}/cog/all:
 *   get:
 *     summary: Get all COGs for a specific satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of all COGs for the specified satellite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/COG'
 *       500:
 *         description: Server error
 */
metadataRouter.get("/:satId/cog/all", async (req: Request, res: Response) => {
  const satId = req.params.satId;
  const showHidden = req.query.showHidden === 'true';

  try {
    let cogList;

    if (showHidden) {
      // If showHidden is true, get all COGs for this satellite
      cogList = await CogModel.find({ satelliteId: satId });
    } else {
      // Otherwise, get only COGs from visible products
      // First, get all visible products for this satellite
      const visibleProducts = await Product.find({
        satelliteId: satId,
        isVisible: true
      });
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Then get COGs associated with those products
      cogList = await CogModel.find({
        satelliteId: satId,
        product: { $in: visibleProductIds }
      });
    }

    res.status(200).json({
      message: "Retrieved Data Successfully",
      cogs: cogList,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});


/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/{productCode}/cog/all:
 *   get:
 *     summary: Get all COGs for a specific satellite and product code
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: path
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: true
 *         description: The processing level (e.g., L1B)
 *       - in: path
 *         name: productCode
 *         schema:
 *           type: string
 *         required: true
 *         description: The product code (e.g., HMK)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of all COGs for the specified satellite and product code
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 cogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/COG'
 *       500:
 *         description: Server error
 *       400:
 *         description: Satellite ID or product code is required
 */
metadataRouter.get(
  "/:satId/:processingLevel/:productCode/cog/all",
  async (req: Request, res: Response) => {
    const satId = req.params.satId;
    const processingLevel = req.params.processingLevel;
    const productCode = req.params.productCode;
    const showHidden = req.query.showHidden === 'true';

    if (!satId || !productCode) {
      return res.status(400).json({ message: "Satellite ID and product code are required" });
    }

    try {
      let cogList;

      // Build query for COGs
      const baseQuery = {
        satelliteId: satId,
        processingLevel: processingLevel,
        productCode: productCode,
      };

      if (!showHidden) {
        // If showHidden is false, check if the product is visible
        const product = await Product.findOne({
          satelliteId: satId,
          productId: productCode,
          processingLevel: processingLevel,
          isVisible: true
        });

        if (!product) {
          // If product is not visible or doesn't exist, return empty array
          return res.status(200).json({
            message: "Retrieved Data Successfully",
            cogs: [],
          });
        }
      }

      // Get the COGs with filters
      cogList = await CogModel.find(baseQuery);

      res.status(200).json({
        message: "Retrieved Data Successfully",
        cogs: cogList,
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);



/**
 * @swagger
 * /api/metadata/cog/info/{id}:
 *   get:
 *     summary: Get COG information by ID
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The COG ID
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to show COG from hidden products (default is false)
 *     responses:
 *       200:
 *         description: COG details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/COG'
 *       404:
 *         description: COG not found or belongs to a hidden product
 *       500:
 *         description: Server error
 */
metadataRouter.get("/cog/info/:id", async (req: Request, res: Response) => {
  try {
    const showHidden = req.query.showHidden === 'true';
    const cog = await CogModel.findById(req.params.id);

    if (!cog) {
      return res.status(404).json({ message: "COG not found" });
    }

    if (!showHidden && cog.product) {
      // Check if the product is visible
      const product = await Product.findOne({ productId: cog.productCode });
      if (product && !product.isVisible) {
        return res.status(404).json({ message: "COG belongs to a hidden product" });
      }
    }

    res.status(200).json(cog);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

/**
 * @swagger
 * /api/metadata/{satId}/cog/range:
 *   get:
 *     summary: Get COGs within a time range for a specific satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: start
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Start date/time (ISO format)
 *       - in: query
 *         name: end
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: End date/time (ISO format)
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by product code
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by COG type (e.g., VIS, IR)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of COGs within the specified range
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/COG'
 *       400:
 *         description: Start and end time required
 *       500:
 *         description: Server error
 */
metadataRouter.get("/:satId/cog/range", async (req: Request, res: Response) => {
  try {
    const { start, end, processingLevel, productCode, type } = req.query;
    const showHidden = req.query.showHidden === 'true';

    if (!start || !end) {
      return res.status(400).json({ message: "start and end time required" });
    }
    const satId = req.params.satId;

    const startDate = new Date(start as string).getTime();
    const endDate = new Date(end as string).getTime();
    let filter: any = {
      aquisition_datetime: { $gte: startDate, $lte: endDate },
      satelliteId: satId,
    };

    if (processingLevel) {
      filter.processingLevel = processingLevel;
    }

    if (productCode) {
      filter.productCode = productCode;
    }

    if (type) {
      filter.type = type;
    }

    let cogs;

    if (!showHidden) {
      // Get visible products
      const visibleProductQuery: any = {
        satelliteId: satId,
        isVisible: true
      };

      if (processingLevel) {
        visibleProductQuery.processingLevel = processingLevel;
      }

      if (productCode) {
        visibleProductQuery.productId = productCode;
      }

      const visibleProducts = await Product.find(visibleProductQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      filter.product = { $in: visibleProductIds };
    }

    cogs = await CogModel.find(filter);
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

/**
 * @swagger
 * /api/metadata/{satId}/cog/last:
 *   get:
 *     summary: Get the latest COGs for a specific satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: timestamp
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Reference timestamp (ISO format) to get COGs before this time
 *       - in: query
 *         name: count
 *         schema:
 *           type: integer
 *         required: false
 *         description: Number of COGs to return
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of latest COGs
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/COG'
 *       400:
 *         description: Invalid frame count
 *       500:
 *         description: Server error
 */
metadataRouter.get("/:satId/cog/last", async (req: Request, res: Response) => {
  try {
    const { timestamp, count } = req.query;
    const showHidden = req.query.showHidden === 'true';

    const limit = count ? parseInt(count as string, 10) : DEFAULT_FRAME_COUNT;

    if (!VALID_FRAME_COUNTS.includes(limit)) {
      return res
        .status(400)
        .json({ message: "invalid frame count, not allowed" });
    }
    const satId = req.params.satId;

    const query: any = timestamp
      ? {
        aquisition_datetime: {
          $lte: new Date(timestamp as string).getTime(),
        },
        satelliteId: satId,
      }
      : { satelliteId: satId };

    if (!showHidden) {
      // Get visible products for this satellite
      const visibleProducts = await Product.find({
        satelliteId: satId,
        isVisible: true
      });
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    const cogs = await CogModel.find(query)
      .sort({ aquisition_datetime: -1 })
      .limit(limit);
    res.status(200).json(cogs);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

/**
 * @swagger
 * /api/metadata/{satId}/cog/show:
 *   get:
 *     summary: Get a specific COG for a satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: datetime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: ISO date string to get the COG from a specific time
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by COG type (e.g., VIS, IR)
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by product code
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products (default is false)
 *     responses:
 *       200:
 *         description: COG details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cog:
 *                   $ref: '#/components/schemas/COG'
 *       404:
 *         description: COG not found
 *       500:
 *         description: Server error
 *     examples:
 *       - description: Get latest COG for satellite 3R
 *         value: /api/metadata/3R/cog/show
 *       - description: Get COG for satellite 3R from specific date
 *         value: /api/metadata/3R/cog/show?datetime=2025-04-03T06:47:15.751Z
 *       - description: Get latest visual type COG for satellite 3R
 *         value: /api/metadata/3R/cog/show?type=VIS
 *       - description: Get VIS COG for satellite 3R from specific date and processing level
 *         value: /api/metadata/3R/cog/show?processingLevel=L1B&datetime=2025-04-03T06:47:15.751Z&type=VIS
 */
metadataRouter.get("/:satId/cog/show", async (req: Request, res: Response) => {
  try {
    const satId = req.params.satId;
    const { datetime, type, processingLevel, productCode } = req.query;
    const showHidden = req.query.showHidden === 'true';

    const timestamp = datetime
      ? new Date(datetime as string).getTime()
      : undefined;

    const query: any = {
      satelliteId: satId,
      ...(processingLevel && { processingLevel: processingLevel }),
      ...(type && { type: type }),
      ...(productCode && { productCode: productCode }),
    };

    if (!showHidden) {
      // Get visible products for this satellite
      const visibleProductQuery: any = {
        satelliteId: satId,
        isVisible: true
      };

      if (processingLevel) {
        visibleProductQuery.processingLevel = processingLevel;
      }

      if (productCode) {
        visibleProductQuery.productId = productCode;
      }

      const visibleProducts = await Product.find(visibleProductQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    let cog;
    if (timestamp) {
      query.aquisition_datetime = timestamp;
      cog = await CogModel.findOne(query);
    } else {
      // If no timestamp provided, get the latest one
      cog = await CogModel.findOne(query).sort({ aquisition_datetime: -1 });
    }

    if (!cog) {
      return res.status(404).json({ message: "cog not found" });
    }
    res.status(200).json({ cog });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

/**
 * @swagger
 * /api/metadata/{satId}/cog/available-times:
 *   get:
 *     summary: Get available times for a specific satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date
 *         required: false
 *         description: ISO date string to filter available times (YYYY-MM-DD)
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level (e.g., L1B)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include times from hidden products (default is false)
 *     responses:
 *       200:
 *         description: Available times for the satellite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availableTimes:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       aquisition_datetime:
 *                         type: number
 *                         description: Timestamp of acquisition
 *                       datetime:
 *                         type: string
 *                         format: date-time
 *                         description: ISO formatted date-time
 *       500:
 *         description: Server error
 *     examples:
 *       - description: Get available times for satellite 3R on a specific date with processing level L1B
 *         value: /api/metadata/3R/cog/available-times?date=2025-04-03&processingLevel=L1B
 */
metadataRouter.get(
  "/:satId/cog/available-times",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const { date, processingLevel } = req.query;
      const showHidden = req.query.showHidden === 'true';

      const timestamp = date ? new Date(date as string).getTime() : undefined;
      const query: any = {
        satelliteId: satId,
        ...(processingLevel && { processingLevel: processingLevel }),
      };

      if (timestamp) {
        // Get start and end of the specified day
        const startOfDay = new Date(
          new Date(timestamp).setHours(0, 0, 0, 0)
        ).getTime();
        const endOfDay = new Date(
          new Date(timestamp).setHours(23, 59, 59, 999)
        ).getTime();

        query.aquisition_datetime = {
          $gte: startOfDay,
          $lte: endOfDay,
        };
      }

      if (!showHidden) {
        // Get visible products for this satellite
        const visibleProductQuery: any = {
          satelliteId: satId,
          isVisible: true
        };

        if (processingLevel) {
          visibleProductQuery.processingLevel = processingLevel;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      const cogs = await CogModel.find(query).sort({ aquisition_datetime: 1 });
      // Extract unique timestamps from cogs
      const uniqueTimestamps = [
        ...new Set(cogs.map((cog) => cog.aquisition_datetime)),
      ];

      // Create the array of available times with unique timestamps only
      const availableTimes = uniqueTimestamps.map((timestamp) => {
        return {
          aquisition_datetime: timestamp,
          datetime: convertFromTimestamp(timestamp),
        };
      });
      res.status(200).json({ availableTimes });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/{satId}/cog/available-dates:
 *   get:
 *     summary: Get available dates for a specific satellite
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level (e.g., L1B)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include dates from hidden products (default is false)
 *     responses:
 *       200:
 *         description: Available dates for the satellite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 availableDates:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       date:
 *                         type: string
 *                         format: date
 *                         description: Date in YYYY-MM-DD format
 *                       datetime:
 *                         type: number
 *                         description: Timestamp corresponding to the date
 *       500:
 *         description: Server error
 *     examples:
 *       - description: Get available dates for satellite 3R with processing level L1B
 *         value: /api/metadata/3R/cog/available-dates?processingLevel=L1B
 */
metadataRouter.get(
  "/:satId/cog/available-dates",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const { processingLevel } = req.query;
      const showHidden = req.query.showHidden === 'true';

      const query: any = {
        satelliteId: satId,
        ...(processingLevel && { processingLevel: processingLevel }),
      };

      if (!showHidden) {
        // Get visible products for this satellite
        const visibleProductQuery: any = {
          satelliteId: satId,
          isVisible: true
        };

        if (processingLevel) {
          visibleProductQuery.processingLevel = processingLevel;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      const cogs = await CogModel.find(query).sort({ aquisition_datetime: 1 });
      // Extract unique dates from cogs
      const uniqueDates = [
        ...new Set(
          cogs.map((cog) => {
            const date = new Date(cog.aquisition_datetime);
            return date.toISOString().split("T")[0]; // Get the date part (YYYY-MM-DD)
          })
        ),
      ];
      // Create the array of available dates
      const availableDates = uniqueDates.map((date) => {
        return {
          date,
          datetime: new Date(date).getTime(),
        };
      });
      res.status(200).json({ availableDates });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/types:
 *   get:
 *     summary: Get all available types for a specific satellite and processing level
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: path
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: true
 *         description: The processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter by product code
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include types from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of available types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 types:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of available types (e.g., VIS, IR, multi)
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/:processingLevel/types",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const processingLevel = req.params.processingLevel;
      const { productCode } = req.query;
      const showHidden = req.query.showHidden === 'true';

      // Build base query
      const query: any = {
        satelliteId: satId,
        processingLevel: processingLevel,
      };

      // Add product code filter if provided
      if (productCode) {
        query.productCode = productCode;
      }

      // Handle visibility filter
      if (!showHidden) {
        // Get visible products for this satellite and processing level
        const visibleProductQuery: any = {
          satelliteId: satId,
          processingLevel: processingLevel,
          isVisible: true
        };

        if (productCode) {
          visibleProductQuery.productId = productCode;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      // Get COGs that match the criteria
      const cogs = await CogModel.find(query);

      // Extract unique types
      const types = [...new Set(cogs.map(cog => cog.type))];

      res.status(200).json({
        types
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/types-with-latest:
 *   get:
 *     summary: Get all available types for a specific satellite and processing level with latest COG for each type
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: path
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: true
 *         description: The processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter by product code
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include types from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of available types with latest COG for each type
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 typeData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                         description: Type name (e.g., VIS, IR, multi)
 *                       latestCog:
 *                         $ref: '#/components/schemas/COG'
 *                         description: The most recent COG of this type
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/:processingLevel/types-with-latest",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const processingLevel = req.params.processingLevel;
      const { productCode } = req.query;
      const showHidden = req.query.showHidden === 'true';

      // Build base query
      const query: any = {
        satelliteId: satId,
        processingLevel: processingLevel,
      };

      // Add product code filter if provided
      if (productCode) {
        query.productCode = productCode;
      }

      // Handle visibility filter
      if (!showHidden) {
        // Get visible products for this satellite and processing level
        const visibleProductQuery: any = {
          satelliteId: satId,
          processingLevel: processingLevel,
          isVisible: true
        };

        if (productCode) {
          visibleProductQuery.productId = productCode;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      // Get COGs that match the criteria
      const cogs = await CogModel.find(query);

      // Extract unique types
      const uniqueTypes = [...new Set(cogs.map(cog => cog.type))];

      // For each type, get the latest COG
      const typeData = await Promise.all(uniqueTypes.map(async (type) => {
        const typeQuery = { ...query, type };
        const latestCog = await CogModel.findOne(typeQuery)
          .sort({ aquisition_datetime: -1 })
          .limit(1);

        return {
          type,
          latestCog
        };
      }));

      res.status(200).json({
        typeData
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/all-bands:
 *   get:
 *     summary: Get all available band types for a specific satellite and processing level
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: path
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: true
 *         description: The processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter by product code
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include bands from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of all available band types
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bands:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of all available band types (e.g., VIS, SWIR, TIR1, TIR2, etc.)
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/:processingLevel/all-bands",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const processingLevel = req.params.processingLevel;
      const { productCode } = req.query;
      const showHidden = req.query.showHidden === 'true';

      // Build base query
      const query: any = {
        satelliteId: satId,
        processingLevel: processingLevel,
      };

      // Add product code filter if provided
      if (productCode) {
        query.productCode = productCode;
      }

      // Handle visibility filter
      if (!showHidden) {
        // Get visible products for this satellite and processing level
        const visibleProductQuery: any = {
          satelliteId: satId,
          processingLevel: processingLevel,
          isVisible: true
        };

        if (productCode) {
          visibleProductQuery.productId = productCode;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      // Get COGs that match the criteria
      const cogs = await CogModel.find(query);

      // Initialize array to hold all band descriptions
      const allBands: string[] = [];

      // Extract band descriptions and types
      cogs.forEach(cog => {
        // Add the COG type itself
        if (cog.type && !allBands.includes(cog.type)) {
          allBands.push(cog.type);
        }

        // Add all band descriptions from each COG, removing "IMG_" prefix
        if (cog.bands && Array.isArray(cog.bands)) {
          cog.bands.forEach(band => {
            if (band.description) {
              // Remove "IMG_" prefix if it exists
              const cleanBandName = band.description.replace(/^IMG_/, '');
              if (!allBands.includes(cleanBandName)) {
                allBands.push(cleanBandName);
              }
            }
          });
        }
      });

      // Sort the bands alphabetically
      // allBands.sort();

      res.status(200).json({
        bands: allBands
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/all-bands-with-latest-data:
 *   get:
 *     summary: Get all available band types with their latest data
 *     tags: [Metadata]
 *     parameters:
 *       - in: path
 *         name: satId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: path
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: true
 *         description: The processing level (e.g., L1B)
 *       - in: query
 *         name: productCode
 *         schema:
 *           type: string
 *         required: false
 *         description: Optional filter by product code
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include bands from hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of all available band types with their data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bandData:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       band:
 *                         type: string
 *                         description: Band name/description
 *                       source:
 *                         type: string
 *                         description: Type of COG this band comes from
 *                       cogId:
 *                         type: string
 *                         description: ID of the COG containing this band
 *                       bandInfo:
 *                         type: object
 *                         description: Additional band information
 *                       aquisition_datetime:
 *                         type: number
 *                         description: Acquisition timestamp of the COG
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/:processingLevel/all-bands-with-latest-data",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const processingLevel = req.params.processingLevel;
      const { productCode } = req.query;
      const showHidden = req.query.showHidden === 'true';

      // Build base query
      const query: any = {
        satelliteId: satId,
        processingLevel: processingLevel,
      };

      // Add product code filter if provided
      if (productCode) {
        query.productCode = productCode;
      }

      // Handle visibility filter
      if (!showHidden) {
        // Get visible products for this satellite and processing level
        const visibleProductQuery: any = {
          satelliteId: satId,
          processingLevel: processingLevel,
          isVisible: true
        };

        if (productCode) {
          visibleProductQuery.productId = productCode;
        }

        const visibleProducts = await Product.find(visibleProductQuery);
        const visibleProductIds = visibleProducts.map(product => product._id);

        // Add filter for visible products
        query.product = { $in: visibleProductIds };
      }

      // Get COGs that match the criteria
      const cogs = await CogModel.find(query).sort({ aquisition_datetime: -1 });

      // Single map to track all bands
      const bandMap = new Map<string, any>();

      // First collect all band descriptions from all COGs
      // This takes precedence over COG types
      cogs.forEach(cog => {
        if (cog.bands && Array.isArray(cog.bands)) {
          cog.bands.forEach(band => {
            if (band.description) {
              // Remove "IMG_" prefix if it exists
              const cleanBandName = band.description.replace(/^IMG_/, '');

              // Skip if this band name is already mapped from a non-MULTI source
              if (!bandMap.has(cleanBandName) ||
                (bandMap.has(cleanBandName) &&
                  bandMap.get(cleanBandName).source === 'MULTI' &&
                  cog.type !== 'MULTI')) {

                bandMap.set(cleanBandName, {
                  band: cleanBandName,
                  originalName: band.description,
                  source: cog.type,
                  cogId: cog._id,
                  filename: cog.filename,
                  filepath: cog.filepath,
                  aquisition_datetime: cog.aquisition_datetime,
                  acquisition_date: convertFromTimestamp(cog.aquisition_datetime),
                  productCode: cog.productCode,
                  size: cog.size,
                  bandInfo: {
                    ...band,
                    description: cleanBandName
                  },
                  coverage: cog.coverage,
                  cornerCoords: cog.cornerCoords,
                  version: cog.version,
                  revision: cog.revision,
                  coordinateSystem: cog.coordinateSystem,
                  cogMetadata: {
                    _id: cog._id,
                    satellite: cog.satellite,
                    satelliteId: cog.satelliteId,
                    processingLevel: cog.processingLevel
                  }
                });
              }
            }
          });
        }
      });

      // Then add COG types only if they don't exist as a band already
      cogs.forEach(cog => {
        if (cog.type && cog.type !== 'MULTI' && !bandMap.has(cog.type)) {
          bandMap.set(cog.type, {
            band: cog.type,
            source: cog.type,
            cogId: cog._id,
            filename: cog.filename,
            filepath: cog.filepath,
            aquisition_datetime: cog.aquisition_datetime,
            acquisition_date: convertFromTimestamp(cog.aquisition_datetime),
            productCode: cog.productCode,
            size: cog.size,
            coverage: cog.coverage,
            cornerCoords: cog.cornerCoords,
            version: cog.version,
            revision: cog.revision,
            coordinateSystem: cog.coordinateSystem,
            bandInfo: null, // No specific band info for the COG type itself
            cogMetadata: {
              _id: cog._id,
              satellite: cog.satellite,
              satelliteId: cog.satelliteId,
              processingLevel: cog.processingLevel
            }
          });
        }
      });

      // Convert map to array
      const bandData = Array.from(bandMap.values());

      // Sort by band name
      bandData.sort((a, b) => a.band.localeCompare(b.band));

      res.status(200).json({
        bandData
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

export default metadataRouter;
