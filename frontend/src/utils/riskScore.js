/** Composite farm risk: 0 = good (blue), 0.5 = medium (yellow), 1 = high risk (red). */

export function computeLocationRisk({ district, weather, agroData }) {
  let score = 0.5;

  if (district?.risk_level === 'High') score += 0.25;
  else if (district?.risk_level === 'Medium') score += 0.1;
  else score -= 0.15;

  const monsoon = agroData?.monsoon;
  const rain90 = monsoon?.accumulated_rainfall_90d_mm;
  const rainYear = monsoon?.accumulated_rainfall_365d_mm;
  const forecast = monsoon?.forecast_rainfall_72h_mm ?? 0;

  if (rain90 != null) {
    if (rain90 < 50) score += 0.2;
    else if (rain90 < 120) score += 0.08;
    else if (rain90 > 200) score -= 0.12;
  }

  if (rainYear != null) {
    if (rainYear < 400) score += 0.1;
    else if (rainYear > 800) score -= 0.08;
  }

  if (forecast < 3) score += 0.08;

  const moisture = agroData?.soil?.moisture_percent;
  if (moisture != null) {
    if (moisture < 20) score += 0.15;
    else if (moisture < 35) score += 0.05;
    else if (moisture > 45) score -= 0.1;
  }

  const ndvi = agroData?.vegetation?.ndvi;
  if (ndvi != null) {
    if (ndvi < 0.25) score += 0.1;
    else if (ndvi > 0.45) score -= 0.08;
  }

  const humidity = weather?.relative_humidity ?? agroData?.weather?.humidity_pct;
  if (humidity != null && humidity < 35) score += 0.05;

  return Math.max(0, Math.min(1, score));
}

export function riskToColor(score) {
  if (score >= 0.65) return { fill: '#dc2626', stroke: '#b91c1c', label: 'High risk', tier: 'high' };
  if (score >= 0.4) return { fill: '#eab308', stroke: '#ca8a04', label: 'Medium', tier: 'medium' };
  return { fill: '#2563eb', stroke: '#1d4ed8', label: 'Favorable', tier: 'good' };
}

export function districtRiskColor(riskLevel) {
  if (riskLevel === 'High') return { fill: '#dc2626', stroke: '#b91c1c' };
  if (riskLevel === 'Medium') return { fill: '#eab308', stroke: '#ca8a04' };
  return { fill: '#2563eb', stroke: '#1d4ed8' };
}

export function metricOverlayColor(score, invert = false) {
  const value = invert ? 1 - score : score;
  if (value < 0.33) return '#dc2626';
  if (value < 0.66) return '#eab308';
  return '#2563eb';
}
