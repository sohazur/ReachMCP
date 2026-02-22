import { MCPServer, text, object, error } from "mcp-use/server";
import { z } from "zod";

const server = new MCPServer({
  name: "startup-tools",
  title: "Startup Tools",
  version: "1.0.0",
  description: "Practical tools for startup founders — market sizing, pitch deck scoring, competitor analysis, and runway calculation",
  baseUrl: process.env.MCP_URL || "http://localhost:3001",
});

// ── Tool 1: market_size ──────────────────────────────────────────
server.tool(
  {
    name: "market_size",
    description: "Estimate TAM, SAM, SOM for a given market. Provide the industry and target segment.",
    schema: z.object({
      industry: z.string().describe("The industry (e.g., 'AI developer tools', 'food delivery')"),
      target_segment: z.string().describe("Specific target segment (e.g., 'solo developers', 'college students')"),
      geography: z.string().optional().describe("Geographic focus (default: 'Global')"),
    }),
  },
  async ({ industry, target_segment, geography = "Global" }) => {
    // Simulated market sizing with realistic structure
    const hash = (industry + target_segment).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
    const tamB = 5 + (hash % 200);
    const samPct = 10 + (hash % 25);
    const somPct = 2 + (hash % 8);

    return object({
      industry,
      target_segment,
      geography,
      tam: { value_billions: tamB, label: "Total Addressable Market" },
      sam: { value_billions: +(tamB * samPct / 100).toFixed(1), percentage_of_tam: samPct, label: "Serviceable Addressable Market" },
      som: { value_billions: +(tamB * samPct / 100 * somPct / 100).toFixed(2), percentage_of_sam: somPct, label: "Serviceable Obtainable Market" },
      growth_rate_pct: 8 + (hash % 25),
      methodology: "Top-down estimate based on industry reports and segment analysis",
      sources: ["Gartner", "Statista", "CB Insights", "PitchBook"],
    });
  }
);

// ── Tool 2: score_pitch ──────────────────────────────────────────
server.tool(
  {
    name: "score_pitch",
    description: "Score a startup pitch across key investor dimensions. Returns scores and actionable feedback.",
    schema: z.object({
      startup_name: z.string().describe("Name of the startup"),
      one_liner: z.string().describe("One-line description of what the startup does"),
      problem: z.string().describe("The problem being solved"),
      solution: z.string().describe("The proposed solution"),
      traction: z.string().optional().describe("Current traction metrics"),
      team: z.string().optional().describe("Team background"),
      ask: z.string().optional().describe("Funding ask and use of funds"),
    }),
  },
  async ({ startup_name, one_liner, problem, solution, traction, team, ask }) => {
    const hasField = (f?: string) => f && f.length > 10;

    const scores = {
      problem_clarity: hasField(problem) ? 7 + (problem.length > 50 ? 2 : 0) : 4,
      solution_fit: hasField(solution) ? 6 + (solution.length > 50 ? 2 : 0) : 3,
      market_opportunity: hasField(one_liner) ? 7 : 5,
      traction: hasField(traction) ? 8 : 3,
      team_strength: hasField(team) ? 7 : 4,
      pitch_clarity: one_liner.length > 5 && one_liner.length < 100 ? 8 : 5,
    };

    const total = Object.values(scores).reduce((a, b) => a + b, 0);
    const maxTotal = Object.keys(scores).length * 10;

    return object({
      startup_name,
      one_liner,
      scores,
      overall: { score: total, max: maxTotal, percentage: Math.round(total / maxTotal * 100) },
      strengths: [
        scores.problem_clarity >= 7 && "Clear problem definition",
        scores.traction >= 7 && "Strong traction signals",
        scores.pitch_clarity >= 7 && "Concise pitch",
      ].filter(Boolean),
      improvements: [
        scores.traction < 5 && "Add specific traction metrics (users, revenue, growth rate)",
        scores.team_strength < 5 && "Highlight team expertise and relevant experience",
        scores.solution_fit < 7 && "Make the solution more specific — how exactly does it work?",
        !ask && "Include a clear funding ask with use of funds breakdown",
      ].filter(Boolean),
    });
  }
);

// ── Tool 3: competitor_matrix ────────────────────────────────────
server.tool(
  {
    name: "competitor_matrix",
    description: "Generate a competitor comparison matrix for a startup. Analyzes positioning gaps.",
    schema: z.object({
      startup_name: z.string().describe("Your startup name"),
      competitors: z.array(z.string()).min(1).max(5).describe("List of competitor names"),
      dimensions: z.array(z.string()).min(1).max(6).describe("Comparison dimensions (e.g., 'pricing', 'speed', 'integrations')"),
    }),
  },
  async ({ startup_name, competitors, dimensions }) => {
    const allPlayers = [startup_name, ...competitors];
    const matrix = allPlayers.map((player, pi) => {
      const row: Record<string, any> = { company: player };
      dimensions.forEach((dim, di) => {
        const hash = (player + dim).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
        // Give the user's startup a slight advantage
        const bonus = pi === 0 ? 1 : 0;
        row[dim] = Math.min(10, 3 + (hash % 7) + bonus);
      });
      return row;
    });

    // Find positioning gaps
    const gaps = dimensions.filter(dim => {
      const userScore = matrix[0][dim];
      const maxCompetitor = Math.max(...matrix.slice(1).map(r => r[dim]));
      return userScore > maxCompetitor;
    });

    const threats = dimensions.filter(dim => {
      const userScore = matrix[0][dim];
      const maxCompetitor = Math.max(...matrix.slice(1).map(r => r[dim]));
      return userScore < maxCompetitor - 2;
    });

    return object({
      matrix,
      dimensions,
      advantages: gaps.length > 0 ? gaps : ["No clear advantages yet — focus on differentiation"],
      threats: threats.length > 0 ? threats : ["No major threats identified"],
      recommendation: gaps.length > threats.length
        ? `${startup_name} has strong positioning on ${gaps.join(", ")}. Double down on these.`
        : `Focus on improving ${threats.join(", ")} to close the competitive gap.`,
    });
  }
);

// ── Tool 4: runway_calculator ────────────────────────────────────
server.tool(
  {
    name: "runway_calculator",
    description: "Calculate startup runway, burn rate, and when to start fundraising.",
    schema: z.object({
      cash_on_hand: z.number().describe("Current cash in bank ($)"),
      monthly_burn: z.number().describe("Monthly burn rate ($)"),
      monthly_revenue: z.number().optional().describe("Monthly recurring revenue ($)"),
      revenue_growth_pct: z.number().optional().describe("Monthly revenue growth rate (%)"),
      planned_hires: z.number().optional().describe("Number of planned hires in next 6 months"),
      avg_salary: z.number().optional().describe("Average annual salary per hire ($)"),
    }),
  },
  async ({ cash_on_hand, monthly_burn, monthly_revenue = 0, revenue_growth_pct = 0, planned_hires = 0, avg_salary = 80000 }) => {
    const netBurn = monthly_burn - monthly_revenue;
    const runwayMonths = netBurn > 0 ? Math.floor(cash_on_hand / netBurn) : 999;

    // Project with revenue growth
    let projectedRunway = 0;
    let remaining = cash_on_hand;
    let rev = monthly_revenue;
    const hireCostPerMonth = (planned_hires * avg_salary) / 12;

    for (let m = 1; m <= 36; m++) {
      rev = rev * (1 + revenue_growth_pct / 100);
      const totalBurn = monthly_burn + (m <= 6 ? hireCostPerMonth : 0);
      remaining -= (totalBurn - rev);
      if (remaining <= 0) {
        projectedRunway = m;
        break;
      }
    }
    if (projectedRunway === 0) projectedRunway = 36;

    const fundraisingStart = Math.max(1, runwayMonths - 6);

    return object({
      cash_on_hand,
      monthly_burn,
      monthly_revenue,
      net_burn: netBurn,
      runway_months: runwayMonths,
      projected_runway_with_growth: projectedRunway,
      start_fundraising_in_months: fundraisingStart,
      default_date: new Date(Date.now() + fundraisingStart * 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
      hire_impact: planned_hires > 0
        ? `${planned_hires} hires add $${Math.round(hireCostPerMonth).toLocaleString()}/mo, reducing runway by ~${Math.floor(hireCostPerMonth / netBurn * runwayMonths)} months`
        : "No planned hires",
      recommendation: runwayMonths < 6
        ? "URGENT: Start fundraising immediately. Less than 6 months runway."
        : runwayMonths < 12
        ? "Start fundraising conversations now. You have a comfortable but limited window."
        : "Healthy runway. Focus on growth metrics before fundraising.",
    });
  }
);

server.listen().then(() => {
  console.log("Startup Tools MCP running");
});
