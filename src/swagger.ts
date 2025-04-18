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
      // {
      //   url: "http://localhost:7000",
      //   description: "Development server",
      // },
      {
        url: "http://74.226.242.56:7000",
        description: "Production server",
      },
    ],
  },
  apis: ["./src/routes/*.ts"], // Adjust according to your route files
};

export const swaggerSpec = swaggerJSDoc(swaggerOptions);
