import React from "react";
import type { Verdict } from "../types";

interface VerdictPanelProps {
  verdict: Verdict;
}

export const VerdictPanel: React.FC<VerdictPanelProps> = ({ verdict }) => (
  <div
    style={{
      background: "#0F172A",
      borderRadius: 16,
      padding: 24,
      color: "#ffffff",
      marginTop: 20,
      animation: "fadeIn 0.4s ease-out",
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
      <span style={{ fontSize: 24 }}>🎯</span>
      <span
        style={{
          fontSize: 20,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        Verdict: {verdict.winner}
      </span>
    </div>
    <div
      style={{
        display: "inline-block",
        background: "rgba(255,255,255,0.2)",
        borderRadius: 20,
        padding: "4px 12px",
        fontSize: 13,
        fontWeight: 600,
        marginBottom: 12,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {verdict.confidence}% confidence
    </div>
    <p
      style={{
        fontSize: 14,
        lineHeight: 1.6,
        marginBottom: 16,
        opacity: 0.95,
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {verdict.reasoning}
    </p>
    {verdict.next_steps.length > 0 && (
      <div>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            marginBottom: 8,
            opacity: 0.85,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          Next steps:
        </div>
        <ol style={{ paddingLeft: 20, margin: 0 }}>
          {verdict.next_steps.map((step, i) => (
            <li
              key={i}
              style={{
                fontSize: 13,
                lineHeight: 1.6,
                opacity: 0.9,
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {step}
            </li>
          ))}
        </ol>
      </div>
    )}
  </div>
);
