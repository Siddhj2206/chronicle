import { notFound } from "next/navigation";

import { getPostForEdit } from "@/actions/posts";
import { PostEditorPage } from "@/components/posts/post-editor-page";

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const post = await getPostForEdit(slug);

  if (!post) {
    notFound();
  }

  return <PostEditorPage mode="edit" post={post} />;
}
