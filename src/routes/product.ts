import express, { Request, Response } from "express";
import Product from "../models/ProductModel";
import COG from "../models/CogModel";
import SatelliteModel from "../models/SatelliteModel";

const productRouter = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Product:
 *       type: object
 *       required:
 *         - productId
 *         - satelliteId
 *         - processingLevel
 *       properties:
 *         _id:
 *           type: string
 *           description: Auto-generated MongoDB ID
 *         productId:
 *           type: string
 *           description: The unique identifier for the product
 *         satelliteId:
 *           type: string
 *           description: The satellite identifier associated with this product
 *         processingLevel:
 *           type: string
 *           description: Processing level (e.g., L1B, L1C, L2A)
 *         cogs:
 *           type: array
 *           items:
 *             type: string
 *           description: References to COG IDs associated with this product
 *         isVisible:
 *           type: boolean
 *           description: Flag indicating if the product is visible
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the product was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the product was last updated
 */

/**
 * @swagger
 * /api/product/{satId}/processing-levels:
 *   get:
 *     summary: Get all available processing levels for a satellite
 *     tags: [Products]
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
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of available processing levels
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 processingLevels:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
productRouter.get("/:satId/processing-levels", async (req: Request, res: Response) => {
    try {
        const satId = req.params.satId;
        const showHidden = req.query.showHidden === 'true';

        // Find all products for this satellite
        const query: any = { satelliteId: satId };

        // Filter by visibility unless showHidden is true
        if (!showHidden) {
            query.isVisible = true;
        }

        const products = await Product.find(query);

        // Extract unique processing levels
        const processingLevels = [...new Set(products.map(product => product.processingLevel))];

        res.status(200).json({
            processingLevels
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/{satId}/{processingLevel}/product-codes:
 *   get:
 *     summary: Get all product codes for a satellite and processing level
 *     tags: [Products]
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
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of product codes
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 productCodes:
 *                   type: array
 *                   items:
 *                     type: string
 *       500:
 *         description: Server error
 */
productRouter.get("/:satId/:processingLevel/product-codes", async (req: Request, res: Response) => {
    try {
        const satId = req.params.satId;
        const processingLevel = req.params.processingLevel;
        const showHidden = req.query.showHidden === 'true';

        // First get products for this satellite and processing level (filtered by visibility)
        const productQuery: any = {
            satelliteId: satId,
            processingLevel: processingLevel
        };

        // Filter by visibility unless showHidden is true
        if (!showHidden) {
            productQuery.isVisible = true;
        }

        const products = await Product.find(productQuery);

        // Get the product IDs
        const productIds = products.map(product => product.productId);

        // Find all COGs for these products
        const cogs = await COG.find({
            satelliteId: satId,
            processingLevel: processingLevel,
            productCode: { $in: productIds }
        });

        // Extract unique product codes
        const productCodes = [...new Set(cogs.map(cog => cog.productCode))];

        res.status(200).json({
            productCodes
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/{satId}/products:
 *   get:
 *     summary: Get all products for a satellite
 *     tags: [Products]
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
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 */
productRouter.get("/:satId/products", async (req: Request, res: Response) => {
    try {
        const satId = req.params.satId;
        const { processingLevel } = req.query;
        const showHidden = req.query.showHidden === 'true';

        const query: any = { satelliteId: satId };

        if (processingLevel) {
            query.processingLevel = processingLevel;
        }

        // Filter by visibility unless showHidden is true
        if (!showHidden) {
            query.isVisible = true;
        }

        const products = await Product.find(query);

        res.status(200).json({
            products
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/{productId}:
 *   get:
 *     summary: Get a product by its ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
productRouter.get("/:productId", async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findOne({ productId: productId });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            product
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});


/**
 * @swagger
 * /api/product:
 *   post:
 *     summary: Create a new product
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       201:
 *         description: Product created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       500:
 *         description: Server error
 */
productRouter.post("/", async (req: Request, res: Response) => {
    try {
        const { productId, satelliteId, processingLevel } = req.body;
        const newProduct = new Product({
            productId,
            satelliteId,
            processingLevel,
            cogs: []
        });
        const savedProduct = await newProduct.save();
        res.status(201).json({
            message: "Product created successfully!",
            product: savedProduct
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: "Server error" });
    }
});

/**
 * @swagger
 * /api/product/{productId}:
 *   delete:
 *     summary: Delete a product by its ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product deleted successfully
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
productRouter.delete("/:productId", async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findOneAndDelete({ productId: productId });

        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Optionally, delete associated COGs
        await COG.deleteMany({ product: product._id });

        res.status(200).json({
            message: "Product deleted successfully!"
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/{productId}:
 *   put:
 *     summary: Update a product by its ID
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/Product'
 *     responses:
 *       200:
 *         description: Product updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Product'
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */

productRouter.put("/:productId", async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        const updatedProduct = await Product.findOneAndUpdate(
            { productId: productId },
            req.body,
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({
            message: "Product updated successfully!",
            product: updatedProduct
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/satellite/{satelliteId}:
 *   get:
 *     summary: Get all products for a satellite
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: satelliteId
 *         schema:
 *           type: string
 *         required: true
 *         description: The satellite ID (e.g., 3R)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: List of products
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Product'
 */

productRouter.get("/satellite/:satelliteId", async (req: Request, res: Response) => {
    try {
        const satelliteId = req.params.satelliteId;
        const showHidden = req.query.showHidden === 'true';

        const query: any = { satelliteId };

        // Filter by visibility unless showHidden is true
        if (!showHidden) {
            query.isVisible = true;
        }

        const products = await Product.find(query);
        if (!products || products.length === 0) {
            return res.status(404).json({ message: "No products found for this satellite" });
        }
        res.status(200).json({
            message: "Products retrieved successfully!",
            products
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/{productId}/toggle-visibility:
 *   patch:
 *     summary: Toggle the visibility of a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Product visibility toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 product:
 *                   $ref: '#/components/schemas/Product'
 *                 isVisible:
 *                   type: boolean
 *       404:
 *         description: Product not found
 *       500:
 *         description: Server error
 */
productRouter.patch("/:productId/toggle-visibility", async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Toggle the isVisible field
        product.isVisible = !product.isVisible;
        await product.save();

        res.status(200).json({
            message: `Product is now ${product.isVisible ? 'visible' : 'hidden'}`,
            product,
            isVisible: product.isVisible
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/batch/set-visibility:
 *   post:
 *     summary: Set visibility for multiple products
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *               - isVisible
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs to update
 *               isVisible:
 *                 type: boolean
 *                 description: Visibility state to set for all products
 *     responses:
 *       200:
 *         description: Products visibility updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 updatedCount:
 *                   type: number
 *       400:
 *         description: Invalid request - missing required fields
 *       500:
 *         description: Server error
 */
productRouter.post("/batch/set-visibility", async (req: Request, res: Response) => {
    try {
        const { productIds, isVisible } = req.body;

        if (!productIds || !Array.isArray(productIds) || typeof isVisible !== 'boolean') {
            return res.status(400).json({
                message: "Invalid request. Please provide productIds array and isVisible boolean"
            });
        }

        const result = await Product.updateMany(
            { productId: { $in: productIds } },
            { $set: { isVisible } }
        );

        res.status(200).json({
            message: `Updated visibility for ${result.modifiedCount} products`,
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});


/**
 * @swagger
 * /api/product/{productId}/satellite:
 *   get:
 *     summary: Get the satellite associated with a product
 *     tags: [Products]
 *     parameters:
 *       - in: path
 *         name: productId
 *         schema:
 *           type: string
 *         required: true
 *         description: The product ID
 *     responses:
 *       200:
 *         description: Satellite details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 satelliteId:
 *                   type: string
 *                   description: The satellite ID associated with the product
 *                 satelliteName:
 *                   type: string
 *                   description: The name of the satellite
 */

productRouter.get("/:productId/satellite", async (req: Request, res: Response) => {
    try {
        const productId = req.params.productId;

        const product = await Product.findOne({ productId: productId });
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        const satellite = await SatelliteModel.findOne({ satelliteId: product.satelliteId });
        if (!satellite) {
            return res.status(404).json({ message: "Satellite not found" });
        }
        res.status(200).json({
            satelliteId: satellite.satelliteId,
            satelliteName: satellite.name
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

export default productRouter;