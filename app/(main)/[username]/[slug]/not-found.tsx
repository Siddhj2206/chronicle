import { NotFoundView } from "@/components/layout/not-found-view";

export default function PostNotFound(): React.JSX.Element {
  return (
    <NotFoundView
      title="Story Not Found"
      description="This story is no longer in the collection, or has yet to be written. Find your next read in the archive."
    />
  );
}
