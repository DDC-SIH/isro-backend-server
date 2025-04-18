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

/**
 * @swagger
 * /api/product/advanced-search:
 *   post:
 *     summary: Advanced search for products based on multiple criteria
 *     tags: [Products]
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
 *               dateRange:
 *                 type: object
 *                 properties:
 *                   startDate:
 *                     type: string
 *                     format: date-time
 *                     description: Start date for filtering products by creation date
 *                   endDate:
 *                     type: string
 *                     format: date-time
 *                     description: End date for filtering products by creation date
 *               showHidden:
 *                 type: boolean
 *                 description: Whether to include hidden products (default is false)
 *               limit:
 *                 type: integer
 *                 description: Maximum number of products to return (default is 100)
 *               skip:
 *                 type: integer
 *                 description: Number of products to skip for pagination (default is 0)
 *               sortBy:
 *                 type: string
 *                 description: Field to sort by (e.g., createdAt, updatedAt)
 *               sortOrder:
 *                 type: string
 *                 enum: [asc, desc]
 *                 description: Sort order (asc or desc)
 *     responses:
 *       200:
 *         description: Search results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 totalCount:
 *                   type: integer
 *                   description: Total count of matching products
 *                 page:
 *                   type: integer
 *                   description: Current page
 *                 totalPages:
 *                   type: integer
 *                   description: Total number of pages
 *       500:
 *         description: Server error
 */
productRouter.post("/advanced-search", async (req: Request, res: Response) => {
    try {
        const {
            satelliteIds,
            processingLevels,
            productCodes,
            dateRange,
            showHidden = false,
            limit = 100,
            skip = 0,
            sortBy = "createdAt",
            sortOrder = "desc"
        } = req.body;

        // Build query
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
            query.productId = { $in: productCodes };
        }

        // Add date range filter
        if (dateRange && dateRange.startDate && dateRange.endDate) {
            query.createdAt = {
                $gte: new Date(dateRange.startDate),
                $lte: new Date(dateRange.endDate)
            };
        }

        // Add visibility filter unless showHidden is true
        if (!showHidden) {
            query.isVisible = true;
        }

        // Count total matching products
        const totalCount = await Product.countDocuments(query);

        // Calculate total pages
        const totalPages = Math.ceil(totalCount / limit);
        const currentPage = Math.floor(skip / limit) + 1;

        // Build sort options
        const sortOptions: any = {};
        sortOptions[sortBy] = sortOrder === "asc" ? 1 : -1;

        // Execute query with pagination and sorting
        const products = await Product.find(query)
            .sort(sortOptions)
            .skip(skip)
            .limit(limit);

        res.status(200).json({
            products,
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
 * /api/product/compare:
 *   post:
 *     summary: Compare multiple products
 *     tags: [Products]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - productIds
 *             properties:
 *               productIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Array of product IDs to compare
 *               includeHidden:
 *                 type: boolean
 *                 description: Whether to include hidden products in the comparison
 *               includeCogMetadata:
 *                 type: boolean
 *                 description: Whether to include COG metadata in the comparison
 *     responses:
 *       200:
 *         description: Comparison results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 products:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Product'
 *                 cogCounts:
 *                   type: object
 *                   additionalProperties:
 *                     type: integer
 *                 latestAcquisitions:
 *                   type: object
 *                   additionalProperties:
 *                     type: string
 *                     format: date-time
 *                 comparison:
 *                   type: object
 *                   properties:
 *                     commonBands:
 *                       type: array
 *                       items:
 *                         type: string
 *                     uniqueBands:
 *                       type: object
 *                       additionalProperties:
 *                         type: array
 *                         items:
 *                           type: string
 *       400:
 *         description: Invalid request - no product IDs provided
 *       500:
 *         description: Server error
 */
productRouter.post("/compare", async (req: Request, res: Response) => {
    try {
        const { productIds, includeHidden = false, includeCogMetadata = false } = req.body;

        if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
            return res.status(400).json({ error: "No product IDs provided for comparison" });
        }

        // Build query
        const query: any = {
            productId: { $in: productIds }
        };

        // Add visibility filter unless includeHidden is true
        if (!includeHidden) {
            query.isVisible = true;
        }

        // Get products
        const products = await Product.find(query);

        if (products.length === 0) {
            return res.status(404).json({ error: "No matching products found" });
        }

        // Get COG data for each product
        const productData = await Promise.all(products.map(async (product) => {
            const cogs = await COG.find({ product: product._id });

            // Extract unique bands from all COGs for this product
            const bands = new Set<string>();
            cogs.forEach(cog => {
                // Add COG type as a band
                if (cog.type) bands.add(cog.type);

                // Add all bands from the COG
                if (cog.bands && Array.isArray(cog.bands)) {
                    cog.bands.forEach(band => {
                        if (band.description) {
                            // Remove "IMG_" prefix if it exists
                            const cleanBandName = band.description.replace(/^IMG_/, '');
                            bands.add(cleanBandName);
                        }
                    });
                }
            });

            // Find latest acquisition date
            const latestCog = cogs.length > 0 ?
                cogs.reduce((latest, current) =>
                    current.aquisition_datetime > latest.aquisition_datetime ? current : latest
                    , cogs[0]) : null;

            return {
                productId: product.productId,
                cogCount: cogs.length,
                bands: Array.from(bands),
                latestAcquisition: latestCog ? new Date(latestCog.aquisition_datetime).toISOString() : null,
                cogMetadata: includeCogMetadata ? cogs.map(cog => ({
                    id: cog._id,
                    type: cog.type,
                    aquisition_datetime: cog.aquisition_datetime,
                    bands: cog.bands?.map(band => (band.description ? band.description.replace(/^IMG_/, '') : band.description
                    )) || []
                })) : undefined
            };
        }));

        // Find common bands across all products
        const allBandSets = productData.map(pd => new Set(pd.bands));
        const commonBands = [...allBandSets[0]].filter(band =>
            allBandSets.every(bandSet => bandSet.has(band))
        );

        // Find unique bands for each product
        const uniqueBands: Record<string, string[]> = {};
        productData.forEach(pd => {
            uniqueBands[pd.productId] = pd.bands.filter(band => !commonBands.includes(band));
        });

        // Build response with comparison data
        const cogCounts: Record<string, number> = {};
        const latestAcquisitions: Record<string, string | null> = {};

        productData.forEach(pd => {
            cogCounts[pd.productId] = pd.cogCount;
            latestAcquisitions[pd.productId] = pd.latestAcquisition;
        });

        res.status(200).json({
            products,
            cogCounts,
            latestAcquisitions,
            comparison: {
                commonBands,
                uniqueBands
            },
            cogMetadata: includeCogMetadata ?
                productData.reduce((acc, pd) => {
                    acc[pd.productId] = pd.cogMetadata;
                    return acc;
                }, {} as Record<string, any>) : undefined
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});

/**
 * @swagger
 * /api/product/analytics/temporal-distribution:
 *   get:
 *     summary: Get temporal distribution of COGs for products
 *     tags: [Products]
 *     parameters:
 *       - in: query
 *         name: satelliteId
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by satellite ID
 *       - in: query
 *         name: processingLevel
 *         schema:
 *           type: string
 *         required: false
 *         description: Filter by processing level
 *       - in: query
 *         name: startDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: Start date for the analysis period (ISO format)
 *       - in: query
 *         name: endDate
 *         schema:
 *           type: string
 *           format: date-time
 *         required: false
 *         description: End date for the analysis period (ISO format)
 *       - in: query
 *         name: interval
 *         schema:
 *           type: string
 *           enum: [hourly, daily, weekly, monthly]
 *         required: false
 *         description: Time interval for grouping (default is daily)
 *       - in: query
 *         name: showHidden
 *         schema:
 *           type: boolean
 *         required: false
 *         description: Whether to include hidden products (default is false)
 *     responses:
 *       200:
 *         description: Temporal distribution of COGs
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 distribution:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       interval:
 *                         type: string
 *                         format: date-time
 *                       count:
 *                         type: integer
 *                       processingLevels:
 *                         type: object
 *                         additionalProperties:
 *                           type: integer
 *                 total:
 *                   type: integer
 *       500:
 *         description: Server error
 */
productRouter.get("/analytics/temporal-distribution", async (req: Request, res: Response) => {
    try {
        const {
            satelliteId,
            processingLevel,
            startDate,
            endDate,
            interval = 'daily',
            showHidden = false
        } = req.query;

        // Build base query for COGs
        const cogQuery: any = {};

        // Add satellite filter if provided
        if (satelliteId) {
            cogQuery.satelliteId = satelliteId;
        }

        // Add processing level filter if provided
        if (processingLevel) {
            cogQuery.processingLevel = processingLevel;
        }

        // Add date range filter if provided
        if (startDate || endDate) {
            cogQuery.aquisition_datetime = {};

            if (startDate) {
                cogQuery.aquisition_datetime.$gte = new Date(startDate as string).getTime();
            }

            if (endDate) {
                cogQuery.aquisition_datetime.$lte = new Date(endDate as string).getTime();
            }
        }

        // Handle visibility filter
        if (showHidden === 'false' || !showHidden) {
            // Get visible products first
            const visibleProductsQuery: any = { isVisible: true };

            if (satelliteId) {
                visibleProductsQuery.satelliteId = satelliteId;
            }

            if (processingLevel) {
                visibleProductsQuery.processingLevel = processingLevel;
            }

            const visibleProducts = await Product.find(visibleProductsQuery);
            const visibleProductIds = visibleProducts.map(product => product._id);

            // Add filter for visible products to COG query
            cogQuery.product = { $in: visibleProductIds };
        }

        // Get all matching COGs
        const cogs = await COG.find(cogQuery);

        // Define grouping function based on interval
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
        const distributionMap = new Map<string, any>();

        cogs.forEach(cog => {
            const intervalKey = getIntervalKey(cog.aquisition_datetime);

            if (!distributionMap.has(intervalKey)) {
                distributionMap.set(intervalKey, {
                    interval: intervalKey,
                    count: 0,
                    processingLevels: {}
                });
            }

            const entry = distributionMap.get(intervalKey);
            entry.count++;

            // Count by processing level
            if (cog.processingLevel) {
                if (!entry.processingLevels[cog.processingLevel]) {
                    entry.processingLevels[cog.processingLevel] = 0;
                }
                entry.processingLevels[cog.processingLevel]++;
            }
        });

        // Convert map to array and sort by interval
        const distribution = Array.from(distributionMap.values())
            .sort((a, b) => new Date(a.interval).getTime() - new Date(b.interval).getTime());

        res.status(200).json({
            distribution,
            total: cogs.length
        });
    } catch (error) {
        console.error(error);
        res.status(500).send("Something went wrong");
    }
});


export default productRouter;