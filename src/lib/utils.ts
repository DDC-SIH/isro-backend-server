import { NextFunction, Request, Response } from "express";

export function logRequest(req: Request, res: Response, next: NextFunction) {
  const method = req.method;
  const url = req.url;
  const timestamp = new Date().toISOString();

  console.log(
    `${timestamp} - ${method} ${url} ---- STATUS CODE: ${
      res.statusCode ?? "NOT AVAILABLE"
    }`
  );

  next();
}
