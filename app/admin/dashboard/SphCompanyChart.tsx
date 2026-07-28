"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import type { SphCompanyCount } from "@/lib/sph-stats";

function SphTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{ payload: SphCompanyCount }>;
}) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;

  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      <p className="font-semibold text-tda-navy">{row.company}</p>
      <p className="mt-0.5 text-tda-navy-muted">
        Alias: {row.alias?.trim() ? row.alias : "-"}
      </p>
      <p className="mt-1 text-slate-700">
        SPH count: <span className="font-medium">{row.count}</span>
      </p>
    </div>
  );
}

export function SphCompanyChart({ data }: { data: SphCompanyCount[] }) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-tda-navy-muted">
        No SPH data in this date range.
      </div>
    );
  }

  const chartHeight = Math.max(280, data.length * 36);

  return (
    <div style={{ width: "100%", height: chartHeight }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          layout="vertical"
          data={data}
          margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
        >
          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
          <XAxis
            type="number"
            allowDecimals={false}
            tick={{ fontSize: 12, fill: "#4c4e7b" }}
          />
          <YAxis
            type="category"
            dataKey="company"
            width={160}
            tick={{ fontSize: 12, fill: "#232557" }}
          />
          <Tooltip
            cursor={{ fill: "rgba(36, 39, 69, 0.04)" }}
            content={<SphTooltip />}
          />
          <Bar dataKey="count" name="SPH" radius={[0, 6, 6, 0]} maxBarSize={28}>
            {data.map((entry) => (
              <Cell key={entry.company} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
