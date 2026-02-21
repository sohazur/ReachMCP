import React from "react";

export const LoadingSpinner: React.FC<{ message?: string }> = ({
  message = "Analyzing your problem...",
}) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: 48,
      gap: 16,
    }}
  >
    <div
      style={{
        width: 32,
        height: 32,
        border: "3px solid #e2e8f0",
        borderTopColor: "#667eea",
        borderRadius: "50%",
        animation: "spin 0.8s linear infinite",
      }}
    />
    <p style={{ color: "#64748b", fontSize: 14, fontFamily: "system-ui, sans-serif" }}>
      {message}
    </p>
  </div>
);
