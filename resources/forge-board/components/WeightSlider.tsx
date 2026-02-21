import React from "react";

interface WeightSliderProps {
  value: number;
  min?: number;
  max?: number;
  accentColor?: string;
  onChange: (value: number) => void;
  lowLabel?: string;
  highLabel?: string;
}

export const WeightSlider: React.FC<WeightSliderProps> = ({
  value,
  min = 1,
  max = 10,
  accentColor = "#3b82f6",
  onChange,
  lowLabel = "Weak",
  highLabel = "Strong",
}) => (
  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "system-ui, sans-serif", minWidth: 32 }}>
      {lowLabel}
    </span>
    <input
      type="range"
      min={min}
      max={max}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        flex: 1,
        height: 6,
        borderRadius: 3,
        cursor: "pointer",
        accentColor,
      }}
    />
    <span style={{ fontSize: 10, color: "#94a3b8", fontFamily: "system-ui, sans-serif", minWidth: 32, textAlign: "right" }}>
      {highLabel}
    </span>
    <span
      style={{
        fontSize: 12,
        fontWeight: 700,
        color: accentColor,
        minWidth: 20,
        textAlign: "center",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      {value}
    </span>
  </div>
);
