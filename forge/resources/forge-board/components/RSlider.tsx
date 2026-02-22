import React from "react";
import type { RenderProps, SliderNode } from "../types";
import { WeightSlider } from "./WeightSlider";

export const RSlider: React.FC<RenderProps> = ({ node, state, onStateChange }) => {
  const n = node as SliderNode;
  const currentValue = state[n.stateKey] ?? n.value;

  return (
    <div style={{ margin: "4px 0" }}>
      {n.label && (
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "#1e293b",
            marginBottom: 2,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          {n.label}
        </div>
      )}
      <WeightSlider
        value={currentValue}
        min={n.min ?? 1}
        max={n.max ?? 10}
        accentColor={n.accentColor ?? "#2563EB"}
        lowLabel={n.lowLabel}
        highLabel={n.highLabel}
        onChange={(v) => onStateChange(n.stateKey, v)}
      />
    </div>
  );
};
