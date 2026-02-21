import React from "react";
import type { RankerItem } from "../types";
import { Card } from "./Card";
import { WeightSlider } from "./WeightSlider";

interface PriorityRankerProps {
  items: RankerItem[];
  onScoreChange: (itemId: string, newScore: number) => void;
  onDismiss: (itemId: string) => void;
}

export const PriorityRanker: React.FC<PriorityRankerProps> = ({
  items,
  onScoreChange,
  onDismiss,
}) => {
  const sorted = [...items].sort((a, b) => b.score - a.score);

  return (
    <div>
      {sorted.map((item, i) => {
        const pct = item.score;
        const hue = (pct / 100) * 120; // 0=red, 120=green
        const barColor = `hsl(${hue}, 70%, 50%)`;

        return (
          <Card
            key={item.id}
            title={`#${i + 1}  ${item.title}`}
            detail={item.reasoning}
            accentColor={barColor}
            onDismiss={() => onDismiss(item.id)}
          >
            <div style={{ marginTop: 8 }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 4,
                }}
              >
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
                  {pct}
                </span>
              </div>
              <p
                style={{
                  fontSize: 12,
                  color: "#64748b",
                  margin: 0,
                  fontFamily: "system-ui, sans-serif",
                }}
              >
                {item.description}
              </p>
              <WeightSlider
                value={pct}
                min={0}
                max={100}
                accentColor={barColor}
                lowLabel="Low"
                highLabel="High"
                onChange={(v) => onScoreChange(item.id, v)}
              />
            </div>
          </Card>
        );
      })}
      {items.length === 0 && (
        <p
          style={{
            color: "#94a3b8",
            fontSize: 13,
            fontStyle: "italic",
            textAlign: "center",
            padding: 24,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          All items dismissed
        </p>
      )}
    </div>
  );
};
