import React from "react";
import type { RenderProps, ScoreableItemNode } from "../types";
import { Card } from "./Card";
import { WeightSlider } from "./WeightSlider";

export const RScoreableItem: React.FC<RenderProps> = ({ node, state, onStateChange, onDismiss }) => {
  const n = node as ScoreableItemNode;
  const stateKey = `${n.stateKey}.${n.id}`;
  const score = state[stateKey] ?? n.score;
  const min = n.scoreMin ?? 0;
  const max = n.scoreMax ?? 100;
  const pct = ((score - min) / (max - min)) * 100;
  const hue = (pct / 100) * 120;
  const barColor = n.accentColor ?? `hsl(${hue}, 70%, 50%)`;

  return (
    <Card
      title={n.title}
      detail={n.reasoning}
      accentColor={barColor}
      onDismiss={n.dismissible ? () => onDismiss?.(n.id, n.title) : undefined}
    >
      <div style={{ marginTop: 8 }}>
        {n.description && (
          <p
            style={{
              fontSize: 12,
              color: "#64748b",
              margin: "0 0 6px",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {n.description}
          </p>
        )}
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          <div
            style={{
              flex: 1,
              height: 8,
              borderRadius: 4,
              background: "#f1f5f9",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                width: `${pct}%`,
                height: "100%",
                background: barColor,
                borderRadius: 4,
                transition: "width 0.4s ease",
              }}
            />
          </div>
          <span
            style={{
              fontSize: 13,
              fontWeight: 700,
              color: barColor,
              minWidth: 32,
              textAlign: "right",
              fontFamily: "system-ui, sans-serif",
            }}
          >
            {score}
          </span>
        </div>
        <WeightSlider
          value={score}
          min={min}
          max={max}
          accentColor={barColor}
          lowLabel="Low"
          highLabel="High"
          onChange={(v) => onStateChange(stateKey, v)}
        />
      </div>
    </Card>
  );
};
