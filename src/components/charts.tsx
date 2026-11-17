"use client";

import { Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export interface Series {
  key: string;
  label: string;
  /** Índice 1-8 de la paleta categórica o un color CSS. */
  color?: number | string;
}

const colorOf = (s: Series, i: number) => (typeof s.color === "string" ? s.color : `var(--series-${s.color ?? (i % 8) + 1})`);

const axisProps = {
  tick: { fill: "var(--muted)", fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "var(--axis)" },
} as const;

const tooltipProps = {
  contentStyle: { background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 8, fontSize: 12, color: "var(--ink)" },
  labelStyle: { color: "var(--ink-2)", fontWeight: 600 },
  itemStyle: { color: "var(--ink)" },
  cursor: { fill: "var(--surface-2)", stroke: "var(--axis)" },
} as const;

const legendProps = { wrapperStyle: { fontSize: 12, color: "var(--ink-2)" }, iconSize: 10 } as const;

type Row = Record<string, string | number | null>;

interface ChartProps {
  data: Row[];
  xKey: string;
  series: Series[];
  height?: number;
  unit?: string;
  /** Línea de referencia horizontal (umbral). */
  reference?: { y: number; label: string };
}

const fmt = (unit?: string) => (value: unknown) => `${typeof value === "number" ? value.toLocaleString("es-ES") : String(value ?? "")}${unit ? ` ${unit}` : ""}`;

export function BarsChart({ data, xKey, series, height = 240, unit, stacked = false, reference }: ChartProps & { stacked?: boolean }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -8 }} barCategoryGap="25%" barGap={2}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} axisLine={false} width={52} />
        <Tooltip {...tooltipProps} formatter={fmt(unit)} />
        {series.length > 1 ? <Legend {...legendProps} /> : null}
        {reference ? <ReferenceLine y={reference.y} stroke="var(--ink-2)" strokeDasharray="4 4" label={{ value: reference.label, fill: "var(--ink-2)", fontSize: 11, position: "insideTopRight" }} /> : null}
        {series.map((s, i) => (
          <Bar
            key={s.key}
            dataKey={s.key}
            name={s.label}
            fill={colorOf(s, i)}
            stackId={stacked ? "a" : undefined}
            stroke="var(--surface)"
            strokeWidth={stacked ? 2 : 0}
            radius={stacked ? 0 : [4, 4, 0, 0]}
            maxBarSize={36}
            isAnimationActive={false}
          />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

export function LinesChart({ data, xKey, series, height = 240, unit, reversed = false, reference, domain }: ChartProps & { reversed?: boolean; domain?: [number | "auto" | "dataMin" | "dataMax", number | "auto" | "dataMin" | "dataMax"] }) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 12, bottom: 0, left: -8 }}>
        <CartesianGrid vertical={false} stroke="var(--border)" />
        <XAxis dataKey={xKey} {...axisProps} />
        <YAxis {...axisProps} axisLine={false} width={52} reversed={reversed} domain={domain ?? ["auto", "auto"]} />
        <Tooltip {...tooltipProps} cursor={{ stroke: "var(--axis)" }} formatter={fmt(unit)} />
        {series.length > 1 ? <Legend {...legendProps} /> : null}
        {reference ? <ReferenceLine y={reference.y} stroke="var(--ink-2)" strokeDasharray="4 4" label={{ value: reference.label, fill: "var(--ink-2)", fontSize: 11, position: "insideTopRight" }} /> : null}
        {series.map((s, i) => (
          <Line
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.label}
            stroke={colorOf(s, i)}
            strokeWidth={2}
            dot={{ r: 4, fill: colorOf(s, i), stroke: "var(--surface)", strokeWidth: 2 }}
            activeDot={{ r: 6 }}
            connectNulls
            isAnimationActive={false}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
