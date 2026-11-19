import { NotFoundView } from "@/components/layout/not-found-view";

export default function ProfileNotFound(): React.JSX.Element {
  return (
    <NotFoundView
      title="Correspondent Not Found"
      description="We could not find this writer. There are other voices to discover in the journal."
    />
  );
}
