/** Cálculo de discos por lado de la barra. */

export const PLATES_KG = [25, 20, 15, 10, 5, 2.5, 1.25, 0.5] as const;

export const PLATE_COLORS: Record<number, string> = {
  25: "#dc2626",
  20: "#2563eb",
  15: "#eab308",
  10: "#16a34a",
  5: "#f5f5f5",
  2.5: "#ef4444",
  1.25: "#9ca3af",
  0.5: "#d4d4d8",
};

export interface PlateResult {
  perSide: number[];
  achieved: number;
  remainder: number;
}

export function calculatePlates(
  target: number,
  barKg: 20 | 15 = 20,
  available: readonly number[] = PLATES_KG,
): PlateResult {
  if (target <= barKg) return { perSide: [], achieved: barKg, remainder: Math.max(0, target - barKg) };
  // Se trabaja en gramos para evitar errores de coma flotante.
  let sideG = Math.round(((target - barKg) / 2) * 1000);
  const perSide: number[] = [];
  for (const plate of [...available].sort((a, b) => b - a)) {
    const g = Math.round(plate * 1000);
    while (sideG >= g) {
      perSide.push(plate);
      sideG -= g;
    }
  }
  const achieved = barKg + 2 * perSide.reduce((a, c) => a + c, 0);
  return { perSide, achieved, remainder: Math.round((target - achieved) * 1000) / 1000 };
}
