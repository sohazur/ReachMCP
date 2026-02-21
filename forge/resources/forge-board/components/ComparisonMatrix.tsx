import React from "react";
import type { ComparisonOption, Criterion, Score } from "../types";
import { WeightSlider } from "./WeightSlider";

interface ComparisonMatrixProps {
  options: ComparisonOption[];
  criteria: Criterion[];
  scores: Score[];
  onWeightChange: (criterionId: string, newWeight: number) => void;
}

function scoreColor(score: number): { bg: string; text: string } {
  if (score <= 3) return { bg: "#fee2e2", text: "#991b1b" };
  if (score <= 6) return { bg: "#fef3c7", text: "#92400e" };
  return { bg: "#dcfce7", text: "#166534" };
}

function computeTotals(
  options: ComparisonOption[],
  criteria: Criterion[],
  scores: Score[]
): Record<string, number> {
  const totals: Record<string, number> = {};
  const maxWeight = Math.max(...criteria.map((c) => c.weight), 1);
  for (const opt of options) {
    let total = 0;
    for (const crit of criteria) {
      const s = scores.find((s) => s.optionId === opt.id && s.criteriaId === crit.id);
      if (s) total += s.score * (crit.weight / maxWeight);
    }
    totals[opt.id] = Math.round(total * 10) / 10;
  }
  return totals;
}

export const ComparisonMatrix: React.FC<ComparisonMatrixProps> = ({
  options,
  criteria,
  scores,
  onWeightChange,
}) => {
  const totals = computeTotals(options, criteria, scores);
  const winnerId = Object.entries(totals).sort((a, b) => b[1] - a[1])[0]?.[0];

  const cellStyle: React.CSSProperties = {
    padding: "10px 12px",
    textAlign: "center",
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    borderBottom: "1px solid #f1f5f9",
  };

  return (
    <div style={{ overflowX: "auto" }}>
      <table
        style={{
          width: "100%",
          borderCollapse: "collapse",
          background: "#ffffff",
          borderRadius: 12,
          overflow: "hidden",
          boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
        }}
      >
        <thead>
          <tr style={{ background: "#f8fafc" }}>
            <th
              style={{
                ...cellStyle,
                textAlign: "left",
                fontWeight: 600,
                color: "#64748b",
                width: "30%",
              }}
            >
              Criteria
            </th>
            {options.map((opt) => (
              <th
                key={opt.id}
                style={{
                  ...cellStyle,
                  fontWeight: 700,
                  color: opt.id === winnerId ? "#667eea" : "#1e293b",
                  background: opt.id === winnerId ? "#eef2ff" : "#f8fafc",
                  transition: "background 0.3s",
                }}
              >
                <span style={{ fontSize: 18 }}>{opt.emoji}</span>
                <br />
                {opt.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {criteria.map((crit) => (
            <tr key={crit.id}>
              <td style={{ ...cellStyle, textAlign: "left" }}>
                <div
                  style={{
                    fontWeight: 600,
                    color: "#1e293b",
                    fontSize: 13,
                  }}
                >
                  {crit.name}
                </div>
                <WeightSlider
                  value={crit.weight}
                  accentColor="#667eea"
                  onChange={(v) => onWeightChange(crit.id, v)}
                />
              </td>
              {options.map((opt) => {
                const s = scores.find(
                  (sc) => sc.optionId === opt.id && sc.criteriaId === crit.id
                );
                const sc = s?.score ?? 0;
                const colors = scoreColor(sc);
                return (
                  <td
                    key={opt.id}
                    style={{
                      ...cellStyle,
                      background: opt.id === winnerId ? "#fafbff" : undefined,
                    }}
                  >
                    <div
                      style={{
                        display: "inline-block",
                        background: colors.bg,
                        color: colors.text,
                        fontWeight: 700,
                        borderRadius: 8,
                        padding: "4px 10px",
                        fontSize: 14,
                        minWidth: 32,
                      }}
                    >
                      {sc}
                    </div>
                    {s?.note && (
                      <div
                        style={{
                          fontSize: 11,
                          color: "#94a3b8",
                          marginTop: 4,
                        }}
                      >
                        {s.note}
                      </div>
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
          {/* Totals row */}
          <tr style={{ background: "#f8fafc" }}>
            <td
              style={{
                ...cellStyle,
                textAlign: "left",
                fontWeight: 700,
                color: "#1e293b",
                fontSize: 14,
                borderBottom: "none",
              }}
            >
              ⚡ TOTAL
            </td>
            {options.map((opt) => (
              <td
                key={opt.id}
                style={{
                  ...cellStyle,
                  fontWeight: 800,
                  fontSize: 18,
                  color: opt.id === winnerId ? "#667eea" : "#1e293b",
                  background: opt.id === winnerId ? "#eef2ff" : undefined,
                  borderBottom: "none",
                  transition: "all 0.3s",
                }}
              >
                {totals[opt.id]}
                {opt.id === winnerId && (
                  <div style={{ fontSize: 11, color: "#667eea", fontWeight: 600, marginTop: 2 }}>
                    ★ LEADING
                  </div>
                )}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
};
