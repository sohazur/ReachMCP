import React from "react";
import type { RenderProps } from "../types";

export const RDivider: React.FC<RenderProps> = () => (
  <hr
    style={{
      border: "none",
      borderTop: "1px solid #e2e8f0",
      margin: "12px 0",
    }}
  />
);
