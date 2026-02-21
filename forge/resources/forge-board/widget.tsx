import { McpUseProvider, useCallTool, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useEffect, useState, useCallback } from "react";
import "../styles.css";
import type {
  ForgeProps,
  ComparisonOption,
  Criterion,
  Score,
  Side,
  RankerItem,
  Verdict,
} from "./types";
import { propSchema } from "./types";
import { ComparisonMatrix } from "./components/ComparisonMatrix";
import { ArgumentMap } from "./components/ArgumentMap";
import { PriorityRanker } from "./components/PriorityRanker";
import { MissingInput } from "./components/MissingInput";
import { VerdictPanel } from "./components/VerdictPanel";
import { LoadingSpinner } from "./components/LoadingSpinner";

export const widgetMetadata: WidgetMetadata = {
  description: "Adaptive decision engine that renders the right tool for any problem",
  props: propSchema,
  exposeAsTool: false,
};

const ForgeBoard: React.FC = () => {
  const { props, isPending, sendFollowUpMessage } = useWidget<ForgeProps>();

  const {
    callTool: callAddFactor,
    isPending: isAddingFactor,
  } = useCallTool("add_factor");

  const {
    callTool: callGenerateVerdict,
    isPending: isGeneratingVerdict,
  } = useCallTool("generate_verdict");

  // ── Local state ──────────────────────────────────────────────────
  const [mode, setMode] = useState<"comparison" | "argument_map" | "ranker" | null>(null);
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<ComparisonOption[]>([]);
  const [criteria, setCriteria] = useState<Criterion[]>([]);
  const [scores, setScores] = useState<Score[]>([]);
  const [sideA, setSideA] = useState<Side>({ label: "", arguments: [] });
  const [sideB, setSideB] = useState<Side>({ label: "", arguments: [] });
  const [items, setItems] = useState<RankerItem[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);

  // ── Sync props → local state ─────────────────────────────────────
  useEffect(() => {
    if (!props) return;

    if (props.mode) {
      setMode(props.mode);
      setQuestion(props.question ?? "");
      if (props.options) setOptions(props.options);
      if (props.criteria) setCriteria(props.criteria);
      if (props.scores) setScores(props.scores);
      if (props.side_a) setSideA(props.side_a);
      if (props.side_b) setSideB(props.side_b);
      if (props.items) setItems(props.items);
    }

    if (props.addFactor) {
      const { mode: fm, factor_type, factor } = props.addFactor;
      if (fm === "comparison" && factor_type === "criterion") {
        setCriteria((prev) => [...prev, { id: factor.id, name: factor.title, weight: factor.weight ?? 5, description: factor.detail ?? factor.description ?? "" }]);
      } else if (fm === "argument_map") {
        if (factor_type === "argument_for_a") {
          setSideA((prev) => ({
            ...prev,
            arguments: [...prev.arguments, { id: factor.id, title: factor.title, detail: factor.detail ?? "", strength: factor.strength ?? 5 }],
          }));
        } else if (factor_type === "argument_for_b") {
          setSideB((prev) => ({
            ...prev,
            arguments: [...prev.arguments, { id: factor.id, title: factor.title, detail: factor.detail ?? "", strength: factor.strength ?? 5 }],
          }));
        }
      } else if (fm === "ranker") {
        setItems((prev) => [...prev, { id: factor.id, title: factor.title, description: factor.description ?? "", score: factor.score ?? 50, reasoning: factor.detail ?? "" }]);
      }
    }

    if (props.verdict) {
      setVerdict(props.verdict);
    }
  }, [props]);

  // ── Handlers ─────────────────────────────────────────────────────
  const handleWeightChange = useCallback(
    (criterionId: string, newWeight: number) => {
      setCriteria((prev) =>
        prev.map((c) => (c.id === criterionId ? { ...c, weight: newWeight } : c))
      );
    },
    []
  );

  const handleStrengthChange = useCallback(
    (side: "a" | "b", argId: string, newStrength: number) => {
      const setter = side === "a" ? setSideA : setSideB;
      setter((prev) => ({
        ...prev,
        arguments: prev.arguments.map((a) =>
          a.id === argId ? { ...a, strength: newStrength } : a
        ),
      }));
    },
    []
  );

  const handleDismissArg = useCallback(
    (side: "a" | "b", argId: string) => {
      const setter = side === "a" ? setSideA : setSideB;
      let dismissedTitle = "";
      setter((prev) => {
        const arg = prev.arguments.find((a) => a.id === argId);
        dismissedTitle = arg?.title ?? "";
        return { ...prev, arguments: prev.arguments.filter((a) => a.id !== argId) };
      });
      try {
        sendFollowUpMessage?.(`I just dismissed "${dismissedTitle}" from my analysis. The scores have shifted. What should I know?`);
      } catch {}
    },
    [sendFollowUpMessage]
  );

  const handleScoreChange = useCallback((itemId: string, newScore: number) => {
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, score: newScore } : it))
    );
  }, []);

  const handleDismissItem = useCallback(
    (itemId: string) => {
      let dismissedTitle = "";
      setItems((prev) => {
        const item = prev.find((it) => it.id === itemId);
        dismissedTitle = item?.title ?? "";
        return prev.filter((it) => it.id !== itemId);
      });
      try {
        sendFollowUpMessage?.(`I just removed "${dismissedTitle}" from my priority list. How does this affect the ranking?`);
      } catch {}
    },
    [sendFollowUpMessage]
  );

  const handleAskMissing = useCallback(
    (text: string) => {
      if (!mode) return;
      const factorType =
        mode === "comparison"
          ? "criterion"
          : mode === "argument_map"
          ? "argument_for_a"
          : "item";
      callAddFactor({
        mode,
        factor_type: factorType,
        factor: { id: `user-${Date.now()}`, title: text, detail: text, description: text, score: 50, strength: 5, weight: 5 },
        commentary: "",
      });
    },
    [mode, callAddFactor]
  );

  const handleVerdict = useCallback(() => {
    let winner = "";
    let confidence = 50;

    if (mode === "comparison") {
      const maxWeight = Math.max(...criteria.map((c) => c.weight), 1);
      const totals: Record<string, number> = {};
      for (const opt of options) {
        let total = 0;
        for (const crit of criteria) {
          const s = scores.find((sc) => sc.optionId === opt.id && sc.criteriaId === crit.id);
          if (s) total += s.score * (crit.weight / maxWeight);
        }
        totals[opt.id] = total;
      }
      const sorted = Object.entries(totals).sort((a, b) => b[1] - a[1]);
      const best = options.find((o) => o.id === sorted[0]?.[0]);
      winner = best?.name ?? "Unknown";
      const topScore = sorted[0]?.[1] ?? 0;
      const secondScore = sorted[1]?.[1] ?? 0;
      confidence = Math.min(95, Math.round(50 + ((topScore - secondScore) / (topScore || 1)) * 50));
    } else if (mode === "argument_map") {
      const totalA = sideA.arguments.reduce((s, a) => s + a.strength, 0);
      const totalB = sideB.arguments.reduce((s, a) => s + a.strength, 0);
      winner = totalA >= totalB ? sideA.label : sideB.label;
      const total = totalA + totalB || 1;
      confidence = Math.round((Math.max(totalA, totalB) / total) * 100);
    } else if (mode === "ranker") {
      const sorted = [...items].sort((a, b) => b.score - a.score);
      winner = sorted[0]?.title ?? "Unknown";
      confidence = sorted[0]?.score ?? 50;
    }

    callGenerateVerdict({
      winner,
      confidence,
      reasoning: `Based on your analysis of "${question}", the recommendation is ${winner}.`,
      next_steps: [
        "Review the analysis one more time",
        `Move forward with ${winner}`,
        "Set a deadline for the final decision",
      ],
    });
  }, [mode, question, criteria, options, scores, sideA, sideB, items, callGenerateVerdict]);

  // ── Render ───────────────────────────────────────────────────────
  if (isPending || !mode) {
    return <LoadingSpinner />;
  }

  return (
    <div
      style={{
        fontFamily: "system-ui, -apple-system, sans-serif",
        background: "#f8fafc",
        borderRadius: 16,
        padding: 24,
      }}
    >
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            marginBottom: 4,
          }}
        >
          <span style={{ fontSize: 20 }}>
            {mode === "comparison" ? "📊" : mode === "argument_map" ? "⚖️" : "📋"}
          </span>
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {question}
          </h2>
        </div>
        <div
          style={{
            display: "inline-block",
            background: "#eef2ff",
            color: "#667eea",
            borderRadius: 20,
            padding: "3px 12px",
            fontSize: 11,
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: 0.5,
          }}
        >
          {mode === "comparison"
            ? "Comparison Matrix"
            : mode === "argument_map"
            ? "Argument Map"
            : "Priority Ranker"}
        </div>
      </div>

      {/* Mode content */}
      {mode === "comparison" && (
        <ComparisonMatrix
          options={options}
          criteria={criteria}
          scores={scores}
          onWeightChange={handleWeightChange}
        />
      )}

      {mode === "argument_map" && (
        <ArgumentMap
          sideA={sideA}
          sideB={sideB}
          onStrengthChange={handleStrengthChange}
          onDismiss={handleDismissArg}
        />
      )}

      {mode === "ranker" && (
        <PriorityRanker
          items={items}
          onScoreChange={handleScoreChange}
          onDismiss={handleDismissItem}
        />
      )}

      {/* Shared bottom section */}
      <MissingInput onSubmit={handleAskMissing} isPending={isAddingFactor} />

      <button
        onClick={handleVerdict}
        disabled={isGeneratingVerdict}
        style={{
          width: "100%",
          marginTop: 16,
          padding: "12px 0",
          borderRadius: 12,
          border: "none",
          background: isGeneratingVerdict
            ? "#cbd5e1"
            : "linear-gradient(135deg, #667eea, #764ba2)",
          color: "#ffffff",
          fontSize: 15,
          fontWeight: 700,
          cursor: isGeneratingVerdict ? "not-allowed" : "pointer",
          fontFamily: "system-ui, sans-serif",
          transition: "opacity 0.2s",
        }}
      >
        {isGeneratingVerdict ? "Generating verdict..." : "🎯 Give me verdict"}
      </button>

      {verdict && <VerdictPanel verdict={verdict} />}
    </div>
  );
};

export default function ForgeBoardWidget() {
  return (
    <McpUseProvider autoSize>
      <ForgeBoard />
    </McpUseProvider>
  );
}
