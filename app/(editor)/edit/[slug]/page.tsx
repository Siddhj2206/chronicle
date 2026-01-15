import { notFound } from "next/navigation";

import { getPostForEditWithContent } from "@/actions/posts";
import { PostEditorPage } from "@/components/posts/post-editor-page";

interface EditPostPageProps {
  params: Promise<{ slug: string }>;
}

export default async function EditPostPage({ params }: EditPostPageProps) {
  const { slug } = await params;
  const result = await getPostForEditWithContent(slug);

  if (!result) {
    notFound();
  }

  // Create a post object with the R2 content for the editor
  const postWithContent = {
    ...result.post,
    content: result.content,
  };

  return <PostEditorPage mode="edit" post={postWithContent} />;
}
