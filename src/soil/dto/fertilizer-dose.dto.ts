export interface FertilizerDose {
  fertilizer: string;

  /** NEW — what nutrient this fertilizer supplies */
  nutrientSupplied: string;

  /** dose per plant in grams */
  dosePerPlantGrams: number;

  /** optional UI label */
  label?: string;
}
