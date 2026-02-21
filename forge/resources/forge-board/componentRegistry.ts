import type React from "react";
import type { RenderProps } from "./types";
import { RHeading } from "./components/RHeading";
import { RText } from "./components/RText";
import { RBadge } from "./components/RBadge";
import { RDivider } from "./components/RDivider";
import { RCard } from "./components/RCard";
import { RCardList } from "./components/RCardList";
import { RTable } from "./components/RTable";
import { RSlider } from "./components/RSlider";
import { RTextInput } from "./components/RTextInput";
import { RSelect } from "./components/RSelect";
import { RToggle } from "./components/RToggle";
import { RButton } from "./components/RButton";
import { RProgressBar } from "./components/RProgressBar";
import { RMeter } from "./components/RMeter";
import { RScoreableItem } from "./components/RScoreableItem";
import { RArgumentPair } from "./components/RArgumentPair";

export const componentRegistry: Record<string, React.FC<RenderProps>> = {
  heading: RHeading,
  text: RText,
  badge: RBadge,
  divider: RDivider,
  card: RCard,
  card_list: RCardList,
  table: RTable,
  slider: RSlider,
  text_input: RTextInput,
  select: RSelect,
  toggle: RToggle,
  button: RButton,
  progress_bar: RProgressBar,
  meter: RMeter,
  scoreable_item: RScoreableItem,
  argument_pair: RArgumentPair,
};
