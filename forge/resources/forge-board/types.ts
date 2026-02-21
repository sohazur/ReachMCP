import { z } from "zod";

export interface ComparisonOption {
  id: string;
  name: string;
  emoji: string;
}

export interface Criterion {
  id: string;
  name: string;
  weight: number;
  description: string;
}

export interface Score {
  optionId: string;
  criteriaId: string;
  score: number;
  note: string;
}

export interface Argument {
  id: string;
  title: string;
  detail: string;
  strength: number;
}

export interface Side {
  label: string;
  arguments: Argument[];
}

export interface RankerItem {
  id: string;
  title: string;
  description: string;
  score: number;
  reasoning: string;
}

export interface Verdict {
  winner: string;
  confidence: number;
  reasoning: string;
  next_steps: string[];
}

export interface AddFactor {
  mode: string;
  factor_type: string;
  factor: any;
}

export interface ForgeProps {
  mode?: "comparison" | "argument_map" | "ranker";
  question?: string;
  analysis?: string;
  // Comparison
  options?: ComparisonOption[];
  criteria?: Criterion[];
  scores?: Score[];
  // Argument map
  side_a?: Side;
  side_b?: Side;
  // Ranker
  items?: RankerItem[];
  // Updates
  addFactor?: AddFactor;
  verdict?: Verdict;
}

export const propSchema = z.any();
