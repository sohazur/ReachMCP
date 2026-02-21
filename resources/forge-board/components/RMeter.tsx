import React from "react";
import type { RenderProps, MeterNode } from "../types";

export const RMeter: React.FC<RenderProps> = ({ node }) => {
  const n = node as MeterNode;
  const total = (n.leftValue ?? 0) + (n.rightValue ?? 0) || 1;
  const pctLeft = Math.round(((n.leftValue ?? 0) / total) * 100);
  const pctRight = 100 - pctLeft;

  return (
    <div style={{ margin: "8px 0" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: n.leftColor ?? "#22c55e" }}>
          {n.leftLabel}
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: n.rightColor ?? "#ef4444" }}>
          {n.rightLabel}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "#f1f5f9",
        }}
      >
        <div
          style={{
            width: `${pctLeft}%`,
            background: n.leftColor ?? "#22c55e",
            transition: "width 0.4s ease",
          }}
        />
        <div
          style={{
            width: `${pctRight}%`,
            background: n.rightColor ?? "#ef4444",
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
};
