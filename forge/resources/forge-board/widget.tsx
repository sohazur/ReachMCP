import { McpUseProvider, useCallTool, useWidget, type WidgetMetadata } from "mcp-use/react";
import React, { useEffect, useState, useCallback, useRef } from "react";
import "../styles.css";
import type { ForgeWidgetProps, ForgeSpec, Verdict, LayoutNode, ComponentNode } from "./types";
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

// ── Main Component ─────────────────────────────────────────────
const ForgeBoard: React.FC = () => {
  const { props, isPending, sendFollowUpMessage } = useWidget<ForgeWidgetProps>();

  const { callTool: callForgeUpdate, isPending: isUpdating } = useCallTool("forge_update");
  const { callTool: callForgeConclude, isPending: isConcluding } = useCallTool("forge_conclude");

  // Core state
  const [spec, setSpec] = useState<ForgeSpec | null>(null);
  const [widgetState, setWidgetState] = useState<Record<string, any>>({});
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const prevTitle = useRef<string>("");

  // ── Process incoming props ─────────────────────────────────
  useEffect(() => {
    if (!props) return;

    // Handle both direct spec and action-based props
    const action = (props as any).action;
    const incomingSpec = (props as any).spec;

    if (action === "render" && incomingSpec) {
      if (incomingSpec.title !== prevTitle.current) {
        setWidgetState({});
        setVerdict(null);
      }
      prevTitle.current = incomingSpec.title ?? "";
      setSpec(incomingSpec);
    } else if (action === "update") {
      setSpec((prev) => {
        if (!prev) return prev;
        const newSpec = { ...prev, layout: [...prev.layout] };
        const op = (props as any).operation;
        if (op === "add" && (props as any).components) {
          newSpec.layout = [...newSpec.layout, ...((props as any).components as LayoutNode[])];
        } else if (op === "remove" && (props as any).ids) {
          newSpec.layout = removeByIds(newSpec.layout, (props as any).ids);
        } else if (op === "patch" && (props as any).patches) {
          newSpec.layout = patchByIds(newSpec.layout, (props as any).patches);
        }
        return newSpec;
      });
    } else if (action === "conclude" && (props as any).verdict) {
      setVerdict((props as any).verdict);
    }
  }, [props]);

  // ── State change handler ───────────────────────────────────
  const handleStateChange = useCallback((key: string, value: any) => {
    setWidgetState((prev) => ({ ...prev, [key]: value }));
  }, []);

  // ── Dismiss handler ────────────────────────────────────────
  const handleDismiss = useCallback(
    (id: string, title: string) => {
      setWidgetState((prev) => ({ ...prev, [`dismissed.${id}`]: true }));
      setSpec((prev) => {
        if (!prev) return prev;
        return { ...prev, layout: removeByIds(prev.layout, [id]) };
      });
      try {
        sendFollowUpMessage?.(`I dismissed "${title}" from my analysis. How does this change things?`);
      } catch {}
    },
    [sendFollowUpMessage]
  );

  // ── Tool call handler (dynamic) ────────────────────────────
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

  // ── Handle follow-up message ───────────────────────────────
  const handleSendFollowUp = useCallback(
    (msg: string) => {
      try {
        sendFollowUpMessage?.(msg);
      } catch {}
    },
    [sendFollowUpMessage]
  );

  // ── Handle footer "What am I missing?" ─────────────────────
  const handleMissingInput = useCallback(
    (text: string) => {
      if (!spec) return;
      try {
        callForgeUpdate({
          operation: "add",
          components: [
            {
              type: "card",
              id: `user-${Date.now()}`,
              title: text,
              dismissible: true,
              accentColor: "#667eea",
            },
          ],
          commentary: `User added: "${text}"`,
        });
      } catch (e) {
        console.warn("[Forge] Missing input call error:", e);
      }
    },
    [spec, callForgeUpdate]
  );

  // ── Handle action buttons ──────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────
  if (isPending || !spec) {
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
      <SpecRenderer
        nodes={spec.layout}
        state={widgetState}
        onStateChange={handleStateChange}
        onDismiss={handleDismiss}
        callTool={handleCallTool}
        sendFollowUpMessage={handleSendFollowUp}
      />

      {/* Footer: "What am I missing?" */}
      {spec.footer && (
        <MissingInput
          onSubmit={handleMissingInput}
          isPending={isUpdating}
        />
      )}

      {/* Action buttons */}
      {spec.actions && spec.actions.length > 0 && (
        <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
          {spec.actions.map((action, i) => {
            const isPrimary = action.variant === "primary";
            const isActionPending =
              action.toolName === "forge_conclude" ? isConcluding : isUpdating;
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

      {/* Verdict panel */}
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
