/**
 * TN Warehouses — Standard Sensor Threshold Boundaries & Evaluation Rules
 * 
 * Rules:
 * Temperature (°C):
 *   ≤ 25°C       -> Normal
 *   25–30°C      -> Warning
 *   > 30°C       -> Critical
 * 
 * Humidity (%RH):
 *   ≤ 65% RH     -> Normal
 *   65–70% RH    -> Warning
 *   > 70% RH     -> Critical
 * 
 * Smoke:
 *   No detection -> Normal
 *   Detection    -> Critical
 * 
 * Combustible Gas (%LEL):
 *   < 5% LEL     -> Normal
 *   5–10% LEL    -> Warning
 *   ≥ 10% LEL    -> Critical Alert
 */

export type SensorSeverity = 'normal' | 'warning' | 'critical';

export interface ThresholdResult {
  severity: SensorSeverity;
  label: string;
  badgeBgClass: string;
  textClass: string;
  borderClass: string;
}

export const evaluateTemperature = (tempC: number): ThresholdResult => {
  if (tempC <= 25.0) {
    return {
      severity: 'normal',
      label: 'Normal',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30'
    };
  }
  if (tempC <= 30.0) {
    return {
      severity: 'warning',
      label: 'Warning',
      badgeBgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30'
    };
  }
  return {
    severity: 'critical',
    label: 'Critical Heat',
    badgeBgClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40'
  };
};

export const evaluateHumidity = (humidityPct: number): ThresholdResult => {
  if (humidityPct <= 65.0) {
    return {
      severity: 'normal',
      label: 'Normal',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30'
    };
  }
  if (humidityPct <= 70.0) {
    return {
      severity: 'warning',
      label: 'Warning',
      badgeBgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30'
    };
  }
  return {
    severity: 'critical',
    label: 'Critical Moisture',
    badgeBgClass: 'bg-rose-500/20 text-rose-400 border-rose-500/40 animate-pulse',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/40'
  };
};

export const evaluateSmoke = (smokeState: string | number): ThresholdResult => {
  const isDetected = 
    typeof smokeState === 'string' 
      ? smokeState.toUpperCase().includes('DETECTED') || smokeState.toUpperCase().includes('ALARM') || smokeState.toUpperCase().includes('HAZARD')
      : smokeState > 150;

  if (!isDetected) {
    return {
      severity: 'normal',
      label: 'Normal (No Detection)',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30'
    };
  }
  return {
    severity: 'critical',
    label: 'Critical Smoke Alarm',
    badgeBgClass: 'bg-rose-500/25 text-rose-400 border-rose-500/50 animate-pulse',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/50'
  };
};

export const evaluateCombustibleGas = (lelPct: number): ThresholdResult => {
  if (lelPct < 5.0) {
    return {
      severity: 'normal',
      label: 'Normal',
      badgeBgClass: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      textClass: 'text-emerald-400',
      borderClass: 'border-emerald-500/30'
    };
  }
  if (lelPct < 10.0) {
    return {
      severity: 'warning',
      label: 'Warning',
      badgeBgClass: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
      textClass: 'text-amber-400',
      borderClass: 'border-amber-500/30'
    };
  }
  return {
    severity: 'critical',
    label: 'Critical Gas Alert',
    badgeBgClass: 'bg-rose-500/25 text-rose-400 border-rose-500/50 animate-pulse',
    textClass: 'text-rose-400',
    borderClass: 'border-rose-500/50'
  };
};
