import React from "react";
import type { RenderProps } from "../types";

export const RHeading: React.FC<RenderProps> = ({ node }) => {
  const level = node.level ?? 2;
  const sizes: Record<number, number> = { 1: 22, 2: 18, 3: 15 };
  return (
    <div
      style={{
        fontSize: sizes[level] ?? 18,
        fontWeight: 700,
        color: "#1e293b",
        fontFamily: "system-ui, sans-serif",
        margin: "8px 0 4px",
      }}
    >
      {node.text}
    </div>
  );
};
