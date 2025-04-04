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

metadataRouter.get("/cog/info/:id", async (req: Request, res: Response) => {
  try {
    const cog = await CogModel.findById(req.params.id);

    res.status(200).json(cog);
  } catch (error) {
    console.error(error);
    res.status(500).send("Something is wrong");
  }
});

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

// new applications
/**
 * Get a specific COG for a satellite
 *
 * Usage:
 * GET /:satId/cog/show
 *
 * Parameters:
 * - satId: Satellite ID in the URL path
 *
 * Query Parameters:
 * - datetime (optional): ISO date string to get the COG from a specific time
 * - type (optional): Filter by COG type
 *
 * Examples:
 * - GET /3R/cog/show                                      - Get latest COG for satellite 3R
 * - GET /3R/cog/show?datetime=2025-04-03T06:47:15.751Z    - Get COG for satellite 3R from specific date
 * - GET /3R/cog/show?type=VIS                             - Get latest thermal type COG for satellite 3R
 * - GET /3R/cog/show?processingLevel=L1B&datetime=2025-04-03T06:47:15.751Z&type=VIS - Get VIS COG for satellite 3R from specific date and processing level
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

// get available times from a date
/**
 * Get available times for a specific satellite
 * - /:satId/cog/available-times
 *
 * Query Parameters:
 * - date (optional): ISO date string to filter available times
 * - processingLevel (optional): Filter by processing level
 *
 * Examples:
 * - GET /3R/cog/available-times?date=2025-04-03&processingLevel=L1B - Get available times for satellite 3R on a specific date with processing level L1B
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

// get available dates
/**
 * Get available dates for a specific satellite
 * - /:satId/cog/available-dates
 *
 * Query Parameters:
 * - processingLevel (optional): Filter by processing level
 *
 * Examples:
 * - GET /3R/cog/available-dates?processingLevel=L1B - Get available dates for satellite 3R with processing level L1B
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
