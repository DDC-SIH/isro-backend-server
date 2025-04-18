import express, { Request, Response } from "express";
import Satellite from "../models/SatelliteModel";

const satelliteRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Satellite:
 *       type: object
 *       required:
 *         - satelliteId
 *         - name
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         satelliteId:
 *           type: string
 *           description: The unique identifier for the satellite
 *         name:
 *           type: string
 *           description: The name of the satellite
 *         description:
 *           type: string
 *           description: Detailed information about the satellite
 *         launchDate:
 *           type: string
 *           format: date
 *           description: Date when the satellite was launched
 *         products:
 *           type: array
 *           items:
 *             type: string
 *           description: References to product IDs associated with this satellite
 */

/**
 * @swagger
 * /api/satellite:
 *   post:
 *     summary: Create a new satellite
 *     tags: [Satellites]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Satellite'
 *     responses:
 *       201:
 *         description: Satellite created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 satellite:
 *                   $ref: '#/components/schemas/Satellite'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/satellite:
 *   get:
 *     summary: Get all satellites
 *     tags: [Satellites]
 *     responses:
 *       200:
 *         description: List of all satellites
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 satellites:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Satellite'
 *       500:
 *         description: Server error
 */
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

/**
 * @swagger
 * /api/satellite/{id}:
 *   get:
 *     summary: Get a satellite by ID
 *     tags: [Satellites]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *     responses:
 *       200:
 *         description: Satellite details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 satellite:
 *                   $ref: '#/components/schemas/Satellite'
 *       404:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
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



/**
 * @swagger
 * /api/satellite/{id}:
 *   delete:
 *     summary: Delete a satellite by ID
 *     tags: [Satellites]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *     responses:
 *       200:
 *         description: Satellite deleted successfully
 *       404:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
satelliteRouter.delete("/:id", async (req: Request, res: Response) => {
  try {
    const satellite = await Satellite.findOneAndDelete({ satelliteId: req.params.id });
    if (!satellite)
      return res.status(404).json({ error: "Satellite not found!" });
    res.status(200).json({ message: "Satellite deleted successfully!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
/**
 * @swagger
 * /api/satellite/{id}:
 *   put:
 *     summary: Update a satellite by ID
 *     tags: [Satellites]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Satellite'
 *     responses:
 *       200:
 *         description: Satellite updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 satellite:
 *                   $ref: '#/components/schemas/Satellite'
 *       404:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
satelliteRouter.put("/:id", async (req: Request, res: Response) => {
  try {
    const satellite = await Satellite.findOneAndUpdate(
      { satelliteId: req.params.id },
      req.body,
      { new: true }
    );
    if (!satellite)
      return res.status(404).json({ error: "Satellite not found!" });
    res
      .status(200)
      .json({ message: "Satellite updated successfully!", satellite });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
/**
 * @swagger
 * /api/satellite/{id}/products:
 *   get:
 *     summary: Get all products for a satellite by ID
 *     tags: [Satellites]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *     responses:
 *       200:
 *         description: List of products for the satellite
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 products:
 *                   type: array
 *                   items:
 *                     type: string
 *                   description: List of product IDs associated with the satellite
 *       404:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
satelliteRouter.get("/:id/products", async (req: Request, res: Response) => {
  try {
    const satellite = await Satellite.findOne({ satelliteId: req.params.id }).populate("products");
    if (!satellite)
      return res.status(404).json({ error: "Satellite not found!" });
    res
      .status(200)
      .json({ message: "Products fetched successfully!", products: satellite.products });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * @swagger
 * /api/satellite/{id}/products:
 *   post:
 *     summary: Add a product to a satellite by ID
 *     tags: [Satellites]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               productId:
 *                 type: string
 *                 description: The product ID to add to the satellite
 *     responses:
 *       200:
 *         description: Product added to the satellite successfully
 *       404:
 *         description: Satellite not found
 *       500:
 *         description: Server error
 */
satelliteRouter.post("/:id/products", async (req: Request, res: Response) => {
  try {
    const satellite = await Satellite.findOne({ satelliteId: req.params.id });
    if (!satellite)
      return res.status(404).json({ error: "Satellite not found!" });
    const productId = req.body.productId;
    if (!productId)
      return res.status(400).json({ error: "Product ID is required!" });
    if (satellite.products.includes(productId)) {
      return res.status(400).json({ error: "Product already exists!" });
    }
    satellite.products.push(productId);
    await satellite.save();
    res.status(200).json({ message: "Product added to satellite successfully!" });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});



export default satelliteRouter;
