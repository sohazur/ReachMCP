import { MCPServer, text, widget, object, error, oauthCustomProvider } from "mcp-use/server";
import { z } from "zod";
import { createRemoteJWKSet, jwtVerify } from "jose";
import {
  db,
  collection,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  firestoreLimit,
  serverTimestamp,
  increment,
  SESSIONS_COLLECTION,
  USERS_COLLECTION,
  CONNECTED_MCPS_COLLECTION,
} from "./firebase.js";

// ── Auth via Google OAuth (Firebase-compatible) ────────────────
// Uses Google's standard OAuth2 endpoints (every Firebase project has Google Sign-In)
// Verifies tokens using Google's public JWKS — NO service account needed
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const googleOAuth = GOOGLE_CLIENT_ID
  ? oauthCustomProvider({
      issuer: "https://accounts.google.com",
      jwksUrl: "https://www.googleapis.com/oauth2/v3/certs",
      authEndpoint: "https://accounts.google.com/o/oauth2/v2/auth",
      tokenEndpoint: "https://oauth2.googleapis.com/token",
      scopesSupported: ["openid", "email", "profile"],
      verifyToken: async (token: string) => {
        // Try verifying as a Google ID token (JWT)
        try {
          const result = await jwtVerify(token, GOOGLE_JWKS, {
            issuer: "https://accounts.google.com",
            audience: GOOGLE_CLIENT_ID,
          });
          return result;
        } catch {
          // Fallback: verify as access token via Google's tokeninfo endpoint
          const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${token}`);
          if (!res.ok) throw new Error("Invalid token");
          const data = await res.json();
          return { payload: data };
        }
      },
      getUserInfo: (payload: Record<string, unknown>) => ({
        userId: payload.sub as string,
        email: payload.email as string,
        name: (payload.name as string) || (payload.email as string)?.split("@")[0],
        picture: payload.picture as string | undefined,
      }),
    })
  : undefined;

// ── Server Setup ───────────────────────────────────────────────
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
  ...(googleOAuth ? { oauth: googleOAuth } : {}),
});

// ── Helper: Get user ID from context (works with or without auth) ──
function getUserId(ctx: any): string | null {
  try {
    return ctx?.auth?.user?.userId || null;
  } catch {
    return null;
  }
}

// ══════════════════════════════════════════════════════════════════
// CORE TOOLS
// ══════════════════════════════════════════════════════════════════

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
[{ "label": "Give me verdict", "action": "call_tool", "toolName": "forge_conclude", "variant": "primary", "toolArgsFromState": ["weights","scores"] }]

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
    description: `Generate a conclusion, verdict, or summary for the current analysis. Reference the specific factors the user weighted highest or interacted with most. The widget displays this as a prominent verdict panel.

When called from widget buttons, extra fields _userContext, _request, and _allState may be present with the user's current workspace state. Use this context to generate a meaningful summary.`,
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
      _userContext: z
        .string()
        .optional()
        .describe("Widget state summary (auto-provided by widget)"),
      _request: z
        .string()
        .optional()
        .describe("User's request from the button (auto-provided by widget)"),
      _allState: z
        .any()
        .optional()
        .describe("Full widget state object (auto-provided by widget)"),
      _widgetState: z
        .any()
        .optional()
        .describe("Widget state from action buttons"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Generating conclusion...",
      invoked: "Conclusion ready",
    },
  },
  async ({ winner, confidence, reasoning, next_steps, _userContext, _request, _allState, _widgetState }) => {
    // When called from widget buttons (follow_up converted to call_tool),
    // the AI fields may be empty. Generate a summary from the state.
    const state = _allState || _widgetState || {};
    const stateEntries = Object.entries(state)
      .filter(([k, v]) => !k.startsWith("_") && !k.startsWith("dismissed.") && v !== "" && v !== undefined)
      .map(([k, v]) => `${k.replace(/\./g, " > ").replace(/_/g, " ")}: ${v}`);

    const generatedWinner = winner || (stateEntries.length > 0
      ? `Summary of ${stateEntries.length} selected items`
      : "Your workspace analysis");

    const generatedReasoning = reasoning || (stateEntries.length > 0
      ? `Based on your selections: ${stateEntries.slice(0, 5).join("; ")}${stateEntries.length > 5 ? ` and ${stateEntries.length - 5} more factors` : ""}.${_request ? ` Request: ${_request}` : ""}`
      : _userContext || "No specific inputs recorded yet. Add some selections and try again.");

    const generatedSteps = next_steps.length > 0 ? next_steps : [
      "Review the selections above",
      "Adjust any weights or priorities",
      "Click 'Give me verdict' for a detailed analysis",
    ];

    const verdict = {
      winner: generatedWinner,
      confidence: confidence || Math.min(95, 50 + stateEntries.length * 5),
      reasoning: generatedReasoning,
      next_steps: generatedSteps,
    };

    return widget({
      props: {
        action: "conclude",
        verdict,
      },
      output: text(verdict.reasoning),
      message: verdict.reasoning,
    });
  }
);

// ══════════════════════════════════════════════════════════════════
// PERSISTENCE TOOLS (Firebase Firestore — Web SDK, no service account)
// ══════════════════════════════════════════════════════════════════

// ── Tool 4: forge_save ─────────────────────────────────────────
server.tool(
  {
    name: "forge_save",
    description: `Save the current Forge workspace to the user's persistent storage. Called automatically by the widget on meaningful interactions, or manually by the user clicking "Save". Stores the full spec, widget state, and verdict so the user can resume later.`,
    schema: z.object({
      session_id: z
        .string()
        .optional()
        .describe("Existing session ID to update. Omit to create a new session."),
      title: z
        .string()
        .describe("Session title (usually the spec title)"),
      spec: z
        .any()
        .describe("The current UI spec JSON"),
      widget_state: z
        .any()
        .optional()
        .describe("Current widget state (all user inputs, weights, scores)"),
      verdict: z
        .any()
        .optional()
        .describe("The verdict if one was generated"),
    }),
  },
  async ({ session_id, title, spec: specData, widget_state, verdict: verdictData }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      const sessionData = {
        user_id: userId,
        title,
        spec: specData,
        widget_state: widget_state || {},
        verdict: verdictData || null,
        updated_at: serverTimestamp(),
      };

      let docId: string;

      if (session_id) {
        // Update existing session
        const docRef = doc(db, SESSIONS_COLLECTION, session_id);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists() && docSnap.data()?.user_id === userId) {
          await updateDoc(docRef, sessionData);
          docId = session_id;
        } else {
          return error("Session not found or access denied");
        }
      } else {
        // Create new session
        const colRef = collection(db, SESSIONS_COLLECTION);
        const docRef = await addDoc(colRef, {
          ...sessionData,
          created_at: serverTimestamp(),
        });
        docId = docRef.id;
      }

      // Also update user's last activity
      const userRef = doc(db, USERS_COLLECTION, userId);
      await setDoc(userRef, {
        last_active: serverTimestamp(),
        session_count: increment(session_id ? 0 : 1),
      }, { merge: true });

      return object({ session_id: docId, status: "saved", title });
    } catch (err) {
      console.error("[forge_save] Error:", err);
      return error(`Failed to save: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 5: forge_load ─────────────────────────────────────────
server.tool(
  {
    name: "forge_load",
    description: `Load a previously saved Forge workspace session. Returns the full spec, widget state, and verdict so the workspace can be restored exactly as the user left it.`,
    schema: z.object({
      session_id: z
        .string()
        .describe("The session ID to load"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Loading your workspace...",
      invoked: "Workspace restored",
    },
  },
  async ({ session_id }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";
      const docRef = doc(db, SESSIONS_COLLECTION, session_id);
      const docSnap = await getDoc(docRef);

      if (!docSnap.exists()) {
        return error("Session not found");
      }

      const data = docSnap.data();
      if (data.user_id !== userId) {
        return error("Access denied: this session belongs to another user");
      }

      // Return as widget render so it restores the workspace
      return widget({
        props: {
          action: "render",
          spec: data.spec,
          _restored: true,
          _sessionId: session_id,
          _restoredState: data.widget_state || {},
          _restoredVerdict: data.verdict || null,
        },
        output: text(`Restored workspace: "${data.title}". Your previous inputs and preferences have been loaded.`),
        message: `Restored workspace: "${data.title}"`,
      });
    } catch (err) {
      console.error("[forge_load] Error:", err);
      return error(`Failed to load: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 6: forge_list_sessions ────────────────────────────────
server.tool(
  {
    name: "forge_list_sessions",
    description: `List the user's saved Forge workspace sessions. Returns session IDs, titles, and timestamps so the user can choose which to resume.`,
    schema: z.object({
      limit: z
        .number()
        .min(1)
        .max(50)
        .optional()
        .describe("Max sessions to return (default 10)"),
    }),
  },
  async ({ limit = 10 }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      const q = query(
        collection(db, SESSIONS_COLLECTION),
        where("user_id", "==", userId),
        orderBy("updated_at", "desc"),
        firestoreLimit(limit)
      );

      const snapshot = await getDocs(q);

      const sessions = snapshot.docs.map((d) => ({
        session_id: d.id,
        title: d.data().title,
        has_verdict: !!d.data().verdict,
        state_keys: Object.keys(d.data().widget_state || {}).length,
        created_at: d.data().created_at?.toDate?.()?.toISOString?.() || null,
        updated_at: d.data().updated_at?.toDate?.()?.toISOString?.() || null,
      }));

      if (sessions.length === 0) {
        return text("No saved sessions found. Start a new workspace and save your progress!");
      }

      return object({ sessions, total: sessions.length });
    } catch (err) {
      console.error("[forge_list_sessions] Error:", err);
      return error(`Failed to list sessions: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// USER PROFILE TOOL
// ══════════════════════════════════════════════════════════════════

// ── Tool 7: forge_whoami ───────────────────────────────────────
server.tool(
  {
    name: "forge_whoami",
    description: `Get the current authenticated user's profile information. Shows login status, email, display name, and session history.`,
    schema: z.object({}),
  },
  async (_args, ctx) => {
    try {
      const userId = getUserId(ctx);

      if (!userId) {
        return object({
          authenticated: false,
          message: "Not logged in. Authentication is optional but enables persistent workspaces.",
        });
      }

      // Get user activity from Firestore
      const userRef = doc(db, USERS_COLLECTION, userId);
      const userSnap = await getDoc(userRef);
      const userData = userSnap.exists() ? userSnap.data() : null;

      return object({
        authenticated: true,
        user_id: userId,
        email: (ctx as any).auth?.user?.email || null,
        name: (ctx as any).auth?.user?.name || null,
        session_count: userData?.session_count || 0,
        last_active: userData?.last_active?.toDate?.()?.toISOString?.() || null,
      });
    } catch (err) {
      return object({
        authenticated: false,
        message: "Auth check failed — running in anonymous mode",
      });
    }
  }
);

// ══════════════════════════════════════════════════════════════════
// MCP-TO-MCP CONNECTIVITY — "The Last MCP You Need"
// Connect external MCPs and use their tools directly from Forge
// ══════════════════════════════════════════════════════════════════

// ── Helper: Call an MCP server's JSON-RPC endpoint ──────────────
async function mcpRequest(mcpUrl: string, method: string, params: any = {}): Promise<any> {
  // Standard MCP protocol uses JSON-RPC 2.0 over HTTP
  const url = mcpUrl.endsWith("/") ? `${mcpUrl}mcp` : `${mcpUrl}/mcp`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });

  if (!res.ok) {
    throw new Error(`MCP server returned ${res.status}: ${res.statusText}`);
  }

  const data = await res.json();
  if (data.error) {
    throw new Error(data.error.message || "MCP error");
  }
  return data.result;
}

// ── Tool 8: forge_connect_mcp ──────────────────────────────────
server.tool(
  {
    name: "forge_connect_mcp",
    description: `Connect an external MCP server to Forge. This enables cross-MCP workflows — Forge becomes your single gateway to ALL your MCP tools.

After connecting, use forge_discover_tools to see what tools the MCP offers, then forge_proxy_tool to call any of its tools directly from Forge.

Examples:
- Connect Playwright MCP for browser automation
- Connect a CRM MCP to push decisions into your pipeline
- Connect a data MCP to pull live analytics into Forge workspaces`,
    schema: z.object({
      mcp_url: z
        .string()
        .describe("The URL of the external MCP server (e.g., 'https://my-mcp.example.com')"),
      mcp_name: z
        .string()
        .describe("A friendly name for this MCP (e.g., 'Playwright', 'Salesforce CRM')"),
      description: z
        .string()
        .optional()
        .describe("What this MCP does and what tools it provides"),
    }),
  },
  async ({ mcp_url, mcp_name, description: desc }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      // Verify the MCP is reachable by trying to list its tools
      let discoveredTools: string[] = [];
      try {
        const result = await mcpRequest(mcp_url, "tools/list");
        discoveredTools = (result.tools || []).map((t: any) => t.name);
      } catch (e) {
        // Still save the connection even if discovery fails (MCP might need auth)
        console.warn("[forge_connect_mcp] Discovery failed, saving anyway:", e);
      }

      const connectionData = {
        user_id: userId,
        mcp_url,
        mcp_name,
        description: desc || "",
        discovered_tools: discoveredTools,
        status: discoveredTools.length > 0 ? "active" : "connected",
        connected_at: serverTimestamp(),
      };

      const colRef = collection(db, CONNECTED_MCPS_COLLECTION);
      const docRef = await addDoc(colRef, connectionData);

      return object({
        connection_id: docRef.id,
        mcp_name,
        mcp_url,
        status: connectionData.status,
        discovered_tools: discoveredTools,
        message: discoveredTools.length > 0
          ? `Connected "${mcp_name}" with ${discoveredTools.length} tools: ${discoveredTools.join(", ")}. Use forge_proxy_tool to call any of them.`
          : `Connected "${mcp_name}". Use forge_discover_tools to see available tools once the MCP is ready.`,
      });
    } catch (err) {
      console.error("[forge_connect_mcp] Error:", err);
      return error(`Failed to connect MCP: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 9: forge_discover_tools ───────────────────────────────
server.tool(
  {
    name: "forge_discover_tools",
    description: `Discover all available tools from a connected MCP server. Returns tool names, descriptions, and input schemas so you know exactly what's available.`,
    schema: z.object({
      mcp_name: z
        .string()
        .describe("The friendly name of the connected MCP to discover tools from"),
    }),
  },
  async ({ mcp_name }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      // Find the connected MCP by name
      const q = query(
        collection(db, CONNECTED_MCPS_COLLECTION),
        where("user_id", "==", userId),
        where("mcp_name", "==", mcp_name)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return error(`No connected MCP named "${mcp_name}". Use forge_list_connected_mcps to see your connections.`);
      }

      const mcpData = snapshot.docs[0].data();
      const result = await mcpRequest(mcpData.mcp_url, "tools/list");
      const tools = (result.tools || []).map((t: any) => ({
        name: t.name,
        description: t.description || "",
        inputSchema: t.inputSchema || {},
      }));

      // Update the stored tools list
      await updateDoc(snapshot.docs[0].ref, {
        discovered_tools: tools.map((t: any) => t.name),
        status: "active",
      });

      return object({
        mcp_name,
        mcp_url: mcpData.mcp_url,
        tools,
        total: tools.length,
        message: `${mcp_name} has ${tools.length} tools available. Use forge_proxy_tool to call any of them.`,
      });
    } catch (err) {
      console.error("[forge_discover_tools] Error:", err);
      return error(`Failed to discover tools: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 10: forge_proxy_tool ──────────────────────────────────
server.tool(
  {
    name: "forge_proxy_tool",
    description: `Call a tool on a connected external MCP server. This is how Forge acts as your single gateway — you can use ANY tool from ANY connected MCP without switching clients.

First use forge_discover_tools to see available tools and their schemas, then call them here.`,
    schema: z.object({
      mcp_name: z
        .string()
        .describe("The friendly name of the connected MCP"),
      tool_name: z
        .string()
        .describe("The name of the tool to call on the connected MCP"),
      arguments: z
        .any()
        .optional()
        .describe("The arguments to pass to the tool (must match the tool's input schema)"),
    }),
  },
  async ({ mcp_name, tool_name, arguments: toolArgs }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      // Find the connected MCP by name
      const q = query(
        collection(db, CONNECTED_MCPS_COLLECTION),
        where("user_id", "==", userId),
        where("mcp_name", "==", mcp_name)
      );
      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        return error(`No connected MCP named "${mcp_name}". Use forge_connect_mcp first.`);
      }

      const mcpData = snapshot.docs[0].data();

      // Call the tool on the external MCP
      const result = await mcpRequest(mcpData.mcp_url, "tools/call", {
        name: tool_name,
        arguments: toolArgs || {},
      });

      return object({
        mcp_name,
        tool_name,
        result: result.content || result,
        isError: result.isError || false,
      });
    } catch (err) {
      console.error("[forge_proxy_tool] Error:", err);
      return error(`Failed to call ${tool_name} on ${mcp_name}: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 11: forge_list_connected_mcps ──────────────────────────
server.tool(
  {
    name: "forge_list_connected_mcps",
    description: `List all external MCP servers connected to the user's Forge account. Shows connection status, available tools, and integrations.`,
    schema: z.object({}),
  },
  async (_args, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      const q = query(
        collection(db, CONNECTED_MCPS_COLLECTION),
        where("user_id", "==", userId),
        orderBy("connected_at", "desc")
      );

      const snapshot = await getDocs(q);

      const connections = snapshot.docs.map((d) => ({
        connection_id: d.id,
        mcp_name: d.data().mcp_name,
        mcp_url: d.data().mcp_url,
        description: d.data().description,
        status: d.data().status,
        discovered_tools: d.data().discovered_tools || [],
        connected_at: d.data().connected_at?.toDate?.()?.toISOString?.() || null,
      }));

      if (connections.length === 0) {
        return text("No connected MCPs yet. Use forge_connect_mcp to link external MCP servers like Playwright, CRM tools, or any other MCP. Forge becomes your single gateway to all MCP tools.");
      }

      return object({ connections, total: connections.length });
    } catch (err) {
      console.error("[forge_list_connected_mcps] Error:", err);
      return error(`Failed to list connections: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Start Server ───────────────────────────────────────────────
server.listen().then(() => {
  console.log("Forge v2 server running");
  console.log(`Auth: ${googleOAuth ? "Google OAuth enabled" : "No auth (anonymous mode)"}`);
});
