import React from "react";
import type { RenderProps, TableNode } from "../types";

function cellColor(val: string | number): { bg?: string; text?: string } | null {
  const num = typeof val === "number" ? val : parseInt(String(val));
  if (isNaN(num)) return null;
  if (num <= 3) return { bg: "#fee2e2", text: "#991b1b" };
  if (num <= 6) return { bg: "#fef3c7", text: "#92400e" };
  if (num <= 10) return { bg: "#dcfce7", text: "#166534" };
  return null;
}

export const RTable: React.FC<RenderProps> = ({ node }) => {
  const n = node as TableNode;
  const cell: React.CSSProperties = {
    padding: "10px 12px",
    textAlign: "center",
    fontSize: 13,
    fontFamily: "system-ui, sans-serif",
    borderBottom: "1px solid #f1f5f9",
  };

  // Find which column has the highest total for highlighting
  let highlightCol: string | undefined;
  if (n.highlightKey) {
    highlightCol = n.highlightKey;
  }

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
            {n.headers.map((h) => (
              <th
                key={h.key}
                style={{
                  ...cell,
                  fontWeight: 700,
                  color: h.key === highlightCol ? "#667eea" : "#1e293b",
                  background: h.key === highlightCol ? "#eef2ff" : "#f8fafc",
                  textAlign: h.key === n.headers[0]?.key ? "left" : "center",
                }}
              >
                {h.emoji && <span style={{ fontSize: 16 }}>{h.emoji} </span>}
                {h.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {n.rows.map((row, i) => (
            <tr key={i}>
              {n.headers.map((h, j) => {
                const val = row[h.key] ?? "";
                const colors = cellColor(val);
                return (
                  <td
                    key={h.key}
                    style={{
                      ...cell,
                      textAlign: j === 0 ? "left" : "center",
                      fontWeight: j === 0 ? 600 : 400,
                      background: h.key === highlightCol ? "#fafbff" : undefined,
                    }}
                  >
                    {colors ? (
                      <span
                        style={{
                          display: "inline-block",
                          background: colors.bg,
                          color: colors.text,
                          fontWeight: 700,
                          borderRadius: 8,
                          padding: "3px 10px",
                          fontSize: 13,
                        }}
                      >
                        {val}
                      </span>
                    ) : (
                      val
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
