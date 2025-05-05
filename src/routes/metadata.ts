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
      productDisplayName
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
    if (product && !product.productDisplayName) {
      product.productDisplayName = productDisplayName;
      await product.save();
      console.log("Product updated with display name");
    }

    if (!product) {
      product = new Product({
        product_code,
        satelliteId: satellite,
        processingLevel,
        isVisible: true,
        productId: product_code,
        productDisplayName,
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


    let newBands = bands;
    // Check if the request has bands and clean up the band descriptions
    if (req.body.bands && Array.isArray(req.body.bands)) {
      newBands = req.body.bands.map((band: any) => {
        if (band.description && band.description.startsWith('IMG_')) {
          return {
            ...band,
            description: band.description.replace(/^IMG_/, '')
          };
        }
        return band;
      });
    }

    // remove IMG_ prefix from productCode

    let cleanProductCode = product_code;
    if (product_code && product_code.startsWith('IMG_')) {
      cleanProductCode = product_code.replace(/^IMG_/, '');
    }





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
      bands: newBands,
      processingLevel,
      version,
      type,
      revision,
      aquisition_datetime: timestamp,
      productCode: cleanProductCode,
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
          productId: cleanProductCode,
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

    // We'll handle type filtering after retrieving the COGs since
    // we need to inspect band descriptions which can't be done in the MongoDB query

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

    // Filter by type if provided (needs to check both type field and band descriptions)
    if (type) {
      // First pass: Get native type matches (non-MULTI)
      const nativeTypeCogs = cogs.filter(cog =>
        cog.type && cog.type !== "MULTI" && cog.type === type
      );

      // If we have native matches, return those
      if (nativeTypeCogs.length > 0) {
        cogs = nativeTypeCogs;
      } else {
        // Otherwise, look for matches in band descriptions
        const multiTypeCogsWithRequestedBand = cogs.filter(cog => {
          // Check band descriptions
          if (cog.bands && Array.isArray(cog.bands)) {
            return cog.bands.some(band => {
              if (band.description) {
                // Remove "IMG_" prefix if it exists
                const cleanBandName = band.description.replace(/^IMG_/, '');
                return cleanBandName === type;
              }
              return false;
            });
          }
          return false;
        });

        // Filter the bands in MULTI COGs to only include the requested band
        cogs = multiTypeCogsWithRequestedBand.map(cog => {
          // Create a shallow copy of the COG to avoid modifying the original
          const filteredCog = { ...cog.toObject() };

          // If it's a MULTI type COG, filter its bands
          if (filteredCog.type === "MULTI" && filteredCog.bands && Array.isArray(filteredCog.bands)) {
            const filteredBands: any = filteredCog.bands.filter(band => {
              if (band.description) {
                const cleanBandName = band.description.replace(/^IMG_/, '');
                return cleanBandName === type;
              }
              return false;
            });

            // Ensure we have at least one band to satisfy the type constraint
            if (filteredBands.length > 0) {
              filteredCog.bands = filteredBands;
            }
          }

          return filteredCog;
        });
      }
    }

    res.status(200).json({
      message: "Retrieved Data Successfully",
      cogs: cogs
    });
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
 *         name: type
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by COG type or band description
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
    const { timestamp, count, type } = req.query;
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

    // Get all matching cogs sorted by acquisition time
    let cogs = await CogModel.find(query)
      .sort({ aquisition_datetime: -1 });

    // Filter by type if provided (needs to check both type field and band descriptions)
    if (type) {
      // First, create a map to prioritize native types over multi types
      const bandMap = new Map<string, any>();

      // First pass: collect all cogs with native types (non-MULTI)
      cogs.forEach(cog => {
        if (cog.type && cog.type !== "MULTI" && cog.type === type) {
          if (!bandMap.has(type as string)) {
            bandMap.set(type as string, cog);
          }
        }
      });

      // If no native type found, check band descriptions in MULTI type cogs
      if (!bandMap.has(type as string)) {
        cogs.forEach(cog => {
          if (cog.type === "MULTI" && cog.bands && Array.isArray(cog.bands)) {
            // Check if this cog has the requested band
            const hasBand = cog.bands.some(band => {
              if (band.description) {
                // Remove "IMG_" prefix if it exists
                const cleanBandName = band.description.replace(/^IMG_/, '');
                return cleanBandName === type;
              }
              return false;
            });

            if (hasBand && !bandMap.has(type as string)) {
              // Create a shallow copy of the COG to avoid modifying the original
              const filteredCog: any = { ...cog.toObject() };

              // Filter its bands to only include the requested band
              if (filteredCog.bands && Array.isArray(filteredCog.bands)) {
                filteredCog.bands = filteredCog.bands.filter((band: any) => {
                  if (band.description) {
                    const cleanBandName = band.description.replace(/^IMG_/, '');
                    return cleanBandName === type;
                  }
                  return false;
                });
              }

              bandMap.set(type as string, filteredCog);
            }
          }
        });
      }

      // Convert back to array (will have at most one cog)
      cogs = Array.from(bandMap.values());
    } else {
      // If no specific type filter, remove duplicates based on band descriptors
      // For each unique band type, keep the most recent cog
      const bandMap = new Map<string, any>();

      // First pass: collect all native type cogs (non-MULTI)
      cogs.forEach(cog => {
        if (cog.type && cog.type !== "MULTI") {
          if (!bandMap.has(cog.type)) {
            bandMap.set(cog.type, cog);
          }
        }
      });

      // Second pass: collect band descriptions from all cogs
      // Only add if not already covered by a native type
      cogs.forEach(cog => {
        if (cog.type === "MULTI" && cog.bands && Array.isArray(cog.bands)) {
          cog.bands.forEach(band => {
            if (band.description) {
              // Remove "IMG_" prefix if it exists
              const cleanBandName = band.description.replace(/^IMG_/, '');
              // Only add if we don't already have this band from a native type
              if (!bandMap.has(cleanBandName)) {
                // Create a shallow copy of the COG to avoid modifying the original
                const filteredCog = { ...cog.toObject() };

                // Filter its bands to only include this band
                filteredCog.bands = [band];

                bandMap.set(cleanBandName, filteredCog);
              }
            }
          });
        }
      });

      // Convert back to array and limit results
      cogs = Array.from(bandMap.values());
    }

    // Apply the limit after deduplication
    const limitedCogs = cogs.slice(0, limit);

    res.status(200).json({
      message: "Retrieved Data Successfully",
      cogs: limitedCogs
    });
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

      // REMOVE "MULTI" from the list
      const multiIndex = allBands.indexOf("MULTI");
      if (multiIndex > -1) {
        allBands.splice(multiIndex, 1);
      }

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
 *                       type:
 *                         type: string
 *                         description: Band name/description
 *                       source:
 *                         type: string
 *                         description: Type of COG this band comes from
 *                       cogId:
 *                         type: string
 *                         description: ID of the COG containing this band
 *                       bands:
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
                  type: cleanBandName,
                  originalName: band.description,
                  source: cog.type,
                  cogId: cog._id,
                  filename: cog.filename,
                  filepath: cog.filepath,
                  aquisition_datetime: cog.aquisition_datetime,
                  acquisition_date: convertFromTimestamp(cog.aquisition_datetime),
                  productCode: cog.productCode,
                  size: cog.size,
                  bands: {
                    ...band,
                    description: cleanBandName
                  },
                  coverage: cog.coverage,
                  cornerCoords: cog.cornerCoords,
                  version: cog.version,
                  revision: cog.revision,
                  coordinateSystem: cog.coordinateSystem,
                  _id: cog._id,
                  satellite: cog.satellite,
                  satelliteId: cog.satelliteId,
                  processingLevel: cog.processingLevel
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
            type: cog.type,
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
            bands: null, // No specific band info for the COG type itself
            _id: cog._id,
            satellite: cog.satellite,
            satelliteId: cog.satelliteId,
            processingLevel: cog.processingLevel
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

/**
 * @swagger
 * /api/metadata/{satId}/{processingLevel}/all-bands-with-datetime:
 *   get:
 *     summary: Get all available band types for a specific datetime
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
 *         name: datetime
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: ISO date string to get band data from a specific time
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
 *         description: List of all available band types with their data for the specified datetime
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
 *                       type:
 *                         type: string
 *                         description: Band name/description
 *                       source:
 *                         type: string
 *                         description: Type of COG this band comes from
 *                       cogId:
 *                         type: string
 *                         description: ID of the COG containing this band
 *                       bands:
 *                         type: object
 *                         description: Additional band information
 *                       aquisition_datetime:
 *                         type: number
 *                         description: Acquisition timestamp of the COG
 *       400:
 *         description: Datetime parameter is required
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/:processingLevel/all-bands-with-datetime",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const processingLevel = req.params.processingLevel;
      const { datetime, productCode } = req.query;
      const showHidden = req.query.showHidden === 'true';

      // Validate datetime parameter
      if (!datetime) {
        return res.status(400).json({ message: "datetime parameter is required" });
      }

      // Convert datetime string to timestamp
      const timestamp = new Date(datetime as string).getTime();
      if (isNaN(timestamp)) {
        return res.status(400).json({ message: "Invalid datetime format" });
      }

      // Build base query
      const query: any = {
        satelliteId: satId,
        processingLevel: processingLevel,
        aquisition_datetime: timestamp
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

      if (cogs.length === 0) {
        return res.status(200).json({
          message: `No data found for the specified datetime: ${datetime}`,
          bandData: []
        });
      }

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
                  type: cleanBandName,
                  originalName: band.description,
                  source: cog.type,
                  cogId: cog._id,
                  filename: cog.filename,
                  filepath: cog.filepath,
                  aquisition_datetime: cog.aquisition_datetime,
                  acquisition_date: convertFromTimestamp(cog.aquisition_datetime),
                  productCode: cog.productCode,
                  size: cog.size,
                  bands: {
                    ...band,
                    description: cleanBandName
                  },
                  coverage: cog.coverage,
                  cornerCoords: cog.cornerCoords,
                  version: cog.version,
                  revision: cog.revision,
                  coordinateSystem: cog.coordinateSystem,
                  _id: cog._id,
                  satellite: cog.satellite,
                  satelliteId: cog.satelliteId,
                  processingLevel: cog.processingLevel
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
            type: cog.type,
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
            bands: null, // No specific band info for the COG type itself
            _id: cog._id,
            satellite: cog.satellite,
            satelliteId: cog.satelliteId,
            processingLevel: cog.processingLevel
          });
        }
      });

      // Convert map to array
      const bandData = Array.from(bandMap.values());

      // Sort by band name
      bandData.sort((a, b) => a.band.localeCompare(b.band));

      res.status(200).json({
        bandData,
        timestamp,
        datetime: convertFromTimestamp(timestamp)
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);

/**
 * @swagger
 * /api/metadata/time-series:
 *   get:
 *     summary: Get time series data for a specified band or type
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: satelliteId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *       - in: query
 *         name: band
 *         schema:
 *           type: string
 *         required: true
 *         description: The band or type to get time series for (e.g., VIS, TIR1)
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: End date (ISO format)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *         required: false
 *         description: Aggregation interval (default is daily)
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level
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
 *         description: Whether to include COGs from hidden products
 *       - in: query
 *         name: populateWithResults
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include the full COG details in the response (default is false)
 *     responses:
 *       200:
 *         description: Time series data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 timeSeries:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       interval:
 *                         type: string
 *                         format: date-time
 *                       count:
 *                         type: integer
 *                       cogIds:
 *                         type: array
 *                         items:
 *                           type: string
 *                       cogs:
 *                         type: array
 *                         items:
 *                           $ref: '#/components/schemas/COG'
 *                         description: Full COG details (only included if populateWithResults=true)
 *                 band:
 *                   type: string
 *                 totalCount:
 *                   type: integer
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
metadataRouter.get("/time-series", async (req: Request, res: Response) => {
  try {
    const {
      satelliteId,
      band,
      startDate,
      endDate,
      interval = 'daily',
      processingLevel,
      productCode,
      showHidden = false,
      populateWithResults = false
    } = req.query;

    // Validate required parameters
    if (!satelliteId || !band || !startDate || !endDate) {
      return res.status(400).json({
        message: "satelliteId, band, startDate, and endDate are required parameters"
      });
    }

    // Parse dates
    const start = new Date(startDate as string).getTime();
    const end = new Date(endDate as string).getTime();

    if (isNaN(start) || isNaN(end)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Build the base query
    const query: any = {
      satelliteId,
      aquisition_datetime: {
        $gte: start,
        $lte: end
      }
    };

    // Add processing level filter if provided
    if (processingLevel) {
      query.processingLevel = processingLevel;
    }

    // Add product code filter if provided
    if (productCode) {
      query.productCode = productCode;
    }

    // Handle visibility filter
    if (showHidden === 'false' || !showHidden) {
      // Get visible products
      const visibleProductsQuery: any = {
        satelliteId,
        isVisible: true
      };

      if (processingLevel) {
        visibleProductsQuery.processingLevel = processingLevel;
      }

      if (productCode) {
        visibleProductsQuery.productId = productCode;
      }

      const visibleProducts = await Product.find(visibleProductsQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    // Get all COGs that match the criteria
    const cogs = await CogModel.find(query).populate({
      path: 'product',
      select: '_id productId processingLevel isVisible' // Select specific fields you need
    });

    if (cogs.length === 0) {
      return res.status(200).json({
        timeSeries: [],
        band: band,
        totalCount: 0
      });
    }

    // Filter COGs by band/type
    const bandCogs = cogs.filter(cog => {
      // Check if the band matches the COG type
      if (cog.type === band) {
        return true;
      }

      // Check if the band is in the COG's bands array
      if (cog.bands && Array.isArray(cog.bands)) {
        return cog.bands.some(b => {
          const cleanBandName = b.description ? b.description.replace(/^IMG_/, '') : '';
          return cleanBandName === band;
        });
      }

      return false;
    });

    if (bandCogs.length === 0) {
      return res.status(200).json({
        timeSeries: [],
        band: band,
        totalCount: 0,
        message: `No COGs found with band/type '${band}'`
      });
    }

    // Group COGs by interval
    const timeSeriesMap = new Map<string, any>();

    // Define the interval grouping function (similar to temporal-distribution)
    const getIntervalKey = (timestamp: number) => {
      const date = new Date(timestamp);

      switch (interval) {
        case 'hourly':
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate(),
            date.getHours()
          ).toISOString();

        case 'weekly':
          // Get the first day of the week (Sunday)
          const day = date.getDate() - date.getDay();
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            day
          ).toISOString();

        case 'monthly':
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            1
          ).toISOString();

        case 'daily':
        default:
          return new Date(
            date.getFullYear(),
            date.getMonth(),
            date.getDate()
          ).toISOString();
      }
    };

    // Group COGs by interval
    bandCogs.forEach(cog => {
      const intervalKey = getIntervalKey(cog.aquisition_datetime);

      if (!timeSeriesMap.has(intervalKey)) {
        timeSeriesMap.set(intervalKey, {
          interval: intervalKey,
          count: 0,
          cogIds: [],
          cogs: [],
          products: new Map() // Track unique products per interval
        });
      }

      const entry = timeSeriesMap.get(intervalKey);
      entry.count++;

      // Store COG ID
      entry.cogIds.push(cog._id);

      // Store full COG if populateWithResults is true
      if (populateWithResults === 'true') {
        entry.cogs.push(cog);
      }

      // Add product information if available
      if (cog.product) {
        const productId = cog.product._id.toString();
        if (!entry.products.has(productId)) {
          entry.products.set(productId, {
            id: productId,
            productId: cog.productCode,
            processingLevel: cog.processingLevel,
            cogCount: 0
          });
        }
        const productEntry = entry.products.get(productId);
        productEntry.cogCount++;
      }
    });

    // Convert map to array and sort by interval
    const timeSeries = Array.from(timeSeriesMap.values())
      .map(entry => {
        // Convert products Map to array
        entry.products = Array.from(entry.products.values());

        // If not populating with results, remove the cogs array to save bandwidth
        if (populateWithResults !== 'true') {
          delete entry.cogs;
        }

        return entry;
      })
      .sort((a, b) => new Date(a.interval).getTime() - new Date(b.interval).getTime());

    // Get unique products across all intervals
    const uniqueProducts = new Map();
    bandCogs.forEach(cog => {
      if (cog.product) {
        const productId = cog.product._id.toString();
        if (!uniqueProducts.has(productId)) {
          uniqueProducts.set(productId, {
            id: productId,
            productId: cog.productCode,
            processingLevel: cog.processingLevel,
            cogCount: 0
          });
        }
        uniqueProducts.get(productId).cogCount++;
      }
    });

    res.status(200).json({
      timeSeries,
      band,
      totalCount: bandCogs.length,
      products: Array.from(uniqueProducts.values())
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /api/metadata/analytics/band-distribution:
 *   get:
 *     summary: Get distribution of bands across satellites and products
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for analysis period (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for analysis period (ISO format)
 *       - in: query
 *         name: satelliteIds
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of satellite IDs
 *       - in: query
 *         name: processingLevels
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of processing levels
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: Band distribution data
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bandDistribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       band:
 *                         type: string
 *                       count:
 *                         type: integer
 *                       satelliteDistribution:
 *                         type: object
 *                         additionalProperties:
 *                           type: integer
 *                       processingLevelDistribution:
 *                         type: object
 *                         additionalProperties:
 *                           type: integer
 *                 totalBands:
 *                   type: integer
 *                 uniqueBands:
 *                   type: integer
 *                 cogCount:
 *                   type: integer
 *       500:
 *         description: Server error
 */
metadataRouter.get("/analytics/band-distribution", async (req: Request, res: Response) => {
  try {
    const {
      startDate,
      endDate,
      satelliteIds,
      processingLevels,
      showHidden = false
    } = req.query;

    // Build base query
    const query: any = {};

    // Add date range filter if provided
    if (startDate || endDate) {
      query.aquisition_datetime = {};

      if (startDate) {
        query.aquisition_datetime.$gte = new Date(startDate as string).getTime();
      }

      if (endDate) {
        query.aquisition_datetime.$lte = new Date(endDate as string).getTime();
      }
    }

    // Add satellite filter if provided
    if (satelliteIds) {
      const satIds = (satelliteIds as string).split(',').map(id => id.trim());
      if (satIds.length > 0) {
        query.satelliteId = { $in: satIds };
      }
    }

    // Add processing level filter if provided
    if (processingLevels) {
      const levels = (processingLevels as string).split(',').map(level => level.trim());
      if (levels.length > 0) {
        query.processingLevel = { $in: levels };
      }
    }

    // Handle visibility filter
    if (showHidden === 'false' || !showHidden) {
      // Get visible products
      const visibleProductsQuery: any = { isVisible: true };

      if (satelliteIds) {
        const satIds = (satelliteIds as string).split(',').map(id => id.trim());
        if (satIds.length > 0) {
          visibleProductsQuery.satelliteId = { $in: satIds };
        }
      }

      if (processingLevels) {
        const levels = (processingLevels as string).split(',').map(level => level.trim());
        if (levels.length > 0) {
          visibleProductsQuery.processingLevel = { $in: levels };
        }
      }

      const visibleProducts = await Product.find(visibleProductsQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    // Get COGs matching the criteria
    const cogs = await CogModel.find(query);

    if (cogs.length === 0) {
      return res.status(200).json({
        bandDistribution: [],
        totalBands: 0,
        uniqueBands: 0,
        cogCount: 0
      });
    }

    // Process band distribution
    const bandMap = new Map<string, any>();

    cogs.forEach(cog => {
      // Process COG type as a band
      if (cog.type) {
        if (!bandMap.has(cog.type)) {
          bandMap.set(cog.type, {
            band: cog.type,
            count: 0,
            satelliteDistribution: {},
            processingLevelDistribution: {}
          });
        }

        const typeEntry = bandMap.get(cog.type);
        typeEntry.count++;

        // Update satellite distribution
        if (!typeEntry.satelliteDistribution[cog.satelliteId]) {
          typeEntry.satelliteDistribution[cog.satelliteId] = 0;
        }
        typeEntry.satelliteDistribution[cog.satelliteId]++;

        // Update processing level distribution
        if (cog.processingLevel) {
          if (!typeEntry.processingLevelDistribution[cog.processingLevel]) {
            typeEntry.processingLevelDistribution[cog.processingLevel] = 0;
          }
          typeEntry.processingLevelDistribution[cog.processingLevel]++;
        }
      }

      // Process each band from bands array
      if (cog.bands && Array.isArray(cog.bands)) {
        cog.bands.forEach(band => {
          if (band.description) {
            const cleanBandName = band.description.replace(/^IMG_/, '');

            if (!bandMap.has(cleanBandName)) {
              bandMap.set(cleanBandName, {
                band: cleanBandName,
                count: 0,
                satelliteDistribution: {},
                processingLevelDistribution: {}
              });
            }

            const bandEntry = bandMap.get(cleanBandName);
            bandEntry.count++;

            // Update satellite distribution
            if (!bandEntry.satelliteDistribution[cog.satelliteId]) {
              bandEntry.satelliteDistribution[cog.satelliteId] = 0;
            }
            bandEntry.satelliteDistribution[cog.satelliteId]++;

            // Update processing level distribution
            if (cog.processingLevel) {
              if (!bandEntry.processingLevelDistribution[cog.processingLevel]) {
                bandEntry.processingLevelDistribution[cog.processingLevel] = 0;
              }
              bandEntry.processingLevelDistribution[cog.processingLevel]++;
            }
          }
        });
      }
    });

    // Convert map to array and sort by count (descending)
    const bandDistribution = Array.from(bandMap.values())
      .sort((a, b) => b.count - a.count);

    res.status(200).json({
      bandDistribution,
      totalBands: bandDistribution.reduce((sum, item) => sum + item.count, 0),
      uniqueBands: bandDistribution.length,
      cogCount: cogs.length
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /api/metadata/cog/search:
 *   post:
 *     summary: Advanced search for COGs with spatial filtering
 *     tags: [Metadata]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               satelliteIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of satellite IDs to filter by
 *               processingLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of processing levels to filter by
 *               productCodes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product codes to filter by
 *               timeRange:
 *                 type: object
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                   end:
 *                     type: string
 *                     format: date-time
 *               spatialFilter:
 *                 type: object
 *                 properties:
 *                   bbox:
 *                     type: array
 *                     items:
 *                       type: number
 *                     description: Bounding box [west, south, east, north]
 *                   point:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                       lon:
 *                         type: number
 *               types:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of COG types to filter by
 *               bands:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of band names to filter by
 *               showHidden:
 *                 type: boolean
 *                 description: Whether to include COGs from hidden products
 *               limit:
 *                 type: integer
 *                 description: Maximum number of COGs to return
 *               skip:
 *                 type: integer
 *                 description: Number of COGs to skip (for pagination)
 *               sortBy:
 *                 type: string
 *                 enum: [aquisition_datetime, createdAt, updatedAt]
 *                 description: Field to sort by
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *                 description: Sort order
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 cogs:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/COG'
 *                 totalCount:
 *                   type: integer
 *                 page:
 *                   type: integer
 *                 totalPages:
 *                   type: integer
 *       500:
 *         description: Server error
 */
metadataRouter.post("/cog/search", async (req: Request, res: Response) => {
  try {
    const {
      satelliteIds,
      processingLevels,
      productCodes,
      timeRange,
      spatialFilter,
      types,
      bands,
      showHidden = false,
      limit = 100,
      skip = 0,
      sortBy = "aquisition_datetime",
      sortOrder = "desc"
    } = req.body;

    // Build base query
    const query: any = {};

    // Add satellite filter
    if (satelliteIds && Array.isArray(satelliteIds) && satelliteIds.length > 0) {
      query.satelliteId = { $in: satelliteIds };
    }

    // Add processing level filter
    if (processingLevels && Array.isArray(processingLevels) && processingLevels.length > 0) {
      query.processingLevel = { $in: processingLevels };
    }

    // Add product code filter
    if (productCodes && Array.isArray(productCodes) && productCodes.length > 0) {
      query.productCode = { $in: productCodes };
    }

    // Add time range filter
    if (timeRange && timeRange.start && timeRange.end) {
      query.aquisition_datetime = {
        $gte: new Date(timeRange.start).getTime(),
        $lte: new Date(timeRange.end).getTime()
      };
    }

    // Add type filter
    if (types && Array.isArray(types) && types.length > 0) {
      query.type = { $in: types };
    }

    // Handle visibility filter
    if (!showHidden) {
      // Get visible products
      const visibleProductsQuery: any = { isVisible: true };

      if (satelliteIds && Array.isArray(satelliteIds) && satelliteIds.length > 0) {
        visibleProductsQuery.satelliteId = { $in: satelliteIds };
      }

      if (processingLevels && Array.isArray(processingLevels) && processingLevels.length > 0) {
        visibleProductsQuery.processingLevel = { $in: processingLevels };
      }

      if (productCodes && Array.isArray(productCodes) && productCodes.length > 0) {
        visibleProductsQuery.productId = { $in: productCodes };
      }

      const visibleProducts = await Product.find(visibleProductsQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    // Get all COGs that match the criteria so far (without spatial filtering)
    // This could be optimized further, but we need all COGs to filter by spatial criteria
    // and band information which isn't directly queryable at the MongoDB level
    const allMatchingCogs = await CogModel.find(query);

    // Filtering cogs by spatial criteria and bands
    let filteredCogs = allMatchingCogs;

    // Apply spatial filter if provided
    if (spatialFilter) {
      filteredCogs = filteredCogs.filter(cog => {
        // Skip if no corner coordinates
        if (!cog.cornerCoords) return false;

        // Extract coordinates
        const lats: number[] = [];
        const lons: number[] = [];

        if (cog.cornerCoords.upperLeft && cog.cornerCoords.lowerRight) {
          // Take corner coordinates as any type to avoid TypeScript errors
          const upperLeft = cog.cornerCoords.upperLeft as any;
          const upperRight = cog.cornerCoords.upperRight as any;
          const lowerLeft = cog.cornerCoords.lowerLeft as any;
          const lowerRight = cog.cornerCoords.lowerRight as any;

          if (upperLeft.lat) lats.push(upperLeft.lat);
          if (upperLeft.lon) lons.push(upperLeft.lon);
          if (upperRight && upperRight.lat) lats.push(upperRight.lat);
          if (upperRight && upperRight.lon) lons.push(upperRight.lon);
          if (lowerLeft && lowerLeft.lat) lats.push(lowerLeft.lat);
          if (lowerLeft && lowerLeft.lon) lons.push(lowerLeft.lon);
          if (lowerRight.lat) lats.push(lowerRight.lat);
          if (lowerRight.lon) lons.push(lowerRight.lon);

        }

        if (lats.length === 0 || lons.length === 0) return false;

        // Calculate bounds of this COG
        const cogNorth = Math.max(...lats);
        const cogSouth = Math.min(...lats);
        const cogEast = Math.max(...lons);
        const cogWest = Math.min(...lons);

        // Check if bbox intersects with COG bounds
        if (spatialFilter.bbox && spatialFilter.bbox.length === 4) {
          const [west, south, east, north] = spatialFilter.bbox;

          // Check if boxes overlap
          return !(cogWest > east || cogEast < west || cogSouth > north || cogNorth < south);
        }

        // Check if point is inside COG bounds
        if (spatialFilter.point && spatialFilter.point.lat && spatialFilter.point.lon) {
          const { lat, lon } = spatialFilter.point;

          return lat <= cogNorth && lat >= cogSouth && lon >= cogWest && lon <= cogEast;
        }

        return true;
      });
    }

    // Apply band filter if provided
    if (bands && Array.isArray(bands) && bands.length > 0) {
      filteredCogs = filteredCogs.filter(cog => {
        // Check if any of the requested bands are in this COG

        // First check if the COG type matches any requested band
        if (bands.includes(cog.type)) {
          return true;
        }

        // Then check bands array
        if (cog.bands && Array.isArray(cog.bands)) {
          return cog.bands.some(band => {
            if (band.description) {
              const cleanBandName = band.description.replace(/^IMG_/, '');
              return bands.includes(cleanBandName);
            }
            return false;
          });
        }

        return false;
      });
    }

    // Count total for pagination
    const totalCount = filteredCogs.length;

    // Sort the results
    const sortMultiplier = sortOrder === 'asc' ? 1 : -1;
    filteredCogs.sort((a: any, b: any) => {
      return (a[sortBy] > b[sortBy] ? 1 : -1) * sortMultiplier;
    });

    // Apply pagination
    const paginatedCogs = filteredCogs.slice(skip, skip + limit);

    // Calculate pagination info
    const totalPages = Math.ceil(totalCount / limit);
    const currentPage = Math.floor(skip / limit) + 1;

    res.status(200).json({
      cogs: paginatedCogs,
      totalCount,
      page: currentPage,
      totalPages
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

/**
 * @swagger
 * /api/metadata/{satId}/products-with-latest-cogs:
 *   get:
 *     summary: Get products list for a specific satellite
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
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of products for the satellite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       _id:
 *                         type: string
 *                       productId:
 *                         type: string
 *                       satelliteId:
 *                         type: string
 *                       processingLevel:
 *                         type: string
 *                       isVisible:
 *                         type: boolean
 *                       cogCount:
 *                         type: integer
 *                       latestCog:
 *                         type: object
 *                       bandTypes:
 *                         type: array
 *                         items:
 *                           type: string
 *       500:
 *         description: Server error
 */
metadataRouter.get(
  "/:satId/products-with-latest-cogs",
  async (req: Request, res: Response) => {
    try {
      const satId = req.params.satId;
      const { processingLevel, showHidden } = req.query;

      // Build query for products
      const query: any = {
        satelliteId: satId,
      };

      // Add processing level filter if provided
      if (processingLevel) {
        query.processingLevel = processingLevel;
      }

      // Add visibility filter unless showHidden is true
      if (showHidden !== 'true') {
        query.isVisible = true;
      }

      // Get products
      const products = await Product.find(query);

      // Enhance product data with additional information
      const enhancedProducts = await Promise.all(products.map(async (product) => {
        // Get count of COGs for this product
        const cogCount = await CogModel.countDocuments({ product: product._id });

        // Get the latest COG for this product
        const latestCog = await CogModel.findOne({ product: product._id })
          .sort({ aquisition_datetime: -1 })
          .limit(1);

        // Get distinct band types for this product
        const cogs = await CogModel.find({ product: product._id });
        const bandTypes = new Set<string>();

        cogs.forEach(cog => {
          // Add COG type
          if (cog.type) {
            bandTypes.add(cog.type);
          }

          // Add band descriptions
          if (cog.bands && Array.isArray(cog.bands)) {
            cog.bands.forEach(band => {
              if (band.description) {
                const cleanBandName = band.description.replace(/^IMG_/, '');
                bandTypes.add(cleanBandName);
              }
            });
          }
        });

        return {
          _id: product._id,
          productId: product.productId,
          satelliteId: product.satelliteId,
          processingLevel: product.processingLevel,
          isVisible: product.isVisible,
          cogCount,
          latestCog,
          bandTypes: Array.from(bandTypes),
          latestAcquisition: latestCog ? convertFromTimestamp(latestCog.aquisition_datetime) : null,
        };
      }));

      res.status(200).json({
        products: enhancedProducts,
        count: enhancedProducts.length
      });
    } catch (error) {
      console.error(error);
      res.status(500).send("Something is wrong");
    }
  }
);


/**
 * @swagger
 * /api/metadata/comparative-analysis:
 *   post:
 *     summary: Compare satellite imagery metadata between two time periods
 *     tags: [Metadata]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               satelliteIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of satellite IDs to include in comparison
 *               firstPeriod:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                     description: Start of first time period (ISO format)
 *                   end:
 *                     type: string
 *                     format: date-time
 *                     description: End of first time period (ISO format)
 *               secondPeriod:
 *                 type: object
 *                 required: true
 *                 properties:
 *                   start:
 *                     type: string
 *                     format: date-time
 *                     description: Start of second time period (ISO format)
 *                   end:
 *                     type: string
 *                     format: date-time
 *                     description: End of second time period (ISO format)
 *               processingLevels:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Processing levels to include in comparison
 *               bandTypes:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Band types to include in comparison
 *               region:
 *                 type: object
 *                 properties:
 *                   bbox:
 *                     type: array
 *                     items:
 *                       type: number
 *                     description: Bounding box [west, south, east, north] to limit comparison
 *               metrics:
 *                 type: array
 *                 items:
 *                   type: string
 *                   enum: [count, coverage, file_size, acquisition_frequency, temporal_distribution]
 *                 description: Metrics to include in the comparison
 *               showHidden:
 *                 type: boolean
 *                 description: Whether to include hidden products
 *     responses:
 *       200:
 *         description: Comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 firstPeriod:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                     satellites:
 *                       type: object
 *                 secondPeriod:
 *                   type: object
 *                   properties:
 *                     metrics:
 *                       type: object
 *                     satellites:
 *                       type: object
 *                 comparison:
 *                   type: object
 *                   description: Percentage changes and statistical comparisons
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
metadataRouter.post("/comparative-analysis", async (req: Request, res: Response) => {
  try {
    const {
      satelliteIds,
      firstPeriod,
      secondPeriod,
      processingLevels,
      bandTypes,
      region,
      metrics = ['count', 'coverage', 'file_size', 'acquisition_frequency'],
      showHidden = false
    } = req.body;

    // Validate required parameters
    if (!firstPeriod || !secondPeriod || !firstPeriod.start || !firstPeriod.end || !secondPeriod.start || !secondPeriod.end) {
      return res.status(400).json({ message: "Both time periods with start and end dates are required" });
    }

    // Parse period dates
    const firstStart = new Date(firstPeriod.start).getTime();
    const firstEnd = new Date(firstPeriod.end).getTime();
    const secondStart = new Date(secondPeriod.start).getTime();
    const secondEnd = new Date(secondPeriod.end).getTime();

    if (isNaN(firstStart) || isNaN(firstEnd) || isNaN(secondStart) || isNaN(secondEnd)) {
      return res.status(400).json({ message: "Invalid date format" });
    }

    // Function to build query for a time period
    const buildQuery = (startTime: number, endTime: number) => {
      const query: any = {
        aquisition_datetime: {
          $gte: startTime,
          $lte: endTime
        }
      };

      // Add satellite filter if provided
      if (satelliteIds && Array.isArray(satelliteIds) && satelliteIds.length > 0) {
        query.satelliteId = { $in: satelliteIds };
      }

      // Add processing level filter if provided
      if (processingLevels && Array.isArray(processingLevels) && processingLevels.length > 0) {
        query.processingLevel = { $in: processingLevels };
      }

      // Handle visibility filter
      if (!showHidden) {
        // We'll handle this with a separate query to get visible product IDs
        // and then filter COGs based on those products
      }

      return query;
    };

    // Build queries for both periods
    const firstPeriodQuery = buildQuery(firstStart, firstEnd);
    const secondPeriodQuery = buildQuery(secondStart, secondEnd);

    // If not showing hidden products, get visible product IDs to filter with
    if (!showHidden) {
      const visibleProductsQuery: any = { isVisible: true };

      if (satelliteIds && Array.isArray(satelliteIds) && satelliteIds.length > 0) {
        visibleProductsQuery.satelliteId = { $in: satelliteIds };
      }

      if (processingLevels && Array.isArray(processingLevels) && processingLevels.length > 0) {
        visibleProductsQuery.processingLevel = { $in: processingLevels };
      }

      const visibleProducts = await Product.find(visibleProductsQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      firstPeriodQuery.product = { $in: visibleProductIds };
      secondPeriodQuery.product = { $in: visibleProductIds };
    }

    // Get COGs for both periods
    const firstPeriodCogs = await CogModel.find(firstPeriodQuery);
    const secondPeriodCogs = await CogModel.find(secondPeriodQuery);

    // Filter by band types if specified
    const filterByBandTypes = (cogs: any[]) => {
      if (!bandTypes || !Array.isArray(bandTypes) || bandTypes.length === 0) {
        return cogs;
      }

      return cogs.filter(cog => {
        // Check if COG type matches any requested band type
        if (cog.type && bandTypes.includes(cog.type)) {
          return true;
        }

        // Check bands array
        if (cog.bands && Array.isArray(cog.bands)) {
          return cog.bands.some((band: any) => {
            if (band.description) {
              const cleanBandName = band.description.replace(/^IMG_/, '');
              return bandTypes.includes(cleanBandName);
            }
            return false;
          });
        }

        return false;
      });
    };

    // Apply band type filtering
    const filteredFirstPeriodCogs = filterByBandTypes(firstPeriodCogs);
    const filteredSecondPeriodCogs = filterByBandTypes(secondPeriodCogs);

    // Apply spatial filtering if region is specified
    const filterByRegion = (cogs: any[]) => {
      if (!region || !region.bbox || !Array.isArray(region.bbox) || region.bbox.length !== 4) {
        return cogs;
      }

      const [west, south, east, north] = region.bbox;

      return cogs.filter(cog => {
        // Skip if no corner coordinates
        if (!cog.cornerCoords) return false;

        // Extract coordinates
        const lats: number[] = [];
        const lons: number[] = [];

        if (cog.cornerCoords.upperLeft && cog.cornerCoords.lowerRight) {
          const upperLeft = cog.cornerCoords.upperLeft as any;
          const upperRight = cog.cornerCoords.upperRight as any;
          const lowerLeft = cog.cornerCoords.lowerLeft as any;
          const lowerRight = cog.cornerCoords.lowerRight as any;

          if (upperLeft.lat) lats.push(upperLeft.lat);
          if (upperLeft.lon) lons.push(upperLeft.lon);
          if (upperRight && upperRight.lat) lats.push(upperRight.lat);
          if (upperRight && upperRight.lon) lons.push(upperRight.lon);
          if (lowerLeft && lowerLeft.lat) lats.push(lowerLeft.lat);
          if (lowerLeft && lowerLeft.lon) lons.push(lowerLeft.lon);
          if (lowerRight.lat) lats.push(lowerRight.lat);
          if (lowerRight.lon) lons.push(lowerRight.lon);
        }

        if (lats.length === 0 || lons.length === 0) return false;

        // Calculate bounds of this COG
        const cogNorth = Math.max(...lats);
        const cogSouth = Math.min(...lats);
        const cogEast = Math.max(...lons);
        const cogWest = Math.min(...lons);

        // Check if bbox intersects with COG bounds
        return !(cogWest > east || cogEast < west || cogSouth > north || cogNorth < south);
      });
    };

    // Apply spatial filtering
    const finalFirstPeriodCogs = filterByRegion(filteredFirstPeriodCogs);
    const finalSecondPeriodCogs = filterByRegion(filteredSecondPeriodCogs);

    // Calculate metrics for first period
    const firstPeriodMetrics: any = {
      count: finalFirstPeriodCogs.length,
      satellites: {},
      processingLevels: {},
      bandTypes: {},

      temporalDistribution: {},
    };

    // Calculate metrics for second period
    const secondPeriodMetrics: any = {
      count: finalSecondPeriodCogs.length,
      satellites: {},
      processingLevels: {},
      bandTypes: {},
      temporalDistribution: {},
    };

    // Calculate detailed metrics for each period
    const calculateDetailedMetrics = (cogs: any[], metrics: any, periodLengthMs: number) => {
      // Count by satellite
      cogs.forEach(cog => {
        // Satellite counts
        metrics.satellites[cog.satelliteId] = (metrics.satellites[cog.satelliteId] || 0) + 1;

        // Processing level counts
        if (cog.processingLevel) {
          metrics.processingLevels[cog.processingLevel] = (metrics.processingLevels[cog.processingLevel] || 0) + 1;
        }

        // Band type counts
        if (cog.type) {
          metrics.bandTypes[cog.type] = (metrics.bandTypes[cog.type] || 0) + 1;
        }


        // Temporal distribution (by day)
        if (cog.aquisition_datetime) {
          const dateKey = new Date(cog.aquisition_datetime).toISOString().split('T')[0];
          metrics.temporalDistribution[dateKey] = (metrics.temporalDistribution[dateKey] || 0) + 1;
        }

      });


      // Calculate acquisition frequency (acquisitions per day)
      const periodDays = periodLengthMs / (24 * 60 * 60 * 1000);
      metrics.acquisitionFrequency = periodDays > 0 ? metrics.count / periodDays : 0;

      // Sort temporal distribution
      metrics.temporalDistribution = Object.entries(metrics.temporalDistribution)
        .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
        .reduce<Record<string, any>>((obj, [key, value]) => {
          obj[key] = value;
          return obj;
        }, {});
    };

    // Calculate period lengths in milliseconds
    const firstPeriodLength = firstEnd - firstStart;
    const secondPeriodLength = secondEnd - secondStart;

    // Calculate detailed metrics for both periods
    calculateDetailedMetrics(finalFirstPeriodCogs, firstPeriodMetrics, firstPeriodLength);
    calculateDetailedMetrics(finalSecondPeriodCogs, secondPeriodMetrics, secondPeriodLength);

    // Calculate comparison metrics (percent changes)
    const comparison: any = {
      countChange: calculatePercentChange(firstPeriodMetrics.count, secondPeriodMetrics.count),
      acquisitionFrequencyChange: calculatePercentChange(
        firstPeriodMetrics.acquisitionFrequency,
        secondPeriodMetrics.acquisitionFrequency
      ),


      satellites: {},
      processingLevels: {},
      bandTypes: {}
    };

    // Compare satellites
    const allSatelliteIds = new Set([
      ...Object.keys(firstPeriodMetrics.satellites),
      ...Object.keys(secondPeriodMetrics.satellites)
    ]);

    allSatelliteIds.forEach(id => {
      comparison.satellites[id] = calculatePercentChange(
        firstPeriodMetrics.satellites[id] || 0,
        secondPeriodMetrics.satellites[id] || 0
      );
    });

    // Compare processing levels
    const allProcessingLevels = new Set([
      ...Object.keys(firstPeriodMetrics.processingLevels),
      ...Object.keys(secondPeriodMetrics.processingLevels)
    ]);

    allProcessingLevels.forEach(level => {
      comparison.processingLevels[level] = calculatePercentChange(
        firstPeriodMetrics.processingLevels[level] || 0,
        secondPeriodMetrics.processingLevels[level] || 0
      );
    });

    // Compare band types
    const allBandTypes = new Set([
      ...Object.keys(firstPeriodMetrics.bandTypes),
      ...Object.keys(secondPeriodMetrics.bandTypes)
    ]);

    allBandTypes.forEach(type => {
      comparison.bandTypes[type] = calculatePercentChange(
        firstPeriodMetrics.bandTypes[type] || 0,
        secondPeriodMetrics.bandTypes[type] || 0
      );
    });

    res.status(200).json({
      firstPeriod: {
        start: new Date(firstStart).toISOString(),
        end: new Date(firstEnd).toISOString(),
        metrics: firstPeriodMetrics
      },
      secondPeriod: {
        start: new Date(secondStart).toISOString(),
        end: new Date(secondEnd).toISOString(),
        metrics: secondPeriodMetrics
      },
      comparison
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});

// Helper function to calculate percent change
function calculatePercentChange(oldValue: number, newValue: number): number {
  if (oldValue === 0) {
    return newValue === 0 ? 0 : 100; // If old value is 0, and new value is not, that's a 100% increase
  }
  return ((newValue - oldValue) / Math.abs(oldValue)) * 100;
}

/**
 * @swagger
 * /api/metadata/geographic-coverage:
 *   get:
 *     summary: Get geographic coverage statistics for satellite imagery
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: satelliteIds
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of satellite IDs
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date (ISO format)
 *       - in: query
 *         name: processingLevels
 *         schema:
 *           type: string
 *         required: false
 *         description: Comma-separated list of processing levels
 *       - in: query
 *         name: gridSize
 *         schema:
 *           type: number
 *         required: false
 *         description: Size of grid cells in degrees (default is 1.0)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include COGs from hidden products
 *     responses:
 *       200:
 *         description: Geographic coverage statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 bounds:
 *                   type: object
 *                   properties:
 *                     north:
 *                       type: number
 *                     south:
 *                       type: number
 *                     east:
 *                       type: number
 *                     west:
 *                       type: number
 *                 coverage:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       lat:
 *                         type: number
 *                       lon:
 *                         type: number
 *                       count:
 *                         type: number
 *                       latest:
 *                         type: string
 *                         format: date-time
 *                 totalImageCount:
 *                   type: integer
 *                 coveragePercent:
 *                   type: number
 *                 satelliteCoverage:
 *                   type: object
 *                   additionalProperties:
 *                     type: object
 *       400:
 *         description: Invalid request parameters
 *       500:
 *         description: Server error
 */
metadataRouter.get("/geographic-coverage", async (req: Request, res: Response) => {
  try {
    const {
      satelliteIds,
      startDate,
      endDate,
      processingLevels,
      gridSize = 1.0,
      showHidden = false
    } = req.query;

    // Build base query
    const query: any = {};

    // Add time range filter if provided
    if (startDate || endDate) {
      query.aquisition_datetime = {};

      if (startDate) {
        query.aquisition_datetime.$gte = new Date(startDate as string).getTime();
      }

      if (endDate) {
        query.aquisition_datetime.$lte = new Date(endDate as string).getTime();
      }
    }

    // Add satellite filter if provided
    if (satelliteIds) {
      const satIds = (satelliteIds as string).split(',').map(id => id.trim());
      if (satIds.length > 0) {
        query.satelliteId = { $in: satIds };
      }
    }

    // Add processing level filter if provided
    if (processingLevels) {
      const levels = (processingLevels as string).split(',').map(level => level.trim());
      if (levels.length > 0) {
        query.processingLevel = { $in: levels };
      }
    }

    // Handle visibility filter
    if (showHidden !== 'true') {
      // Get visible products
      const visibleProductsQuery: any = { isVisible: true };

      if (satelliteIds) {
        const satIds = (satelliteIds as string).split(',').map(id => id.trim());
        if (satIds.length > 0) {
          visibleProductsQuery.satelliteId = { $in: satIds };
        }
      }

      if (processingLevels) {
        const levels = (processingLevels as string).split(',').map(level => level.trim());
        if (levels.length > 0) {
          visibleProductsQuery.processingLevel = { $in: levels };
        }
      }

      const visibleProducts = await Product.find(visibleProductsQuery);
      const visibleProductIds = visibleProducts.map(product => product._id);

      // Add filter for visible products
      query.product = { $in: visibleProductIds };
    }

    // Get COGs matching the criteria
    const cogs = await CogModel.find(query);

    if (cogs.length === 0) {
      return res.status(200).json({
        bounds: { north: 0, south: 0, east: 0, west: 0 },
        coverage: [],
        totalImageCount: 0,
        coveragePercent: 0,
        satelliteCoverage: {}
      });
    }

    // Initialize bounds and coverage grid
    const bounds = {
      north: -90,
      south: 90,
      east: -180,
      west: 180
    };

    const grid = new Map<string, { lat: number, lon: number, count: number, latest: number, satellites: Set<string> }>();
    const satelliteCoverage: Record<string, Set<string>> = {};
    const gridSize_num = parseFloat(gridSize as string) || 1.0;

    // Process COGs to build coverage grid
    cogs.forEach(cog => {
      // Skip if no corner coordinates
      if (!cog.cornerCoords) return;

      // Extract coordinates
      const lats: number[] = [];
      const lons: number[] = [];

      if (cog.cornerCoords.upperLeft && cog.cornerCoords.lowerRight) {
        const upperLeft = cog.cornerCoords.upperLeft as any;
        const upperRight = cog.cornerCoords.upperRight as any;
        const lowerLeft = cog.cornerCoords.lowerLeft as any;
        const lowerRight = cog.cornerCoords.lowerRight as any;

        if (upperLeft.lat) lats.push(upperLeft.lat);
        if (upperLeft.lon) lons.push(upperLeft.lon);
        if (upperRight && upperRight.lat) lats.push(upperRight.lat);
        if (upperRight && upperRight.lon) lons.push(upperRight.lon);
        if (lowerLeft && lowerLeft.lat) lats.push(lowerLeft.lat);
        if (lowerLeft && lowerLeft.lon) lons.push(lowerLeft.lon);
        if (lowerRight.lat) lats.push(lowerRight.lat);
        if (lowerRight.lon) lons.push(lowerRight.lon);
      }

      if (lats.length === 0 || lons.length === 0) return;

      // Calculate bounds of this COG
      const cogNorth = Math.max(...lats);
      const cogSouth = Math.min(...lats);
      const cogEast = Math.max(...lons);
      const cogWest = Math.min(...lons);

      // Update overall bounds
      bounds.north = Math.max(bounds.north, cogNorth);
      bounds.south = Math.min(bounds.south, cogSouth);
      bounds.east = Math.max(bounds.east, cogEast);
      bounds.west = Math.min(bounds.west, cogWest);

      // Add grid cells for this COG's coverage
      for (let lat = Math.floor(cogSouth / gridSize_num) * gridSize_num; lat <= cogNorth; lat += gridSize_num) {
        for (let lon = Math.floor(cogWest / gridSize_num) * gridSize_num; lon <= cogEast; lon += gridSize_num) {
          // Round to grid size precision to avoid floating point issues
          const gridLat = Math.round(lat / gridSize_num) * gridSize_num;
          const gridLon = Math.round(lon / gridSize_num) * gridSize_num;
          const gridKey = `${gridLat.toFixed(6)},${gridLon.toFixed(6)}`;

          if (!grid.has(gridKey)) {
            grid.set(gridKey, {
              lat: gridLat,
              lon: gridLon,
              count: 0,
              latest: 0,
              satellites: new Set()
            });
          }

          const cell = grid.get(gridKey)!;
          cell.count++;
          cell.satellites.add(cog.satelliteId);

          if (cog.aquisition_datetime > cell.latest) {
            cell.latest = cog.aquisition_datetime;
          }

          // Track satellite coverage
          if (!satelliteCoverage[cog.satelliteId]) {
            satelliteCoverage[cog.satelliteId] = new Set();
          }
          satelliteCoverage[cog.satelliteId].add(gridKey);
        }
      }
    });

    // Convert grid to array and format for response
    const coverageArray = Array.from(grid.values()).map(cell => ({
      lat: cell.lat,
      lon: cell.lon,
      count: cell.count,
      latest: new Date(cell.latest).toISOString(),
      satellites: Array.from(cell.satellites)
    }));

    // Calculate total potential grid cells in bounds
    const latRange = Math.ceil((bounds.north - bounds.south) / gridSize_num);
    const lonRange = Math.ceil((bounds.east - bounds.west) / gridSize_num);
    const totalPotentialCells = latRange * lonRange;

    // Calculate coverage percentage
    const coveragePercent = totalPotentialCells > 0
      ? (grid.size / totalPotentialCells) * 100
      : 0;

    // Format satellite coverage for response
    const formattedSatelliteCoverage: Record<string, any> = {};
    Object.entries(satelliteCoverage).forEach(([satId, gridKeys]) => {
      formattedSatelliteCoverage[satId] = {
        gridCellCount: gridKeys.size,
        coveragePercent: totalPotentialCells > 0
          ? (gridKeys.size / totalPotentialCells) * 100
          : 0
      };
    });

    res.status(200).json({
      bounds,
      coverage: coverageArray,
      totalImageCount: cogs.length,
      coveragePercent,
      satelliteCoverage: formattedSatelliteCoverage,
      gridParams: {
        gridSize: gridSize_num,
        totalPotentialCells,
        coveredCells: grid.size
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Something went wrong");
  }
});


// create a route to delete all cogs before the datetime
/**
 * @swagger
 * /api/metadata/delete-cogs-before:
 *   delete:
 *     summary: Delete COGs before a specific date
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: date
 *         schema:
 *           type: string
 *           format: date-time
 *         required: true
 *         description: Date in ISO format (e.g., 2023-01-01T00:00:00Z)
 *     responses:
 *       200:
 *         description: COGs deleted successfully
 *       400:
 *         description: Invalid date format
 *       500:
 *         description: Server error
 */
metadataRouter.delete('/delete-cogs-before', async (req, res) => {
  const { date } = req.query;


  if (!date || isNaN(Date.parse(date as string))) {
    return res.status(400).send("Invalid date format");
  }

  try {
    const cutoffDate = new Date(date as string);
    const cutoffTimestamp = cutoffDate.getTime();
    // Find all COGs before the cutoff date
    const cogsToDelete = await CogModel.find({ aquisition_datetime: { $lt: cutoffTimestamp } });
    if (cogsToDelete.length === 0) {
      return res.status(404).send("No COGs found before the specified date");
    }
    // Delete the COGs
    await CogModel.deleteMany({ aquisition_datetime: { $lt: cutoffTimestamp } });
    // Optionally, you can delete from the assosiated product.cogs field
    await Product.updateMany(
      { cogs: { $in: cogsToDelete.map(cog => cog._id) } },
      { $pull: { cogs: { $in: cogsToDelete.map(cog => cog._id) } } }
    );


    res.status(200).send(`${cogsToDelete.length} COGs deleted successfully`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});


// delete specific like before 1 day, before 2 months, before 3 years - configurable

/**
 * @swagger
 * /api/metadata/delete-cogs:
 *   delete:
 *     summary: Delete COGs older than a specified time period
 *     tags: [Metadata]
 *     parameters:
 *       - in: query
 *         name: days
 *         schema:
 *           type: integer
 *         description: Number of days to delete COGs older than
 *       - in: query
 *         name: months
 *         schema:
 *           type: integer
 *         description: Number of months to delete COGs older than
 *       - in: query
 *         name: years
 *         schema:
 *           type: integer
 *         description: Number of years to delete COGs older than
 *     responses:
 *       200:
 *         description: COGs deleted successfully
 *       400:
 *         description: Invalid time period or format
 *       404:
 *         description: No COGs found to delete
 *       500:
 *         description: Server error
 */

metadataRouter.delete('/delete-cogs', async (req, res) => {
  const { days, months, years } = req.query;

  try {
    const now = new Date();
    let cutoffDate: Date;

    if (days) {
      cutoffDate = new Date(now.getTime() - parseInt(days as string) * 24 * 60 * 60 * 1000);
    } else if (months) {
      cutoffDate = new Date(now.getFullYear(), now.getMonth() - parseInt(months as string), now.getDate());
    } else if (years) {
      cutoffDate = new Date(now.getFullYear() - parseInt(years as string), now.getMonth(), now.getDate());
    } else {
      return res.status(400).send("Please provide a valid time period (days, months, or years)");
    }

    const cutoffTimestamp = cutoffDate.getTime();

    // Find all COGs before the cutoff date
    const cogsToDelete = await CogModel.find({ aquisition_datetime: { $lt: cutoffTimestamp } });
    if (cogsToDelete.length === 0) {
      return res.status(404).send("No COGs found before the specified date");
    }

    // Delete the COGs
    await CogModel.deleteMany({ aquisition_datetime: { $lt: cutoffTimestamp } });

    // Optionally, you can delete from the associated product.cogs field
    await Product.updateMany(
      { cogs: { $in: cogsToDelete.map(cog => cog._id) } },
      { $pull: { cogs: { $in: cogsToDelete.map(cog => cog._id) } } }
    );

    res.status(200).send(`${cogsToDelete.length} COGs deleted successfully`);
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
});



export default metadataRouter;
