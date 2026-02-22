import React from "react";
import type { RenderProps, ButtonNode } from "../types";

const variantStyles: Record<string, React.CSSProperties> = {
  primary: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#ffffff",
  },
  secondary: {
    background: "#f1f5f9",
    color: "#475569",
  },
  danger: {
    background: "#fef2f2",
    color: "#dc2626",
  },
};

export const RButton: React.FC<RenderProps> = ({ node, state, callTool, sendFollowUpMessage }) => {
  const n = node as ButtonNode;

  const handleClick = () => {
    if (n.action === "call_tool" && callTool && n.toolName) {
      const args: Record<string, any> = { ...n.toolArgs };
      if (n.toolArgsFromState && state) {
        const collected: Record<string, any> = {};
        for (const prefix of n.toolArgsFromState) {
          for (const [k, v] of Object.entries(state)) {
            if (k === prefix || k.startsWith(prefix + ".")) {
              collected[k] = v;
            }
          }
        }
        args._widgetState = collected;
      }
      callTool(n.toolName, args);
    } else if (n.action === "follow_up" && sendFollowUpMessage && n.message) {
      // Include state context and instruct AI to use forge_update for in-widget results
      const stateEntries = state ? Object.entries(state).filter(([k, v]) => v !== "" && v !== undefined).map(([k, v]) => `  ${k}: ${v}`).join("\n") : "";
      const fullMessage = `${n.message}${stateEntries ? `\n\nCurrent widget state:\n${stateEntries}` : ""}\n\nIMPORTANT: Use forge_update tool to add results as new components in the workspace widget. Then also provide a brief summary in chat.`;
      sendFollowUpMessage(fullMessage);
    }
  };

  const style = variantStyles[n.variant ?? "primary"] ?? variantStyles.primary;

  return (
    <button
      onClick={handleClick}
      disabled={n.disabled}
      style={{
        ...style,
        padding: "10px 20px",
        borderRadius: 10,
        border: "none",
        fontSize: 14,
        fontWeight: 600,
        cursor: n.disabled ? "not-allowed" : "pointer",
        fontFamily: "system-ui, sans-serif",
        opacity: n.disabled ? 0.5 : 1,
        transition: "opacity 0.2s",
      }}
    >
      {n.icon && <span style={{ marginRight: 6 }}>{n.icon}</span>}
      {n.label}
    </button>
  );
};
