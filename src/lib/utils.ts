import { NextFunction, Request, Response } from "express";
import fs from "fs";
import path from "path";

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

export function writeJsonToFile(filePath: string, data: any) {
  // Sanitize file path by replacing invalid filename characters
  const sanitizedFilename = path.basename(filePath).replace(/[<>:"\/\\|?*]+/g, "_");
  const directory = path.dirname(filePath);
  const sanitizedPath = path.join(directory, sanitizedFilename);
  const jsonData = JSON.stringify(data, null, 2);

  return new Promise<void>((resolve, reject) => {
    // Create directory if it doesn't exist
    fs.mkdir(directory, { recursive: true }, (mkdirErr) => {
      if (mkdirErr && mkdirErr.code !== "EEXIST") {
        return reject(mkdirErr);
      }

      // Write the file
      fs.writeFile(sanitizedPath, jsonData, (err) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}

export function convertToTimestamp(datestring: string) {
  let day = parseInt(datestring.substring(0, 2));
  let mon = parseInt(datestring.substring(2, 4)) - 1;
  let year = parseInt(datestring.substring(4, 8));
  let hour = parseInt(datestring.substring(8, 10));
  let mins = parseInt(datestring.substring(10, 12));

  let date = new Date(year, mon, day, hour, mins);

  return date.getTime();
}

export function convertFromTimestamp(ts: number) {
  let d = new Date(ts);
  let day = String(d.getDate()).padStart(2, "0");
  let mon = String(d.getMonth() + 1).padStart(2, "0");
  let year = String(d.getFullYear());
  let hours = String(d.getHours()).padStart(2, "0");
  let mins = String(d.getMinutes()).padStart(2, "0");

  return `${day}${mon}${year}${hours}${mins}`;
}
