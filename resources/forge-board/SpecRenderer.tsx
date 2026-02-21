import React, { useState, Component, type ErrorInfo, type ReactNode } from "react";
import type { LayoutNode, ComponentNode } from "./types";
import { isContainerNode } from "./types";
import { componentRegistry } from "./componentRegistry";

export interface SpecRendererProps {
  nodes: LayoutNode[];
  state: Record<string, any>;
  onStateChange: (key: string, value: any) => void;
  onDismiss: (id: string, title: string) => void;
  callTool?: (name: string, args: any) => void;
  sendFollowUpMessage?: (msg: string) => void;
}

// ── Error boundary for individual components ───────────────────
class ComponentErrorBoundary extends Component<
  { fallback: string; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn("[Forge] Component render error:", error.message, info.componentStack);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 8,
            fontSize: 12,
            color: "#94a3b8",
            fontStyle: "italic",
            fontFamily: "system-ui, sans-serif",
          }}
        >
          ⚠ Could not render: {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

function renderComponent(
  node: ComponentNode,
  index: number,
  props: Omit<SpecRendererProps, "nodes">
): React.ReactNode {
  if (!node || !node.type) return null;
  const Component = componentRegistry[node.type];
  if (!Component) {
    return (
      <div
        key={`unknown-${index}`}
        style={{ padding: 4, fontSize: 11, color: "#94a3b8", fontFamily: "system-ui" }}
      >
        Unknown component: {node.type}
      </div>
    );
  }
  const key = (node as any).id ?? `${node.type}-${index}`;
  return (
    <ComponentErrorBoundary key={key} fallback={`${node.type} component`}>
      <Component
        node={node}
        state={props.state}
        onStateChange={props.onStateChange}
        onDismiss={props.onDismiss}
        callTool={props.callTool}
        sendFollowUpMessage={props.sendFollowUpMessage}
      />
    </ComponentErrorBoundary>
  );
}

const TabContainer: React.FC<{
  labels: string[];
  children: ComponentNode[];
  renderProps: Omit<SpecRendererProps, "nodes">;
}> = ({ labels, children, renderProps }) => {
  const [activeTab, setActiveTab] = useState(0);
  const perTab = Math.ceil(children.length / (labels.length || 1));

  return (
    <div>
      <div style={{ display: "flex", gap: 4, marginBottom: 12 }}>
        {labels.map((label, i) => (
          <button
            key={i}
            onClick={() => setActiveTab(i)}
            style={{
              padding: "8px 16px",
              borderRadius: 8,
              border: "none",
              background: i === activeTab ? "#667eea" : "#f1f5f9",
              color: i === activeTab ? "#ffffff" : "#64748b",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "system-ui, sans-serif",
              transition: "all 0.2s",
            }}
          >
            {label}
          </button>
        ))}
      </div>
      <div>
        {children.slice(activeTab * perTab, (activeTab + 1) * perTab).map((child, i) =>
          renderComponent(child, activeTab * perTab + i, renderProps)
        )}
      </div>
    </div>
  );
};

export const SpecRenderer: React.FC<SpecRendererProps> = ({
  nodes,
  state,
  onStateChange,
  onDismiss,
  callTool,
  sendFollowUpMessage,
}) => {
  const renderProps = { state, onStateChange, onDismiss, callTool, sendFollowUpMessage };

  if (!nodes || !Array.isArray(nodes)) {
    return null;
  }

  return (
    <>
      {nodes.map((node, i) => {
        if (!node || !node.type) return null;

        if (isContainerNode(node)) {
          const gap = node.gap ?? 16;
          const children = node.children ?? [];

          if (node.type === "tabs" && node.tabLabels) {
            return (
              <TabContainer
                key={i}
                labels={node.tabLabels}
                children={children}
                renderProps={renderProps}
              />
            );
          }

          if (node.type === "columns" || node.type === "grid") {
            return (
              <div
                key={i}
                style={{
                  display: "grid",
                  gridTemplateColumns: `repeat(${node.columns ?? 2}, 1fr)`,
                  gap,
                }}
              >
                {children.map((child, j) => renderComponent(child, j, renderProps))}
              </div>
            );
          }

          if (node.type === "row") {
            return (
              <div
                key={i}
                style={{
                  display: "flex",
                  flexDirection: "row",
                  gap,
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                {children.map((child, j) => renderComponent(child, j, renderProps))}
              </div>
            );
          }

          // stack (default)
          return (
            <div
              key={i}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: node.gap ?? 12,
              }}
            >
              {children.map((child, j) => renderComponent(child, j, renderProps))}
            </div>
          );
        }

        // Leaf component
        return renderComponent(node as ComponentNode, i, renderProps);
      })}
    </>
  );
};
