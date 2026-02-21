import React from "react";
import type { RenderProps, CardNode } from "../types";
import { Card } from "./Card";

export const RCard: React.FC<RenderProps> = ({ node, onDismiss }) => {
  const n = node as CardNode;
  return (
    <Card
      title={n.title}
      detail={n.detail}
      accentColor={n.accentColor}
      onDismiss={n.dismissible ? () => onDismiss?.(n.id, n.title) : undefined}
    />
  );
};
