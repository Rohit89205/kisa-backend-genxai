export type NutrientLevel = 'low' | 'medium' | 'high';

export interface DonutBreakdown {
  low: number;     // %
  medium: number;  // %
  high: number;    // %
  currentLevel: NutrientLevel;
}

export interface DepthValue {
  depthCm: number;
  value: number; // Temperature in °C or Moisture in %
}

export interface TimeSeriesByDepth {
  dates: string[];                      // e.g. ['2025-11-17', '2025-11-18']
  series: Record<string, number[]>;     // e.g. { '0cm': [22.1, 23.5, ...] }
}

export interface SoilAnalysisResponse {
  location: {
    name: string;
    latitude: number;
    longitude: number;
    timezone: string;
  };

  current: {
    temperatureByDepth: DepthValue[];
    moistureByDepth: DepthValue[];
    healthOverview: {
      nitrogen: DonutBreakdown;
      phosphorus: DonutBreakdown;
      potassium: DonutBreakdown;
      zinc: DonutBreakdown;
    };
  };

  forecast7d: {
    temperature: TimeSeriesByDepth;
    moisture: TimeSeriesByDepth;
  };

  history30d: {
    temperature: TimeSeriesByDepth;
    moisture: TimeSeriesByDepth;
  };
}
