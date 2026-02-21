import React from "react";
import type { Side } from "../types";
import { Card } from "./Card";
import { WeightSlider } from "./WeightSlider";

interface ArgumentMapProps {
  sideA: Side;
  sideB: Side;
  onStrengthChange: (side: "a" | "b", argId: string, newStrength: number) => void;
  onDismiss: (side: "a" | "b", argId: string) => void;
}

function totalStrength(side: Side): number {
  return side.arguments.reduce((sum, a) => sum + a.strength, 0);
}

const ConvictionMeter: React.FC<{ sideA: Side; sideB: Side }> = ({ sideA, sideB }) => {
  const totalA = totalStrength(sideA);
  const totalB = totalStrength(sideB);
  const total = totalA + totalB || 1;
  const pctA = Math.round((totalA / total) * 100);
  const pctB = 100 - pctA;

  return (
    <div style={{ marginBottom: 20 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          marginBottom: 6,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <span style={{ fontSize: 13, fontWeight: 700, color: "#22c55e" }}>
          ✅ {sideA.label}: {pctA}%
        </span>
        <span style={{ fontSize: 13, fontWeight: 700, color: "#ef4444" }}>
          {pctB}% :🔴 {sideB.label}
        </span>
      </div>
      <div
        style={{
          display: "flex",
          height: 8,
          borderRadius: 4,
          overflow: "hidden",
          background: "#f1f5f9",
        }}
      >
        <div
          style={{
            width: `${pctA}%`,
            background: "linear-gradient(90deg, #22c55e, #4ade80)",
            transition: "width 0.4s ease",
            borderRadius: "4px 0 0 4px",
          }}
        />
        <div
          style={{
            width: `${pctB}%`,
            background: "linear-gradient(90deg, #f87171, #ef4444)",
            transition: "width 0.4s ease",
            borderRadius: "0 4px 4px 0",
          }}
        />
      </div>
    </div>
  );
};

export const ArgumentMap: React.FC<ArgumentMapProps> = ({
  sideA,
  sideB,
  onStrengthChange,
  onDismiss,
}) => (
  <div>
    <ConvictionMeter sideA={sideA} sideB={sideB} />
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
      {/* Side A */}
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#22c55e",
            marginBottom: 12,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          ✅ {sideA.label}
        </div>
        {sideA.arguments.map((arg) => (
          <Card
            key={arg.id}
            title={arg.title}
            detail={arg.detail}
            accentColor="#22c55e"
            onDismiss={() => onDismiss("a", arg.id)}
          >
            <WeightSlider
              value={arg.strength}
              accentColor="#22c55e"
              onChange={(v) => onStrengthChange("a", arg.id, v)}
            />
          </Card>
        ))}
        {sideA.arguments.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", fontFamily: "system-ui, sans-serif" }}>
            All arguments dismissed
          </p>
        )}
      </div>
      {/* Side B */}
      <div>
        <div
          style={{
            fontSize: 14,
            fontWeight: 700,
            color: "#ef4444",
            marginBottom: 12,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          🔴 {sideB.label}
        </div>
        {sideB.arguments.map((arg) => (
          <Card
            key={arg.id}
            title={arg.title}
            detail={arg.detail}
            accentColor="#ef4444"
            onDismiss={() => onDismiss("b", arg.id)}
          >
            <WeightSlider
              value={arg.strength}
              accentColor="#ef4444"
              onChange={(v) => onStrengthChange("b", arg.id, v)}
            />
          </Card>
        ))}
        {sideB.arguments.length === 0 && (
          <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", fontFamily: "system-ui, sans-serif" }}>
            All arguments dismissed
          </p>
        )}
      </div>
    </div>
  </div>
);
