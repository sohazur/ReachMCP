import React, { useState } from "react";
import type { LayoutNode, ComponentNode, RenderProps } from "./types";
import { isContainerNode } from "./types";
import { componentRegistry } from "./componentRegistry";

interface SpecRendererProps {
  nodes: LayoutNode[];
  state: Record<string, any>;
  onStateChange: (key: string, value: any) => void;
  onDismiss: (id: string, title: string) => void;
  callTool: (name: string, args: any) => void;
  sendFollowUpMessage: (msg: string) => void;
}

function renderComponent(
  node: ComponentNode,
  index: number,
  props: Omit<SpecRendererProps, "nodes">
): React.ReactNode {
  const Component = componentRegistry[node.type];
  if (!Component) return null;
  return (
    <Component
      key={(node as any).id ?? `${node.type}-${index}`}
      node={node}
      state={props.state}
      onStateChange={props.onStateChange}
      onDismiss={props.onDismiss}
      callTool={props.callTool}
      sendFollowUpMessage={props.sendFollowUpMessage}
    />
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

  return (
    <>
      {nodes.map((node, i) => {
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
