import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "forge",
  title: "Forge",
  version: "2.0.0",
  description:
    "The last MCP App — AI generates the right interactive tool for any problem",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    { src: "icon.svg", mimeType: "image/svg+xml", sizes: ["512x512"] },
  ],
});

// ── Tool 1: forge_view ─────────────────────────────────────────
server.tool(
  {
    name: "forge_view",
    description: `Generate an interactive visual workspace for any decision, analysis, brainstorm, or thinking task. You design the UI by outputting a JSON spec. The widget renders it dynamically.

SPEC STRUCTURE:
{
  "title": "The question or task",
  "subtitle": "Brief context (optional)",
  "icon": "emoji (optional)",
  "badge": "Mode label like 'Comparison Matrix' (optional)",
  "layout": [ ...component nodes... ],
  "actions": [ ...action buttons... ],
  "footer": { "type": "missing_input", "placeholder": "What am I missing?", "action": "call_tool", "toolName": "forge_update" }
}

LAYOUT COMPONENT TYPES:

Containers (hold children array, max 1 level deep):
- { "type": "columns", "columns": 2, "gap": 16, "children": [...] }
- { "type": "stack", "gap": 12, "children": [...] }
- { "type": "tabs", "tabLabels": ["Tab1","Tab2"], "children": [...] } — children split evenly across tabs
- { "type": "grid", "columns": 3, "gap": 12, "children": [...] }

Content:
- { "type": "heading", "text": "Section Title", "level": 2 }
- { "type": "text", "text": "Paragraph content", "size": "sm"|"md"|"lg", "color": "#hex" }
- { "type": "badge", "text": "Label", "color": "#hex" }
- { "type": "divider" }

Data display:
- { "type": "card", "id": "unique", "title": "Card Title", "detail": "Expandable detail", "accentColor": "#hex", "dismissible": true }
- { "type": "card_list", "stateKey": "items", "items": [{"id":"1","title":"Item","detail":"...","dismissible":true}] }
- { "type": "table", "headers": [{"key":"col1","label":"Column 1","emoji":"📊"}], "rows": [{"col1":"value"}], "highlightKey": "col1" }

Inputs (each has a stateKey for automatic state binding):
- { "type": "slider", "stateKey": "weights.price", "value": 5, "min": 1, "max": 10, "label": "Price Weight", "lowLabel": "Low", "highLabel": "High", "accentColor": "#hex" }
- { "type": "text_input", "stateKey": "notes", "placeholder": "Add a note..." }
- { "type": "select", "stateKey": "filter", "options": [{"value":"all","label":"All"}], "value": "all" }
- { "type": "toggle", "stateKey": "show_details", "label": "Show details", "value": false }
- { "type": "button", "label": "Click me", "action": "call_tool"|"follow_up", "toolName": "forge_conclude", "variant": "primary"|"secondary"|"danger", "toolArgsFromState": ["weights"] }

Visualization:
- { "type": "progress_bar", "value": 75, "label": "Progress", "color": "#22c55e" }
- { "type": "meter", "leftLabel": "Yes 60%", "rightLabel": "No 40%", "leftValue": 60, "rightValue": 40, "leftColor": "#22c55e", "rightColor": "#ef4444" }

Composites (high-level patterns):
- { "type": "scoreable_item", "id": "feat1", "title": "Feature", "description": "Details", "reasoning": "Why this score", "score": 80, "scoreMin": 0, "scoreMax": 100, "stateKey": "scores", "dismissible": true }
- { "type": "argument_pair", "sideA": {"label":"For","color":"#22c55e","arguments":[{"id":"a1","title":"Point","detail":"...","strength":7}]}, "sideB": {"label":"Against","color":"#ef4444","arguments":[...]}, "stateKeyPrefix": "args", "showMeter": true, "dismissible": true }

ACTIONS (bottom buttons):
[{ "label": "🎯 Give me verdict", "action": "call_tool", "toolName": "forge_conclude", "variant": "primary", "toolArgsFromState": ["weights","scores"] }]

STATE KEYS: Interactive components use stateKey. Sliders write state[stateKey] = value. Composites write state[stateKey + "." + id] = value. Action buttons can read state via toolArgsFromState.

DESIGN GUIDELINES:
- Pick the layout that best fits the problem (columns for comparisons, stack for lists, argument_pair for yes/no decisions)
- Use scoreable_item for prioritization/ranking tasks
- Use argument_pair for binary decisions with pros/cons
- Use table + sliders for multi-option weighted comparisons
- Use card_list for brainstorming/ideation
- Always include a footer with "What am I missing?" and at least one action button
- Use descriptive stateKeys so the AI can reference user preferences later`,
    schema: z.object({
      spec: z.any().describe("The UI spec JSON object"),
      analysis: z
        .string()
        .describe("2-3 sentence text analysis for the conversation"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Building your workspace...",
      invoked: "Workspace ready",
    },
  },
  async ({ spec, analysis }) => {
    return widget({
      props: { action: "render", spec },
      output: text(analysis),
      message: analysis,
    });
  }
);

// ── Tool 2: forge_update ───────────────────────────────────────
server.tool(
  {
    name: "forge_update",
    description: `Update the current Forge workspace by adding, removing, or modifying components.

Operations:
- "add": Add new component nodes to the layout. Provide the components array.
- "remove": Remove components by id. Provide the ids array.
- "patch": Update specific fields of existing components by id. Provide patches array of {id, changes} objects.

This is called when the user adds a new consideration via the "What am I missing?" input, or when you need to modify the current view.`,
    schema: z.object({
      operation: z
        .enum(["add", "remove", "patch"])
        .describe("What kind of update"),
      components: z
        .any()
        .optional()
        .describe("For 'add': array of component nodes"),
      ids: z
        .array(z.string())
        .optional()
        .describe("For 'remove': component ids to remove"),
      patches: z
        .any()
        .optional()
        .describe("For 'patch': array of {id, changes}"),
      commentary: z
        .string()
        .describe("Brief commentary about this update"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Updating workspace...",
      invoked: "Updated",
    },
  },
  async ({ operation, components, ids, patches, commentary }) => {
    return widget({
      props: { action: "update", operation, components, ids, patches },
      output: text(commentary),
      message: commentary,
    });
  }
);

// ── Tool 3: forge_conclude ─────────────────────────────────────
server.tool(
  {
    name: "forge_conclude",
    description: `Generate a conclusion, verdict, or summary for the current analysis. Reference the specific factors the user weighted highest or interacted with most. The widget displays this as a prominent verdict panel.`,
    schema: z.object({
      winner: z
        .string()
        .describe("The recommended option, decision, or top priority"),
      confidence: z
        .number()
        .min(1)
        .max(100)
        .describe("Confidence percentage"),
      reasoning: z
        .string()
        .describe("3-4 sentence personalized recommendation"),
      next_steps: z
        .array(z.string())
        .describe("3 concrete next steps"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Generating conclusion...",
      invoked: "Conclusion ready",
    },
  },
  async ({ winner, confidence, reasoning, next_steps }) => {
    return widget({
      props: {
        action: "conclude",
        verdict: { winner, confidence, reasoning, next_steps },
      },
      output: text(reasoning),
      message: reasoning,
    });
  }
);

server.listen().then(() => {
  console.log("Forge v2 server running");
});
