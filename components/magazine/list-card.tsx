import { StoryCard } from "@/components/magazine/story-card";

import type { StoryCardProps } from "@/components/magazine/story-card";

export function ListCard(props: StoryCardProps): React.JSX.Element {
  return <StoryCard {...props} />;
}
