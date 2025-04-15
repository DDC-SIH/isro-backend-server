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
 */

/**
 * @swagger
 * /api/metadata/test-add:
 *   post:
 *     summary: Test endpoint to add a product
 *     tags: [Metadata]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Test add successful
 *       500:
 *         description: Server error
 */
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
    // }
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
 *     responses:
 *       200:
 *         description: COG details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/COG'
 *       500:
 *         description: Server error
 */
metadataRouter.get("/cog/info/:id", async (req: Request, res: Response) => {
  try {
    const cog = await CogModel.findById(req.params.id);

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
    const { datetime, type, processingLevel } = req.query;

    const timestamp = datetime
      ? new Date(datetime as string).getTime()
      : undefined;

    const query: any = {
      satelliteId: satId,
      ...(processingLevel && { processingLevel: processingLevel }),
      ...(type && { type: type }),
    };

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
      const query: any = {
        satelliteId: satId,
        ...(processingLevel && { processingLevel: processingLevel }),
      };
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

export default metadataRouter;
