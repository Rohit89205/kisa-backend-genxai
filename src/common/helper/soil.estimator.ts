export function clamp(v: number, min: number, max: number) {
  return Math.max(min, Math.min(max, v));
}

export function mean(arr: number[]) {
  return arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null;
}

export function std(arr: number[]) {
  if (!arr.length) return null;
  const m = mean(arr)!;
  return Math.sqrt(mean(arr.map(v => (v - m) ** 2))!);
}

export function linearTrend(values: number[]) {
  if (values.length < 2) return 0;
  const x = values.map((_, i) => i);
  const x̄ = mean(x)!;
  const ȳ = mean(values)!;

  const num = x.reduce((s, xi, i) => s + (xi - x̄) * (values[i] - ȳ), 0);
  const den = x.reduce((s, xi) => s + (xi - x̄) ** 2, 0);

  return den === 0 ? 0 : num / den;
}

export function readMean(bucket: any, id: string): number | null {
  const out = bucket.outputs?.[id];
  if (!out) return null;
  if (out.stats?.mean != null) return out.stats.mean;
  if (out.bands?.B0?.stats?.mean != null) return out.bands.B0.stats.mean;
  return null;
}

export function estimateSoilTexture(soil: any) {
  const ndvi = clamp(soil.ndvi_mean_90d ?? 0.5, 0, 1);
  const bsi = clamp(soil.bsi_mean_90d ?? 0, -1, 1);

  let clay = 20 + (1 - ndvi) * 30;
  let sand = 30 + (bsi + 1) * 20;
  let silt = 100 - clay - sand;

  clay = clamp(clay, 10, 60);
  sand = clamp(sand, 10, 70);
  silt = clamp(100 - clay - sand, 5, 60);

  return {
    clay: +clay.toFixed(1),
    silt: +silt.toFixed(1),
    sand: +sand.toFixed(1),
    elevation: 400,
  };
}

export function estimateChemistry(soil: any) {
  const ndvi = clamp(soil.ndvi_mean_90d ?? 0.5, 0, 1);
  const bsi = clamp(soil.bsi_mean_90d ?? 0, -1, 1);

  const soc = clamp(0.4 + ndvi * 1.6, 0.4, 2.5);
  const ph = clamp(6.2 + (0.5 - ndvi) * 1.5 + bsi * 0.3, 5.5, 8.5);

  return {
    soc_0_30: +soc.toFixed(2),
    ph_0_30: +ph.toFixed(2),
  };
}