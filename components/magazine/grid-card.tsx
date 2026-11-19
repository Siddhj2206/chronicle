import { StoryCard } from "@/components/magazine/story-card";

import type { StoryCardProps } from "@/components/magazine/story-card";

export function GridCard(props: StoryCardProps): React.JSX.Element {
  return <StoryCard {...props} />;
}
