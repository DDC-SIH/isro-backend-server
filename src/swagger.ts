import swaggerJSDoc from "swagger-jsdoc";

const swaggerOptions: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "COG Visualizer", // 🔵 Set API title here
      version: "1.0.0", // 🔵 API version
      description: "Detailed API Docs", // 🔵 Description
      contact: {
        // 🔵 Contact info
        name: "Subhadip Saha",
        email: "sahasubhadip54@gmail.com",
        url: "https://subhadip.me",
      },
      license: {
        // 🔵 Licensing
        name: "MIT",
        url: "https://opensource.org/licenses/MIT",
      },
    },
    servers: [
      {
        url: process.env.DEVELOPMENT_URL,
        description: "Development server",
      },
      {
        url: process.env.PRODUCTION_URL,
        description: "Production server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Adjust according to your route files
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
