import { McpUseProvider, useCallTool, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useEffect, useState, useCallback, useRef } from "react";
import "../styles.css";
import type { ForgeSpec, Verdict, LayoutNode, ComponentNode } from "./types";
import { propSchema, isContainerNode } from "./types";
import { SpecRenderer } from "./SpecRenderer";
import { VerdictPanel } from "./components/VerdictPanel";
import { MissingInput } from "./components/MissingInput";
import { LoadingSpinner } from "./components/LoadingSpinner";

export const widgetMetadata: WidgetMetadata = {
  description: "Universal decision engine — AI generates the right interactive tool for any problem",
  props: propSchema,
  exposeAsTool: false,
};

// ── Helpers ────────────────────────────────────────────────────
function removeByIds(nodes: LayoutNode[], ids: string[]): LayoutNode[] {
  const idSet = new Set(ids);
  return nodes
    .filter((n) => !idSet.has((n as any).id))
    .map((n) => {
      if (isContainerNode(n) && n.children) {
        return { ...n, children: n.children.filter((c) => !idSet.has((c as any).id)) as ComponentNode[] };
      }
      return n;
    });
}

function patchByIds(
  nodes: LayoutNode[],
  patches: Array<{ id: string; changes: Record<string, any> }>
): LayoutNode[] {
  const patchMap = new Map(patches.map((p) => [p.id, p.changes]));
  return nodes.map((n) => {
    const nodeId = (n as any).id;
    if (nodeId && patchMap.has(nodeId)) {
      return { ...n, ...patchMap.get(nodeId) } as LayoutNode;
    }
    if (isContainerNode(n) && n.children) {
      return {
        ...n,
        children: n.children.map((c) => {
          const cId = (c as any).id;
          if (cId && patchMap.has(cId)) {
            return { ...c, ...patchMap.get(cId) } as ComponentNode;
          }
          return c;
        }),
      };
    }
    return n;
  });
}

// Try to extract a ForgeSpec from whatever shape the props might be
function tryParse(val: any): any {
  if (typeof val !== "string") return val;
  try { return JSON.parse(val); } catch { return val; }
}

function extractSpec(raw: any): ForgeSpec | null {
  if (!raw) return null;

  // If raw itself is a string, parse it
  const parsed = tryParse(raw);
  if (parsed !== raw) return extractSpec(parsed);

  // Direct spec: { title, layout, ... }
  if (raw.title && raw.layout) return raw as ForgeSpec;

  // spec field might be a string that needs parsing
  const specVal = tryParse(raw.spec);

  // Wrapped: { spec: { title, layout, ... } }
  if (specVal && specVal.title && specVal.layout) return specVal as ForgeSpec;
  // Double-wrapped: { spec: { spec: { ... } } }
  if (specVal && specVal.spec) {
    const inner = tryParse(specVal.spec);
    if (inner && inner.title && inner.layout) return inner as ForgeSpec;
  }
  // Action-wrapped: { action: "render", spec: { ... } }
  if (raw.action === "render" && specVal) {
    if (specVal.title && specVal.layout) return specVal as ForgeSpec;
  }
  return null;
}

function extractUpdate(raw: any): { operation: string; components?: any[]; ids?: string[]; patches?: any[] } | null {
  if (!raw) return null;
  if (raw.action === "update" && raw.operation) return raw;
  if (raw.operation) return raw;
  return null;
}

function extractVerdict(raw: any): Verdict | null {
  if (!raw) return null;
  if (raw.action === "conclude" && raw.verdict) return raw.verdict;
  if (raw.verdict) return raw.verdict;
  if (raw.winner && raw.reasoning) return raw as Verdict;
  return null;
}

// ── Main Component ─────────────────────────────────────────────
const ForgeBoard: React.FC = () => {
  const { props, isPending, sendFollowUpMessage } = useWidget();

  const { callTool: callForgeUpdate, isPending: isUpdating } = useCallTool("forge_update");
  const { callTool: callForgeConclude, isPending: isConcluding } = useCallTool("forge_conclude");

  const [spec, setSpec] = useState<ForgeSpec | null>(null);
  const [widgetState, setWidgetState] = useState<Record<string, any>>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>("");
  const prevTitle = useRef<string>("");

  // ── Process incoming props — flexible shape detection ───────
  useEffect(() => {
    if (!props) return;

    // Log for debugging
    try {
      setDebugInfo(JSON.stringify(props, null, 2).slice(0, 500));
    } catch { setDebugInfo("(could not serialize props)"); }

    // Try to extract a spec (handles multiple wrapper shapes)
    const incomingSpec = extractSpec(props);
    if (incomingSpec) {
      if (incomingSpec.title !== prevTitle.current) {
        setWidgetState({});
        setVerdict(null);
      }
      prevTitle.current = incomingSpec.title ?? "";
      setSpec(incomingSpec);
      return;
    }

    // Try to extract an update
    const update = extractUpdate(props);
    if (update && spec) {
      setSpec((prev) => {
        if (!prev) return prev;
        const newSpec = { ...prev, layout: [...prev.layout] };
        if (update.operation === "add" && update.components) {
          newSpec.layout = [...newSpec.layout, ...(update.components as LayoutNode[])];
        } else if (update.operation === "remove" && update.ids) {
          newSpec.layout = removeByIds(newSpec.layout, update.ids);
        } else if (update.operation === "patch" && update.patches) {
          newSpec.layout = patchByIds(newSpec.layout, update.patches);
        }
        return newSpec;
      });
      return;
    }

    // Try to extract a verdict
    const v = extractVerdict(props);
    if (v) {
      setVerdict(v);
      return;
    }
  }, [props]);

  // ── Handlers ─────────────────────────────────────────────────
  const handleStateChange = useCallback((key: string, value: any) => {
    setWidgetState((prev) => ({ ...prev, [key]: value }));
  }, []);

  const handleDismiss = useCallback(
    (id: string, title: string) => {
      setWidgetState((prev) => ({ ...prev, [`dismissed.${id}`]: true }));
      setSpec((prev) => {
        if (!prev) return prev;
        return { ...prev, layout: removeByIds(prev.layout, [id]) };
      });
      try { sendFollowUpMessage?.(`I dismissed "${title}" from my analysis. How does this change things?`); } catch {}
    },
    [sendFollowUpMessage]
  );

  const handleCallTool = useCallback(
    (toolName: string, args: any) => {
      try {
        if (toolName === "forge_update") {
          callForgeUpdate(args);
        } else if (toolName === "forge_conclude") {
          callForgeConclude({
            winner: "",
            confidence: 50,
            reasoning: "",
            next_steps: [],
            ...args,
            _widgetState: widgetState,
          });
        }
      } catch (e) {
        console.warn("[Forge] callTool error:", e);
      }
    },
    [callForgeUpdate, callForgeConclude, widgetState]
  );

  const handleSendFollowUp = useCallback(
    (msg: string) => { try { sendFollowUpMessage?.(msg); } catch {} },
    [sendFollowUpMessage]
  );

  const handleMissingInput = useCallback(
    (text: string) => {
      if (!spec) return;
      try {
        callForgeUpdate({
          operation: "add",
          components: [
            { type: "card", id: `user-${Date.now()}`, title: text, dismissible: true, accentColor: "#667eea" },
          ],
          commentary: `User added: "${text}"`,
        });
      } catch {}
    },
    [spec, callForgeUpdate]
  );

  const handleAction = useCallback(
    (action: any) => {
      if (action.action === "call_tool" && action.toolName) {
        const args: Record<string, any> = {};
        if (action.toolArgsFromState) {
          for (const prefix of action.toolArgsFromState) {
            for (const [k, v] of Object.entries(widgetState)) {
              if (k === prefix || k.startsWith(prefix + ".")) {
                args[k] = v;
              }
            }
          }
        }
        handleCallTool(action.toolName, args);
      } else if (action.action === "follow_up" && action.message) {
        handleSendFollowUp(action.message);
      }
    },
    [widgetState, handleCallTool, handleSendFollowUp]
  );

  // ── Render: Loading ────────────────────────────────────────
  if (isPending) {
    return <LoadingSpinner message="Building your workspace..." />;
  }

  // ── Render: No spec yet — show debug info ──────────────────
  if (!spec) {
    return (
      <div style={{ fontFamily: "system-ui, sans-serif", padding: 24, background: "#f8fafc", borderRadius: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 700, color: "#1e293b", marginBottom: 8 }}>
          ⚡ Forge — Waiting for spec
        </div>
        <p style={{ fontSize: 13, color: "#64748b", marginBottom: 12 }}>
          The widget loaded but no valid spec was detected in the props.
        </p>
        {debugInfo && (
          <details>
            <summary style={{ fontSize: 12, color: "#94a3b8", cursor: "pointer" }}>
              Debug: Raw props received
            </summary>
            <pre style={{
              fontSize: 11, color: "#475569", background: "#f1f5f9",
              padding: 12, borderRadius: 8, overflow: "auto", maxHeight: 200,
              marginTop: 8,
            }}>
              {debugInfo}
            </pre>
          </details>
        )}
      </div>
    );
  }

  // ── Render: Full widget ────────────────────────────────────
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
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
          {spec.icon && <span style={{ fontSize: 20 }}>{spec.icon}</span>}
          <h2 style={{ fontSize: 18, fontWeight: 700, color: "#1e293b", margin: 0 }}>
            {spec.title}
          </h2>
        </div>
        {spec.badge && (
          <div
            style={{
              display: "inline-block",
              background: spec.theme?.accent ? `${spec.theme.accent}20` : "#eef2ff",
              color: spec.theme?.accent ?? "#667eea",
              borderRadius: 20,
              padding: "3px 12px",
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: 0.5,
              marginBottom: 4,
            }}
          >
            {spec.badge}
          </div>
        )}
        {spec.subtitle && (
          <p style={{ fontSize: 14, color: "#64748b", margin: "4px 0 0" }}>
            {spec.subtitle}
          </p>
        )}
      </div>

      {/* Dynamic Layout */}
      {spec.layout && spec.layout.length > 0 ? (
        <SpecRenderer
          nodes={spec.layout}
          state={widgetState}
          onStateChange={handleStateChange}
          onDismiss={handleDismiss}
          callTool={handleCallTool}
          sendFollowUpMessage={handleSendFollowUp}
        />
      ) : (
        <p style={{ color: "#94a3b8", fontSize: 13, fontStyle: "italic", padding: 16, textAlign: "center" }}>
          No layout components to display
        </p>
      )}

      {/* Footer */}
      {spec.footer && (
        <MissingInput onSubmit={handleMissingInput} isPending={isUpdating} />
      )}

      {/* Action buttons */}
      {spec.actions && spec.actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {spec.actions.map((action, i) => {
            const isPrimary = action.variant === "primary";
            const isActionPending = action.toolName === "forge_conclude" ? isConcluding : isUpdating;
            return (
              <button
                key={i}
                onClick={() => handleAction(action)}
                disabled={isActionPending}
                style={{
                  flex: isPrimary ? 1 : undefined,
                  padding: "12px 20px",
                  borderRadius: 12,
                  border: "none",
                  background: isActionPending
                    ? "#cbd5e1"
                    : isPrimary
                    ? "linear-gradient(135deg, #667eea, #764ba2)"
                    : "#f1f5f9",
                  color: isPrimary ? "#ffffff" : "#475569",
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: isActionPending ? "not-allowed" : "pointer",
                  fontFamily: "system-ui, sans-serif",
                  transition: "opacity 0.2s",
                }}
              >
                {action.icon && <span style={{ marginRight: 6 }}>{action.icon}</span>}
                {isActionPending ? "Working..." : action.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Verdict */}
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
