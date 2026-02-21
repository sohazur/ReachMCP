import React from "react";
import type { RenderProps, TextInputNode } from "../types";

export const RTextInput: React.FC<RenderProps> = ({ node, state, onStateChange }) => {
  const n = node as TextInputNode;
  const value = state[n.stateKey] ?? "";

  return (
    <input
      type="text"
      value={value}
      onChange={(e) => onStateChange(n.stateKey, e.target.value)}
      placeholder={n.placeholder ?? ""}
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
        boxSizing: "border-box",
      }}
    />
  );
};
