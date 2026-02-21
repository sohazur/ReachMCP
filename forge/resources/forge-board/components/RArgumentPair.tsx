import React from "react";
import type { RenderProps, ArgumentPairNode } from "../types";
import { Card } from "./Card";
import { WeightSlider } from "./WeightSlider";

export const RArgumentPair: React.FC<RenderProps> = ({
  node,
  state,
  onStateChange,
  onDismiss,
}) => {
  const n = node as ArgumentPairNode;
  const prefix = n.stateKeyPrefix;
  const colorA = n.sideA.color ?? "#22c55e";
  const colorB = n.sideB.color ?? "#ef4444";

  // Get live strengths from state, falling back to initial values
  const getStrength = (side: "a" | "b", argId: string, initial: number) =>
    state[`${prefix}.${side}.${argId}`] ?? initial;

  // Check dismissals
  const isDismissed = (side: "a" | "b", argId: string) =>
    !!state[`dismissed.${prefix}.${side}.${argId}`];

  const argsA = n.sideA.arguments.filter((a) => !isDismissed("a", a.id));
  const argsB = n.sideB.arguments.filter((a) => !isDismissed("b", a.id));

  const totalA = argsA.reduce((s, a) => s + getStrength("a", a.id, a.strength), 0);
  const totalB = argsB.reduce((s, a) => s + getStrength("b", a.id, a.strength), 0);
  const total = totalA + totalB || 1;
  const pctA = Math.round((totalA / total) * 100);
  const pctB = 100 - pctA;

  const handleDismiss = (side: "a" | "b", argId: string, title: string) => {
    onStateChange(`dismissed.${prefix}.${side}.${argId}`, true);
    onDismiss?.(argId, title);
  };

  return (
    <div>
      {/* Conviction Meter */}
      {n.showMeter !== false && (
        <div style={{ marginBottom: 20 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              marginBottom: 6,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            <span style={{ fontSize: 13, fontWeight: 700, color: colorA }}>
              ✅ {n.sideA.label}: {pctA}%
            </span>
            <span style={{ fontSize: 13, fontWeight: 700, color: colorB }}>
              {pctB}%: 🔴 {n.sideB.label}
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
                background: colorA,
                transition: "width 0.4s ease",
              }}
            />
            <div
              style={{
                width: `${pctB}%`,
                background: colorB,
                transition: "width 0.4s ease",
              }}
            />
          </div>
        </div>
      )}

      {/* Two columns */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colorA,
              marginBottom: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            ✅ {n.sideA.label}
          </div>
          {argsA.map((arg) => (
            <Card
              key={arg.id}
              title={arg.title}
              detail={arg.detail}
              accentColor={colorA}
              onDismiss={
                n.dismissible
                  ? () => handleDismiss("a", arg.id, arg.title)
                  : undefined
              }
            >
              <WeightSlider
                value={getStrength("a", arg.id, arg.strength)}
                accentColor={colorA}
                onChange={(v) => onStateChange(`${prefix}.a.${arg.id}`, v)}
              />
            </Card>
          ))}
          {argsA.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
              All arguments dismissed
            </p>
          )}
        </div>
        <div>
          <div
            style={{
              fontSize: 14,
              fontWeight: 700,
              color: colorB,
              marginBottom: 12,
              fontFamily: "system-ui, sans-serif",
            }}
          >
            🔴 {n.sideB.label}
          </div>
          {argsB.map((arg) => (
            <Card
              key={arg.id}
              title={arg.title}
              detail={arg.detail}
              accentColor={colorB}
              onDismiss={
                n.dismissible
                  ? () => handleDismiss("b", arg.id, arg.title)
                  : undefined
              }
            >
              <WeightSlider
                value={getStrength("b", arg.id, arg.strength)}
                accentColor={colorB}
                onChange={(v) => onStateChange(`${prefix}.b.${arg.id}`, v)}
              />
            </Card>
          ))}
          {argsB.length === 0 && (
            <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic" }}>
              All arguments dismissed
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
