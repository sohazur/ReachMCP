import React from "react";
import type { RenderProps, CardListNode } from "../types";
import { Card } from "./Card";

export const RCardList: React.FC<RenderProps> = ({ node, state, onDismiss }) => {
  const n = node as CardListNode;
  const dismissed = state ?? {};

  return (
    <div>
      {n.items
        .filter((item) => !dismissed[`dismissed.${item.id}`])
        .map((item) => (
          <Card
            key={item.id}
            title={item.title}
            detail={item.detail}
            accentColor={item.accentColor}
            onDismiss={
              item.dismissible
                ? () => onDismiss?.(item.id, item.title)
                : undefined
            }
          />
        ))}
    </div>
  );
};
