import React from "react";
import type { RenderProps } from "../types";

export const RText: React.FC<RenderProps> = ({ node }) => {
  const sizes: Record<string, number> = { sm: 12, md: 14, lg: 16 };
  return (
    <p
      style={{
        fontSize: sizes[node.size ?? "md"] ?? 14,
        color: node.color ?? "#64748b",
        lineHeight: 1.6,
        fontFamily: "system-ui, sans-serif",
        margin: "4px 0",
      }}
    >
      {node.text}
    </p>
  );
};
