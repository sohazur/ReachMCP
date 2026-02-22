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
          Could not render: {this.props.fallback}
        </div>
      );
    }
    return this.props.children;
  }
}

// ── Unified node renderer — handles both containers and leaves ──
function renderNode(
  node: LayoutNode,
  index: number,
  props: Omit<SpecRendererProps, "nodes">
): React.ReactNode {
  if (!node || !node.type) return null;

  // If it's a container, render the container wrapper + recurse into children
  if (isContainerNode(node)) {
    return renderContainer(node, index, props);
  }

  // Otherwise it's a leaf component
  return renderLeaf(node as ComponentNode, index, props);
}

function renderLeaf(
  node: ComponentNode,
  index: number,
  props: Omit<SpecRendererProps, "nodes">
): React.ReactNode {
  if (!node || !node.type) return null;
  const Component = componentRegistry[node.type];
  if (!Component) {
    // Silently skip unknown types rather than showing error text
    return null;
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

function renderContainer(
  node: any,
  index: number,
  props: Omit<SpecRendererProps, "nodes">
): React.ReactNode {
  const gap = node.gap ?? 16;
  const children: LayoutNode[] = node.children ?? [];
  const key = (node as any).id ?? `container-${node.type}-${index}`;

  if (node.type === "tabs" && node.tabLabels) {
    return (
      <TabContainer
        key={key}
        labels={node.tabLabels}
        children={children}
        renderProps={props}
      />
    );
  }

  if (node.type === "columns" || node.type === "grid") {
    return (
      <div
        key={key}
        style={{
          display: "grid",
          gridTemplateColumns: `repeat(${node.columns ?? 2}, 1fr)`,
          gap,
        }}
      >
        {children.map((child, j) => renderNode(child, j, props))}
      </div>
    );
  }

  if (node.type === "row") {
    return (
      <div
        key={key}
        style={{
          display: "flex",
          flexDirection: "row",
          gap,
          alignItems: "flex-start",
          flexWrap: "wrap",
        }}
      >
        {children.map((child, j) => renderNode(child, j, props))}
      </div>
    );
  }

  // stack (default container)
  return (
    <div
      key={key}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: node.gap ?? 12,
      }}
    >
      {children.map((child, j) => renderNode(child, j, props))}
    </div>
  );
}

const TabContainer: React.FC<{
  labels: string[];
  children: LayoutNode[];
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
              background: i === activeTab ? "#2563EB" : "#f1f5f9",
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
          renderNode(child, activeTab * perTab + i, renderProps)
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
      {nodes.map((node, i) => renderNode(node, i, renderProps))}
    </>
  );
};
