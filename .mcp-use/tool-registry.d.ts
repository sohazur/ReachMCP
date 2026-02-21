// Auto-generated tool registry types
declare module "mcp-use/react" {
  interface ToolRegistry {
    "forge_view": {
      input: { spec: any; analysis: string };
      output: Record<string, unknown>;
    };
    "forge_update": {
      input: {
        operation: "add" | "remove" | "patch";
        components?: any;
        ids?: string[];
        patches?: any;
        commentary: string;
      };
      output: Record<string, unknown>;
    };
    "forge_conclude": {
      input: {
        winner: string;
        confidence: number;
        reasoning: string;
        next_steps: string[];
      };
      output: Record<string, unknown>;
    };
  }
}
export {};
