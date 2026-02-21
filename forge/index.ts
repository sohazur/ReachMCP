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

// ── Firebase Auth via Custom OAuth Provider ────────────────────
// Uses Google's public JWKS to verify Firebase ID tokens — NO service account needed
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID;
const FIREBASE_API_KEY = process.env.FIREBASE_API_KEY;

const FIREBASE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com")
);

const firebaseOAuth = FIREBASE_PROJECT_ID && FIREBASE_API_KEY
  ? oauthCustomProvider({
      issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      jwksUrl: `https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com`,
      authEndpoint: `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_API_KEY}`,
      tokenEndpoint: `https://securetoken.googleapis.com/v1/token?key=${FIREBASE_API_KEY}`,
      verifyToken: async (token: string) => {
        // Verify Firebase ID token using Google's public keys (no service account!)
        const result = await jwtVerify(token, FIREBASE_JWKS, {
          issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
          audience: FIREBASE_PROJECT_ID,
        });
        return result;
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
  ...(firebaseOAuth ? { oauth: firebaseOAuth } : {}),
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
// MCP-TO-MCP CONNECTIVITY (Future Architecture)
// ══════════════════════════════════════════════════════════════════

// ── Tool 8: forge_connect_mcp ──────────────────────────────────
server.tool(
  {
    name: "forge_connect_mcp",
    description: `Connect an external MCP server to Forge. This enables cross-MCP workflows — for example, connecting a LinkedIn MCP to automate outreach based on Forge analysis results, or a CRM MCP to push decisions into your pipeline.

The connected MCP's tools become available as actions within Forge workspaces. Currently stores the connection config; tool proxying is coming in a future release.`,
    schema: z.object({
      mcp_url: z
        .string()
        .describe("The URL of the external MCP server to connect"),
      mcp_name: z
        .string()
        .describe("A friendly name for this MCP (e.g., 'LinkedIn', 'Salesforce CRM')"),
      description: z
        .string()
        .optional()
        .describe("What this MCP does and what tools it provides"),
    }),
  },
  async ({ mcp_url, mcp_name, description: desc }, ctx) => {
    try {
      const userId = getUserId(ctx) || "anonymous";

      const connectionData = {
        user_id: userId,
        mcp_url,
        mcp_name,
        description: desc || "",
        status: "connected",
        connected_at: serverTimestamp(),
      };

      const colRef = collection(db, CONNECTED_MCPS_COLLECTION);
      const docRef = await addDoc(colRef, connectionData);

      return object({
        connection_id: docRef.id,
        mcp_name,
        mcp_url,
        status: "connected",
        message: `Connected "${mcp_name}". Its tools will be available in future Forge workspaces. Cross-MCP actions are coming soon.`,
      });
    } catch (err) {
      console.error("[forge_connect_mcp] Error:", err);
      return error(`Failed to connect MCP: ${err instanceof Error ? err.message : "Unknown error"}`);
    }
  }
);

// ── Tool 9: forge_list_connected_mcps ──────────────────────────
server.tool(
  {
    name: "forge_list_connected_mcps",
    description: `List all external MCP servers connected to the user's Forge account. Shows connection status and available integrations.`,
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
        connected_at: d.data().connected_at?.toDate?.()?.toISOString?.() || null,
      }));

      if (connections.length === 0) {
        return text("No connected MCPs. Use forge_connect_mcp to link external services like LinkedIn, CRM, or custom tools.");
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
  console.log(`Auth: ${firebaseOAuth ? "Firebase OAuth enabled" : "No auth (anonymous mode)"}`);
});
