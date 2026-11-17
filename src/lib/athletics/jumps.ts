/** Saltos: talonamientos, pliometría y pértiga. */

export const JUMP_EVENTS = [
  { key: "LJ", label: "Longitud" },
  { key: "TJ", label: "Triple salto" },
  { key: "HJ", label: "Altura" },
  { key: "PV", label: "Pértiga" },
] as const;

export const PLYO_TYPES = [
  { key: "DROP_JUMP", label: "Drop jumps", intensity: "HIGH" },
  { key: "HORIZONTAL", label: "Multisaltos horizontales", intensity: "HIGH" },
  { key: "SHORT_APPROACH", label: "Batidas con carrera corta", intensity: "HIGH" },
  { key: "HURDLE_HOPS", label: "Saltos de vallas", intensity: "MEDIUM" },
  { key: "BOX", label: "Saltos al cajón", intensity: "LOW" },
  { key: "POGO", label: "Pogos / reactividad de tobillo", intensity: "LOW" },
] as const;

/** Contactos semanales orientativos según nivel: [ámbar, rojo]. */
export const PLYO_LIMITS: Record<string, [number, number]> = {
  BEGINNER: [200, 300],
  INTERMEDIATE: [320, 450],
  ADVANCED: [450, 600],
};

/** Peso de fatiga por contacto según la intensidad del ejercicio. */
export const PLYO_WEIGHT: Record<string, number> = { LOW: 0.5, MEDIUM: 1, HIGH: 1.5 };

export interface ApproachAnalysis {
  avgStride: number;
  /** Corrección del punto de inicio en cm (positivo = retrasar la marca, alejarse de la tabla). */
  windAdjustmentCm: number;
  adjustedDistance: number;
  advice: string;
}

/**
 * Ajuste de talonamiento por viento. Regla práctica de pista: ≈ 0,5 cm por apoyo y por
 * cada m/s de viento (a favor se retrasa la marca; en contra se adelanta).
 */
export function analyzeApproach(distanceM: number, strides: number, wind: number | null): ApproachAnalysis {
  const avgStride = strides > 0 ? distanceM / strides : 0;
  const w = wind ?? 0;
  const windAdjustmentCm = Math.round(w * strides * 0.5);
  const adjustedDistance = Math.round((distanceM + windAdjustmentCm / 100) * 100) / 100;
  let advice = "Sin viento relevante: mantén tu marca habitual.";
  if (windAdjustmentCm > 0) advice = `Viento a favor: la zancada se alarga. Retrasa la marca ≈ ${windAdjustmentCm} cm.`;
  if (windAdjustmentCm < 0) advice = `Viento en contra: la zancada se acorta. Adelanta la marca ≈ ${Math.abs(windAdjustmentCm)} cm.`;
  return { avgStride, windAdjustmentCm, adjustedDistance, advice };
}

export interface PoleAnalysis {
  /** Agarre efectivo sobre el nivel del pasillo (se descuentan 20 cm de cajetín). */
  effectiveGrip: number;
  /** Diferencia entre listón y agarre efectivo (empuje). */
  pushOff: number | null;
  flexAdvice: string;
  standardsAdvice: string;
}

export const BOX_DEPTH_M = 0.2;

export function analyzePole(
  lengthM: number,
  flexLbs: number,
  gripHeightM: number,
  standardsCm: number,
  bodyWeightKg: number | null,
  barHeightM: number | null,
): PoleAnalysis {
  const effectiveGrip = Math.round((gripHeightM - BOX_DEPTH_M) * 100) / 100;
  const pushOff = barHeightM != null ? Math.round((barHeightM - effectiveGrip) * 100) / 100 : null;
  let flexAdvice = "Introduce tu peso corporal para comparar con la dureza de la pértiga.";
  if (bodyWeightKg != null && bodyWeightKg > 0) {
    const bodyLbs = bodyWeightKg * 2.20462;
    const margin = Math.round(flexLbs - bodyLbs);
    flexAdvice =
      margin < 0
        ? `La pértiga (${flexLbs} lbs) está por debajo de tu peso (${Math.round(bodyLbs)} lbs): no reglamentaria en categorías menores y riesgo de rotura.`
        : margin < 10
          ? `Margen de ${margin} lbs sobre tu peso: pértiga blanda, adecuada para carreras cortas o agarres bajos.`
          : margin <= 30
            ? `Margen de ${margin} lbs sobre tu peso: rango habitual de competición.`
            : `Margen de ${margin} lbs: pértiga muy dura; necesitas velocidad de entrada alta y agarre alto.`;
  }
  const gripFromTop = Math.round((lengthM - gripHeightM) * 100);
  const gripNote = gripFromTop < 10 ? " Agarre casi en el extremo: valora pasar a una pértiga más larga." : "";
  const standardsAdvice =
    standardsCm < 45
      ? `Saltómetros a ${standardsCm} cm: muy cerca (mínimo recomendado de seguridad 45 cm; rango reglamentario 0–80 cm).${gripNote}`
      : standardsCm <= 80
        ? `Saltómetros a ${standardsCm} cm: dentro del rango reglamentario (0–80 cm).${gripNote}`
        : `Saltómetros a ${standardsCm} cm: fuera del rango reglamentario (máximo 80 cm).${gripNote}`;
  return { effectiveGrip, pushOff, flexAdvice, standardsAdvice };
}
