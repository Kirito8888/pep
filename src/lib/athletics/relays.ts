import { fitVmax, timeAtDistance } from "./sprint";

/** Planificador de relevos: 4 postas + zona de transferencia. */

export type RelayKey = "4x100" | "4x200" | "4x400";

export interface RelaySpec {
  key: RelayKey;
  label: string;
  leg: 100 | 200 | 400;
  zone: number;
  /** Ganancia máxima por salida lanzada en un cambio perfecto (s). */
  flyingGain: number;
  legNotes: string[];
}

export const RELAYS: Record<RelayKey, RelaySpec> = {
  "4x100": {
    key: "4x100",
    label: "4 × 100 m",
    leg: 100,
    zone: 30,
    flyingGain: 0.95,
    legNotes: [
      "Salida de tacos y curva: buen salidor, testigo en mano derecha.",
      "Recta opuesta: el tramo más largo con testigo; recibe con la izquierda.",
      "Curva: buen corredor de curva; recibe con la derecha.",
      "Recta final: el más competitivo; recibe con la izquierda.",
    ],
  },
  "4x200": {
    key: "4x200",
    label: "4 × 200 m",
    leg: 200,
    zone: 30,
    flyingGain: 0.7,
    legNotes: [
      "Salida de tacos por calle; reparte el esfuerzo en la curva.",
      "Recibe lanzado; mantiene la calle según reglamento de la competición.",
      "Corredor resistente a la velocidad; cambio visual-no visual corto.",
      "Cierre: mejor 200 m del equipo.",
    ],
  },
  "4x400": {
    key: "4x400",
    label: "4 × 400 m",
    leg: 400,
    zone: 20,
    flyingGain: 0.6,
    legNotes: [
      "Salida de tacos; toda la posta por calle.",
      "Calle libre tras la primera curva: corredor táctico y fuerte.",
      "Mantener posición; entrega visual con brazo extendido.",
      "Cierre: el mejor 400 m del equipo.",
    ],
  },
};

export interface RelayLegInput {
  name: string;
  /** Marca individual (s) en la distancia de la posta. */
  time: number;
}

export interface RelayLegResult {
  name: string;
  order: number;
  flatTime: number;
  estimatedSplit: number;
  note: string;
  /** Marca de salida (m antes de la posición del receptor); null en la posta 1 y en 4x400. */
  goMark: number | null;
  goMarkFeet: number | null;
}

export interface RelayPlan {
  legs: RelayLegResult[];
  total: number;
  sumFlat: number;
  gain: number;
}

/**
 * Marca de salida (go-mark): distancia por detrás del receptor a la que debe pasar el
 * portador para que el receptor arranque. Con el receptor recorriendo `exchangePoint` m
 * en t s (modelo de aceleración) y el portador llegando a v m/s:
 *   marca = v · (t + reacción) − exchangePoint + distancia de brazos
 */
export function goMark(incomingTime100: number, outgoingTime100: number, exchangePoint = 22, reach = 1.0, reaction = 0.15): number {
  const vInMax = fitVmax(100, incomingTime100);
  const vIn = vInMax * 0.96; // pérdida de velocidad al final de la posta
  const vOutMax = fitVmax(100, outgoingTime100);
  const tOut = timeAtDistance(exchangePoint, vOutMax, 1.3, 0);
  return Math.max(0, vIn * (tOut + reaction) - exchangePoint + reach);
}

export function planRelay(relay: RelaySpec, legs: RelayLegInput[], efficiency = 0.85, exchangePoint = 22): RelayPlan {
  const results: RelayLegResult[] = legs.map((leg, i) => {
    const first = i === 0;
    // La posta 1 sale de tacos y corre curva; el resto recibe lanzado.
    const adj = first ? (relay.leg === 100 ? 0.1 : 0) : -relay.flyingGain * efficiency;
    let mark: number | null = null;
    if (!first && relay.leg !== 400) {
      const prev = legs[i - 1];
      const to100 = (t: number) => (relay.leg === 100 ? t : t / 2 - 0.3);
      mark = goMark(to100(prev.time), to100(leg.time), exchangePoint);
    }
    return {
      name: leg.name || `Posta ${i + 1}`,
      order: i + 1,
      flatTime: leg.time,
      estimatedSplit: leg.time + adj,
      note: relay.legNotes[i] ?? "",
      goMark: mark,
      goMarkFeet: mark != null ? mark / 0.3048 : null,
    };
  });
  const total = results.reduce((a, r) => a + r.estimatedSplit, 0);
  const sumFlat = legs.reduce((a, l) => a + l.time, 0);
  return { legs: results, total, sumFlat, gain: sumFlat - total };
}
