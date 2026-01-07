import { notFound } from "next/navigation";

import { getPostForEdit } from "@/actions/posts";
import { EditPostForm } from "./edit-post-form";

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const post = await getPostForEdit(slug);

  if (!post) {
    notFound();
  }

  return (
    <div>
      <EditPostForm post={post} />
    </div>
  );
}
