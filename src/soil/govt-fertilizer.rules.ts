export type FertilizerDose = {
  fertilizer: string;
  doseKgHa: number;
};

export type GovtRule = {
  crops: string[];
  oc: 'Low' | 'Medium' | 'High';
  n: 'Low' | 'Medium' | 'High';
  p: 'Low' | 'Medium' | 'High';
  k: 'Low' | 'Medium' | 'High';
  fym: string | number;
  combination_1: FertilizerDose[];
  combination_2: FertilizerDose[];
};

// We define the base values and the "sensitivity" (multipliers) per crop group
const cropGroups = [
  {
    crops: ['aak', 'mudar', 'adenium', 'desert rose', 'aakaash gadda', 'kundroo', 'gadda', 'calotropis'],
    fym: "9.96 Tonne per Hectare",
    u: 61.53, d: 43.37, m: 20.0, s: 124.69,
    // Multipliers tailored for Aak sensitivity (N:212, P:75 results)
    multiN: { Low: 1.41, Medium: 1.0, High: 0.66 },
    multiP: { Low: 1.5, Medium: 1.0, High: 0.2557 },
    multiK: { Low: 1.5, Medium: 1.0, High: 0.66 }
  },
  {
    crops: ["cheekoo", "jamun", "ber"],
    fym: "19.92 Tonne per Hectare",
    u: 115.65, d: 65.22, m: 40.0, s: 187.50,
    // Multipliers tailored for Ber sensitivity (N:205, P:78 results)
    multiN: { Low: 1.50, Medium: 1.0, High: 0.66 },
    multiP: { Low: 1.5, Medium: 1.0, High: 0.34 },
    multiK: { Low: 1.5, Medium: 1.0, High: 0.66 }
  },
  {
    crops: ["lemon grass", "dudhi", "jungli mooli", "til (jungli)", "coloured agave", "ajgar bel", "pilwan"],
    fym: "9.96 Tonne per Hectare",
    u: 57.75, d: 32.61, m: 20.0, s: 93.75,
    multiN: { Low: 1.5, Medium: 1.0, High: 0.66 },
    multiP: { Low: 1.5, Medium: 1.0, High: 0.34 },
    multiK: { Low: 1.5, Medium: 1.0, High: 0.66 }
  },
  {
    crops: ["aakash neem", "aldu", "mahrukh", "pipal"],
    fym: "19.92 Tonne per Hectare",
    u: 123.00, d: 52.25, m: 40.0, s: 150.23,
    multiN: { Low: 1.5, Medium: 1.0, High: 0.66 },
    multiP: { Low: 1.5, Medium: 1.0, High: 0.34 },
    multiK: { Low: 1.5, Medium: 1.0, High: 0.66 }
  }
];

const generateRules = (): GovtRule[] => {
  const levels: ("Low" | "Medium" | "High")[] = ["Low", "Medium", "High"];
  const rules: GovtRule[] = [];
  
  // DAP is 18% N, Urea is 46% N. 
  // Conversion factor to subtract Urea based on DAP used: 18/46 = 0.3913
  const N_SUB_FACTOR = 0.3913;

  cropGroups.forEach(group => {
    levels.forEach(oc => {
      levels.forEach(n => {
        levels.forEach(p => {
          levels.forEach(k => {
            // Calculate specific doses using the crop's own multiplier logic
            const dapDose = Number((group.d * group.multiP[p]).toFixed(2));
            const sspDose = Number((group.s * group.multiP[p]).toFixed(2));
            const mopDose = Number((group.m * group.multiK[k]).toFixed(2));
            
            // Combination 2 Urea (The full Nitrogen requirement)
            const urea2Dose = Number((group.u * group.multiN[n]).toFixed(2));

            // Combination 1 Urea (Subtract Nitrogen provided by DAP)
            const urea1Dose = Number((urea2Dose - (dapDose * N_SUB_FACTOR)).toFixed(2));

            rules.push({
              crops: group.crops,
              oc, n, p, k,
              fym: group.fym,
              combination_1: [
                { fertilizer: "DAP", doseKgHa: dapDose },
                { fertilizer: "MOP", doseKgHa: mopDose },
                { fertilizer: "Urea", doseKgHa: urea1Dose }
              ],
              combination_2: [
                { fertilizer: "SSP", doseKgHa: sspDose },
                { fertilizer: "MOP", doseKgHa: mopDose },
                { fertilizer: "Urea", doseKgHa: urea2Dose }
              ]
            });
          });
        });
      });
    });
  });
  return rules;
};

// This variable now contains dynamically calculated rules for every crop
export const GOVT_FERTILIZER_RULES: GovtRule[] = generateRules();