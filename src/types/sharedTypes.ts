export interface CoverageType {
  lat1: number;
  lat2: number;
  lon1: number;
  lon2: number;
}

export interface CornerCoords {
  upperLeft: [number];
  lowerLeft: [number];
  lowerRight: [number];
  upperRight: [number];
  center: [number];
}

export interface BandType {
  bandId: number;
  type: string;
  colorInterpretation: string;
  min: number;
  max: number;
  minimum: number;
  maximum: number;
  mean: number;
  stdDev: number;
  noDataValue: number;
}
