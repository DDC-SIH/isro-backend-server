export interface CoverageType {
  left: number;
  right: number;
  top: number;
  bottom: number;
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
