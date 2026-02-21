import React from "react";
import type { RenderProps } from "../types";

export const RBadge: React.FC<RenderProps> = ({ node }) => (
  <span
    style={{
      display: "inline-block",
      background: node.color ? `${node.color}20` : "#eef2ff",
      color: node.color ?? "#667eea",
      borderRadius: 20,
      padding: "3px 12px",
      fontSize: 12,
      fontWeight: 600,
      fontFamily: "system-ui, sans-serif",
    }}
  >
    {node.text}
  </span>
);
