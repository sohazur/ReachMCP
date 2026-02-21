import { z } from "zod";

// ── Top-level UI Spec ──────────────────────────────────────────
export interface ForgeSpec {
  title: string;
  subtitle?: string;
  icon?: string;
  badge?: string;
  theme?: { accent?: string; accentSecondary?: string };
  layout: LayoutNode[];
  actions?: ActionSpec[];
  footer?: FooterSpec;
}

// ── Layout ─────────────────────────────────────────────────────
export type LayoutNode = ContainerNode | ComponentNode;

export interface ContainerNode {
  type: "row" | "columns" | "grid" | "tabs" | "stack";
  columns?: number;
  gap?: number;
  tabLabels?: string[];
  children: ComponentNode[];
}

// ── Component Nodes (leaves) ───────────────────────────────────
export type ComponentNode =
  | HeadingNode
  | TextNode
  | BadgeNode
  | DividerNode
  | CardNode
  | CardListNode
  | TableNode
  | SliderNode
  | TextInputNode
  | SelectNode
  | ToggleNode
  | ButtonNode
  | ProgressBarNode
  | MeterNode
  | ScoreableItemNode
  | ArgumentPairNode;

export interface HeadingNode {
  type: "heading";
  id?: string;
  text: string;
  level?: 1 | 2 | 3;
}

export interface TextNode {
  type: "text";
  id?: string;
  text: string;
  color?: string;
  size?: "sm" | "md" | "lg";
}

export interface BadgeNode {
  type: "badge";
  id?: string;
  text: string;
  color?: string;
}

export interface DividerNode {
  type: "divider";
  id?: string;
}

export interface CardNode {
  type: "card";
  id: string;
  title: string;
  detail?: string;
  accentColor?: string;
  dismissible?: boolean;
  children?: ComponentNode[];
}

export interface CardListNode {
  type: "card_list";
  id?: string;
  stateKey: string;
  items: Array<{
    id: string;
    title: string;
    detail?: string;
    accentColor?: string;
    dismissible?: boolean;
  }>;
}

export interface TableNode {
  type: "table";
  id?: string;
  headers: Array<{ key: string; label: string; emoji?: string }>;
  rows: Array<Record<string, string | number>>;
  highlightKey?: string;
}

export interface SliderNode {
  type: "slider";
  id?: string;
  stateKey: string;
  value: number;
  min?: number;
  max?: number;
  label?: string;
  lowLabel?: string;
  highLabel?: string;
  accentColor?: string;
}

export interface TextInputNode {
  type: "text_input";
  id?: string;
  stateKey: string;
  placeholder?: string;
  submitAction?: "add_factor" | "follow_up";
  submitMessage?: string;
}

export interface SelectNode {
  type: "select";
  id?: string;
  stateKey: string;
  options: Array<{ value: string; label: string }>;
  value?: string;
}

export interface ToggleNode {
  type: "toggle";
  id?: string;
  stateKey: string;
  label: string;
  value?: boolean;
}

export interface ButtonNode {
  type: "button";
  id?: string;
  label: string;
  action: "call_tool" | "follow_up";
  toolName?: string;
  toolArgs?: Record<string, any>;
  toolArgsFromState?: string[];
  message?: string;
  variant?: "primary" | "secondary" | "danger";
  icon?: string;
  disabled?: boolean;
}

export interface ProgressBarNode {
  type: "progress_bar";
  id?: string;
  value: number;
  label?: string;
  color?: string;
}

export interface MeterNode {
  type: "meter";
  id?: string;
  leftLabel: string;
  rightLabel: string;
  leftValue: number;
  rightValue: number;
  leftColor?: string;
  rightColor?: string;
}

export interface ScoreableItemNode {
  type: "scoreable_item";
  id: string;
  title: string;
  description?: string;
  reasoning?: string;
  score: number;
  scoreMin?: number;
  scoreMax?: number;
  stateKey: string;
  dismissible?: boolean;
  accentColor?: string;
}

export interface ArgumentPairNode {
  type: "argument_pair";
  id?: string;
  sideA: {
    label: string;
    color?: string;
    arguments: Array<{
      id: string;
      title: string;
      detail?: string;
      strength: number;
    }>;
  };
  sideB: {
    label: string;
    color?: string;
    arguments: Array<{
      id: string;
      title: string;
      detail?: string;
      strength: number;
    }>;
  };
  stateKeyPrefix: string;
  showMeter?: boolean;
  dismissible?: boolean;
}

// ── Actions & Footer ───────────────────────────────────────────
export interface ActionSpec {
  label: string;
  action: "call_tool" | "follow_up";
  toolName?: string;
  toolArgsFromState?: string[];
  message?: string;
  variant?: "primary" | "secondary";
  icon?: string;
}

export interface FooterSpec {
  type: "missing_input";
  placeholder?: string;
  action: "call_tool" | "follow_up";
  toolName?: string;
  message?: string;
}

// ── Verdict ────────────────────────────────────────────────────
export interface Verdict {
  winner: string;
  confidence: number;
  reasoning: string;
  next_steps: string[];
}

// ── Widget Props (from server tools) ───────────────────────────
export interface ForgeWidgetProps {
  action: "render" | "update" | "conclude";
  // render
  spec?: ForgeSpec;
  // update
  operation?: "add" | "remove" | "patch";
  components?: ComponentNode[];
  ids?: string[];
  patches?: Array<{ id: string; changes: Record<string, any> }>;
  // conclude
  verdict?: Verdict;
}

// ── Render Component Props (shared interface for all R* components)
export interface RenderProps {
  node: any;
  state: Record<string, any>;
  onStateChange: (key: string, value: any) => void;
  onDismiss?: (id: string, title: string) => void;
  callTool?: (name: string, args: any) => void;
  sendFollowUpMessage?: (msg: string) => void;
}

// ── State type ─────────────────────────────────────────────────
export type WidgetState = Record<string, any>;

// ── Helper: check if node is a container ───────────────────────
export function isContainerNode(node: LayoutNode): node is ContainerNode {
  return ["row", "columns", "grid", "tabs", "stack"].includes(node.type);
}

export const propSchema = z.any();
