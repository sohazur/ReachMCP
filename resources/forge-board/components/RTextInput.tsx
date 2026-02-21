import React, { useState } from "react";
import type { RenderProps, TextInputNode } from "../types";

export const RTextInput: React.FC<RenderProps> = ({ node, state, onStateChange, callTool, sendFollowUpMessage }) => {
  const n = node as TextInputNode;
  const value = state[n.stateKey] ?? "";
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    if (!value.trim()) return;
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 2000);

    if (n.submitAction === "add_factor" && callTool) {
      callTool("forge_update", {
        operation: "add",
        components: [
          { type: "card", id: `user-${Date.now()}`, title: value, dismissible: true, accentColor: "#667eea" },
        ],
        commentary: `User added: "${value}"`,
      });
    } else if (n.submitAction === "follow_up" && sendFollowUpMessage) {
      sendFollowUpMessage(n.submitMessage ? `${n.submitMessage}: ${value}` : value);
    } else if (sendFollowUpMessage) {
      // Default: send value as context to the chat
      sendFollowUpMessage(`I filled in "${n.placeholder || n.stateKey}": ${value}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
      <input
        type="text"
        value={value}
        onChange={(e) => {
          onStateChange(n.stateKey, e.target.value);
          setSubmitted(false);
        }}
        onKeyDown={handleKeyDown}
        placeholder={n.placeholder ?? ""}
        style={{
          flex: 1,
          padding: "10px 14px",
          borderRadius: 10,
          border: submitted ? "1px solid #22c55e" : "1px solid #e2e8f0",
          fontSize: 13,
          fontFamily: "system-ui, sans-serif",
          outline: "none",
          background: "#ffffff",
          color: "#1e293b",
          boxSizing: "border-box",
          transition: "border-color 0.2s",
        }}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim()}
        style={{
          padding: "10px 16px",
          borderRadius: 10,
          border: "none",
          background: submitted ? "#22c55e" : value.trim() ? "#667eea" : "#e2e8f0",
          color: value.trim() ? "#ffffff" : "#94a3b8",
          fontSize: 13,
          fontWeight: 600,
          cursor: value.trim() ? "pointer" : "not-allowed",
          fontFamily: "system-ui, sans-serif",
          transition: "all 0.2s",
          whiteSpace: "nowrap",
        }}
      >
        {submitted ? "Saved" : "Save"}
      </button>
    </div>
  );
};
