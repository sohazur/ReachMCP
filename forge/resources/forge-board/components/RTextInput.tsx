import React, { useState } from "react";
import type { RenderProps, TextInputNode } from "../types";

export const RTextInput: React.FC<RenderProps> = ({ node, state, onStateChange }) => {
  const n = node as TextInputNode;
  const value = state[n.stateKey] ?? "";
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    if (!value.trim()) return;
    // Just save locally — no chat message. State accumulates in the widget
    // and gets sent all at once when user clicks an action button.
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSave();
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onStateChange(n.stateKey, e.target.value);
          if (saved) setSaved(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={n.placeholder ?? ""}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: 10,
          border: saved ? "1px solid #22c55e" : "1px solid #e2e8f0",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          outline: "none",
          background: saved ? "#f0fdf4" : "#ffffff",
          color: "#1e293b",
          boxSizing: "border-box",
          transition: "all 0.2s",
        }}
      />
      <button
        onClick={handleSave}
        disabled={!value.trim()}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          background: saved ? "#22c55e" : value.trim() ? "#667eea" : "#e2e8f0",
          color: value.trim() || saved ? "#ffffff" : "#94a3b8",
          fontSize: 13,
          fontWeight: 600,
          cursor: value.trim() ? "pointer" : "not-allowed",
          fontFamily: "system-ui, sans-serif",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {saved ? "Saved" : "Save"}
      </button>
    </div>
  );
};
