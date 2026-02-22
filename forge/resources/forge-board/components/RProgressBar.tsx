import React from "react";
import type { RenderProps, ProgressBarNode } from "../types";

export const RProgressBar: React.FC<RenderProps> = ({ node }) => {
  const n = node as ProgressBarNode;
  return (
    <div style={{ margin: "4px 0" }}>
      {n.label && (
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            fontSize: 12,
            color: "#64748b",
            marginBottom: 4,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          <span>{n.label}</span>
          <span style={{ fontWeight: 700, color: n.color ?? "#2563EB" }}>
            {n.value}%
          </span>
        </div>
      )}
      <div
        style={{
          height: 8,
          borderRadius: 4,
          background: "#f1f5f9",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: `${Math.min(100, Math.max(0, n.value))}%`,
            height: "100%",
            background: n.color ?? "#2563EB",
            borderRadius: 4,
            transition: "width 0.4s ease",
          }}
        />
      </div>
    </div>
  );
};
