import { FertilizerDose } from './fertilizer-dose.dto';

/* ----------------------------------
   Nutrient prediction shape (ML)
----------------------------------- */
export type MlNutrientPrediction = {
  value: number | null;
  unit: string;
  confidence: number;
  method: 'ml' | 'heuristic';
};

/* ----------------------------------
   Soil Status (ML derived)
----------------------------------- */
export type SoilStatus = {
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
};

/* ----------------------------------
   Fertilizer Recommendation Response
----------------------------------- */
export class FertilizerRecommendationResponseDto {
  /** Field identifier */
  fieldId!: string;

  /**
   * Raw ML nutrient predictions
   * (N, P, K, OC, pH, EC, Zn, Fe, etc.)
   */
  nutrients!: {
    [key: string]: MlNutrientPrediction;
  };

  /** ML-derived qualitative soil status */
  soilStatus!: SoilStatus;

  /** Final fertilizer doses (kg/ha) */
  fertilizers!: FertilizerDose[];

  /** Optional metadata */
  crop?: string;
  updatedAt?: string;
}
