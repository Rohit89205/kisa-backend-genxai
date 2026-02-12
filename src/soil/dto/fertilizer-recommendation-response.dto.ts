import { FertilizerDose } from './fertilizer-dose.dto';

/* =====================================
   ML Nutrient Prediction Shape
===================================== */
export type MlNutrientPrediction = {
  value: number | null;
  unit: string;
  confidence: number;
  method: 'ml' | 'heuristic';
};

/* =====================================
   Soil Status (Qualitative – SHC aligned)
===================================== */
export type SoilStatus = {
  nitrogen: 'Low' | 'Medium' | 'High';
  phosphorus: 'Low' | 'Medium' | 'High';
  potassium: 'Low' | 'Medium' | 'High';
  organicCarbon?: 'Low' | 'Medium' | 'High';
};

/* =====================================
   Government Fertilizer Combination
===================================== */
export type GovtFertilizerCombination = {
  fertilizer: string;
  doseKgHa: number;
};

/* =====================================
   FINAL RESPONSE DTO
===================================== */
export class FertilizerRecommendationResponseDto {
  /** Field identifier (DB → ML → UI linkage) */
  fieldId!: string;
  farmer_name?: string;
  mobile_number?: string;
  /**
   * ML-predicted nutrients
   * Example keys: N, P, K, OC, pH, EC, S, Fe, Zn, Cu, B, Mn
   */
  nutrients!: {
    [nutrientCode: string]: MlNutrientPrediction;
  };

  /** Qualitative soil status derived from SHC critical limits */
  soilStatus!: SoilStatus;

  /* =====================================================
     GOVERNMENT SHC RECOMMENDATION (OPTIONAL)
     ===================================================== */
  crop?: string;
  state?: string;
  district?: string;
  village?: string;
  pincode?: string;
  lat?: number;
  lon?: number;
  combination_1?: GovtFertilizerCombination[];
  combination_2?: GovtFertilizerCombination[];

  fym?: string;

  /** Source declaration for audit & trust */
  source?: 'ML Engine' | 'Soil Health Card Scheme (Govt. of India)';

  /** Optional metadata */
  updatedAt?: string;
}
