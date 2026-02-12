export const PROCESS_URL =
  "https://services.sentinel-hub.com/api/v1/process";

export const SUPPORTED_LAYERS = [
  "ndvi",
  "ndre",
  "evi",
  "ndwi",
  "savi",
  "ndmi",
  "gndvi",
  "sipi",
] as const;

export type Layer = (typeof SUPPORTED_LAYERS)[number];

/* ============================================================
   INDEX FORMULAS
============================================================ */

const FORMULAS: Record<Layer, string> = {
  ndvi: "(B08 - B04) / (B08 + B04 + 0.0001)",
  ndre: "(B08 - B05) / (B08 + B05 + 0.0001)",
  evi: "2.5 * (B08 - B04) / (B08 + 6.0 * B04 - 7.5 * B02 + 1.0)",
  ndwi: "(B03 - B08) / (B03 + B08 + 0.0001)",
  savi: "1.5 * (B08 - B04) / (B08 + B04 + 0.5)",
  ndmi: "(B08 - B11) / (B08 + B11 + 0.0001)",
  gndvi: "(B08 - B03) / (B08 + B03 + 0.0001)",
  sipi: "(B08 - B02) / (B08 - B04 + 0.0001)",
};

/* ============================================================
   COLOR RAMPS (JSON STRING — SENTINEL SAFE)
============================================================ */

const VEGETATION_RAMP = JSON.stringify([
  [-1.0, [77, 0, 0]],
  [0.05, [77, 0, 0]],
  [0.10, [128, 0, 38]],
  [0.15, [189, 0, 38]],
  [0.20, [227, 26, 28]],
  [0.25, [252, 78, 42]],
  [0.30, [253, 141, 60]],
  [0.35, [254, 178, 76]],
  [0.40, [254, 217, 118]],
  [0.45, [255, 255, 204]],
  [0.50, [229, 245, 224]],
  [0.55, [199, 233, 192]],
  [0.60, [161, 217, 155]],
  [0.65, [127, 205, 187]],
  [0.70, [102, 194, 164]],
  [0.75, [65, 171, 93]],
  [0.80, [44, 162, 95]],
  [0.85, [26, 150, 65]],
  [0.90, [18, 138, 63]],
  [0.95, [10, 125, 59]],
  [1.0, [0, 100, 0]],
]);

const MOISTURE_RAMP = JSON.stringify([
  [-1.0, [74, 44, 11]],
  [-0.5, [166, 124, 82]],
  [-0.1, [229, 231, 235]],
  [0.1, [229, 231, 235]],
  [0.3, [222, 235, 247]],
  [0.5, [158, 202, 225]],
  [0.7, [66, 146, 198]],
  [0.9, [8, 81, 156]],
  [1.0, [8, 48, 107]],
]);

const SIPI_RAMP = JSON.stringify([
  [0.8, [0, 100, 0]],
  [0.9, [102, 194, 164]],
  [1.0, [217, 239, 139]],
  [1.1, [253, 174, 97]],
  [1.25, [215, 48, 39]],
  [1.4, [128, 0, 38]],
  [1.6, [77, 0, 0]],
]);

/* ============================================================
   BUILD EVALSCRIPT
============================================================ */

export function buildEvalscript(layer: Layer): string {
  const formula = FORMULAS[layer];
  const ramp =
    layer === "ndmi" || layer === "ndwi"
      ? MOISTURE_RAMP
      : layer === "sipi"
      ? SIPI_RAMP
      : VEGETATION_RAMP;

  return `//VERSION=3
function setup() {
  return {
    input: [{
      bands: ["B02","B03","B04","B05","B08","B11"],
      units: "REFLECTANCE"
    }],
    output: { bands: 4, sampleType: "UINT8" }
  };
}

function clamp(v) {
  return Math.max(0, Math.min(255, v));
}

var stops = JSON.parse('${ramp}');

function mix(a,b,t){ return a + (b-a)*t; }

function colorize(v){
  for (var i=0;i<stops.length-1;i++){
    if (v>=stops[i][0] && v<=stops[i+1][0]){
      var t = (v-stops[i][0])/(stops[i+1][0]-stops[i][0]);
      return [
        mix(stops[i][1][0], stops[i+1][1][0], t),
        mix(stops[i][1][1], stops[i+1][1][1], t),
        mix(stops[i][1][2], stops[i+1][1][2], t)
      ];
    }
  }
  return stops[stops.length-1][1];
}

function evaluatePixel(s){
  var B02 = s.B02;
  var B03 = s.B03;
  var B04 = s.B04;
  var B05 = s.B05;
  var B08 = s.B08;
  var B11 = s.B11;

  var v = ${formula};

  if (!isFinite(v)) return [0,0,0,0];

  var c = colorize(v);
  return [
    clamp(Math.round(c[0])),
    clamp(Math.round(c[1])),
    clamp(Math.round(c[2])),
    255
  ];
}
`;
}
