import React from "react";
import type { RenderProps, ToggleNode } from "../types";

export const RToggle: React.FC<RenderProps> = ({ node, state, onStateChange }) => {
  const n = node as ToggleNode;
  const checked = state[n.stateKey] ?? n.value ?? false;

  return (
    <label
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        cursor: "pointer",
        fontSize: 13,
        fontFamily: "system-ui, sans-serif",
        color: "#1e293b",
      }}
    >
      <div
        onClick={() => onStateChange(n.stateKey, !checked)}
        style={{
          width: 36,
          height: 20,
          borderRadius: 10,
          background: checked ? "#2563EB" : "#cbd5e1",
          position: "relative",
          transition: "background 0.2s",
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <div
          style={{
            width: 16,
            height: 16,
            borderRadius: 8,
            background: "#ffffff",
            position: "absolute",
            top: 2,
            left: checked ? 18 : 2,
            transition: "left 0.2s",
            boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          }}
        />
      </div>
      {n.label}
    </label>
  );
};
