import React, { useState } from "react";

interface CardProps {
  title: string;
  detail?: string;
  accentColor?: string;
  onDismiss?: () => void;
  children?: React.ReactNode;
}

export const Card: React.FC<CardProps> = ({
  title,
  detail,
  accentColor = "#3b82f6",
  onDismiss,
  children,
}) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div
      style={{
        display: "flex",
        background: "#ffffff",
        borderRadius: 12,
        boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        marginBottom: 12,
        overflow: "hidden",
        animation: "fadeIn 0.3s ease-out",
      }}
    >
      <div style={{ width: 4, background: accentColor, flexShrink: 0 }} />
      <div style={{ flex: 1, padding: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontWeight: 600,
                fontSize: 14,
                color: "#1e293b",
                fontFamily: "system-ui, sans-serif",
              }}
            >
              {title}
            </div>
            {detail && (
              <button
                onClick={() => setExpanded(!expanded)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#94a3b8",
                  fontSize: 12,
                  cursor: "pointer",
                  padding: "4px 0 0 0",
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {expanded ? "▲ Less" : "▼ More"}
              </button>
            )}
          </div>
          {onDismiss && (
            <button
              onClick={onDismiss}
              style={{
                background: "none",
                border: "none",
                color: "#cbd5e1",
                fontSize: 16,
                cursor: "pointer",
                padding: "0 0 0 8px",
                lineHeight: 1,
              }}
              title="Dismiss"
            >
              ✕
            </button>
          )}
        </div>
        {detail && expanded && (
          <p
            style={{
              fontSize: 13,
              color: "#64748b",
              marginTop: 8,
              lineHeight: 1.5,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {detail}
          </p>
        )}
        {children}
      </div>
    </div>
  );
};
