import { MCPServer, text, widget } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "forge",
  title: "Forge",
  version: "1.0.0",
  description: "The last MCP App — AI picks the right decision tool for any problem",
  baseUrl: process.env.MCP_URL || "http://localhost:3000",
  favicon: "favicon.ico",
  websiteUrl: "https://mcp-use.com",
  icons: [
    {
      src: "icon.svg",
      mimeType: "image/svg+xml",
      sizes: ["512x512"],
    },
  ],
});

// ── Tool 1: analyze_problem ──────────────────────────────────────────
server.tool(
  {
    name: "analyze_problem",
    description:
      "Analyze a decision or problem the user is facing. Choose the best visualization mode and generate structured data. Use 'comparison' mode when the user is choosing between 3+ concrete options (apartments, products, schools, candidates). Use 'argument_map' mode when the user faces a binary yes/no decision (quit job, move cities, buy vs rent). Use 'ranker' mode when the user needs to prioritize a list of items (features, tasks, goals).",
    schema: z.object({
      mode: z.enum(["comparison", "argument_map", "ranker"]).describe("Which visualization to use"),
      question: z.string().describe("The decision question"),
      analysis: z.string().describe("2-3 sentence initial analysis"),
      // Comparison mode
      options: z
        .array(z.object({ id: z.string(), name: z.string(), emoji: z.string() }))
        .optional()
        .describe("Options being compared (comparison mode, 3-5 items)"),
      criteria: z
        .array(
          z.object({
            id: z.string(),
            name: z.string(),
            weight: z.number().min(1).max(10),
            description: z.string(),
          })
        )
        .optional()
        .describe("Comparison criteria (comparison mode, 4-6 items)"),
      scores: z
        .array(
          z.object({
            optionId: z.string(),
            criteriaId: z.string(),
            score: z.number().min(1).max(10),
            note: z.string(),
          })
        )
        .optional()
        .describe("Score for each option on each criterion"),
      // Argument map mode
      side_a: z
        .object({
          label: z.string(),
          arguments: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              detail: z.string(),
              strength: z.number().min(1).max(10),
            })
          ),
        })
        .optional()
        .describe("First side of the argument (argument_map mode)"),
      side_b: z
        .object({
          label: z.string(),
          arguments: z.array(
            z.object({
              id: z.string(),
              title: z.string(),
              detail: z.string(),
              strength: z.number().min(1).max(10),
            })
          ),
        })
        .optional()
        .describe("Second side of the argument (argument_map mode)"),
      // Ranker mode
      items: z
        .array(
          z.object({
            id: z.string(),
            title: z.string(),
            description: z.string(),
            score: z.number().min(0).max(100),
            reasoning: z.string(),
          })
        )
        .optional()
        .describe("Items to rank, pre-sorted by score (ranker mode)"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Analyzing your problem...",
      invoked: "Analysis ready",
    },
  },
  async ({ mode, question, analysis, options, criteria, scores, side_a, side_b, items }) => {
    return widget({
      props: { mode, question, analysis, options, criteria, scores, side_a, side_b, items },
      output: text(analysis),
      message: analysis,
    });
  }
);

// ── Tool 2: add_factor ───────────────────────────────────────────────
server.tool(
  {
    name: "add_factor",
    description:
      "Add a new factor, argument, or criterion to the analysis. Called when the user identifies something the initial analysis missed.",
    schema: z.object({
      mode: z.enum(["comparison", "argument_map", "ranker"]).describe("Current visualization mode"),
      factor_type: z
        .string()
        .describe("What kind of factor (criterion, argument_for_a, argument_for_b, item)"),
      factor: z.object({
        id: z.string(),
        title: z.string(),
        detail: z.string().optional(),
        description: z.string().optional(),
        score: z.number().optional(),
        strength: z.number().optional(),
        weight: z.number().optional(),
      }).describe("The factor data"),
      commentary: z.string().describe("Brief commentary about this addition"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Adding factor...",
      invoked: "Factor added",
    },
  },
  async ({ mode, factor_type, factor, commentary }) => {
    return widget({
      props: { addFactor: { mode, factor_type, factor } },
      output: text(commentary),
      message: commentary,
    });
  }
);

// ── Tool 3: generate_verdict ─────────────────────────────────────────
server.tool(
  {
    name: "generate_verdict",
    description:
      "Generate a personalized verdict/recommendation. Reference the specific factors the user weighted highest or interacted with most.",
    schema: z.object({
      winner: z.string().describe("The recommended option or side"),
      confidence: z.number().min(1).max(100).describe("Confidence percentage"),
      reasoning: z.string().describe("3-4 sentence personalized recommendation"),
      next_steps: z.array(z.string()).describe("3 concrete next steps"),
    }),
    widget: {
      name: "forge-board",
      invoking: "Generating your verdict...",
      invoked: "Verdict ready",
    },
  },
  async ({ winner, confidence, reasoning, next_steps }) => {
    return widget({
      props: { verdict: { winner, confidence, reasoning, next_steps } },
      output: text(reasoning),
      message: reasoning,
    });
  }
);

server.listen().then(() => {
  console.log("Forge server running");
});
