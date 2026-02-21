import React from "react";
import type { RenderProps, SelectNode } from "../types";

export const RSelect: React.FC<RenderProps> = ({ node, state, onStateChange }) => {
  const n = node as SelectNode;
  const value = state[n.stateKey] ?? n.value ?? "";

  return (
    <select
      value={value}
      onChange={(e) => onStateChange(n.stateKey, e.target.value)}
      style={{
        width: "100%",
        padding: "10px 14px",
        borderRadius: 10,
        border: "1px solid #e2e8f0",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        outline: "none",
        background: "#ffffff",
        color: "#1e293b",
        cursor: "pointer",
      }}
    >
      {(n.options ?? []).map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
};
