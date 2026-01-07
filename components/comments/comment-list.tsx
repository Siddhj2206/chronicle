import { getSession } from "@/lib/session";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { PostContent } from "@/components/posts/post-content";
import { getComments } from "@/actions/comments";
import { DeleteCommentButton } from "./delete-comment-button";

interface CommentListProps {
  postId: string;
  postAuthorId: string;
}

export async function CommentList({ postId, postAuthorId }: CommentListProps) {
  const session = await getSession();
  const comments = await getComments(postId);

  if (comments.length === 0) {
    return <p>No comments yet. Be the first to comment!</p>;
  }

  return (
    <div>
      {comments.map(({ comment, author }) => {
        const initials = author.name
          ?.split(" ")
          .map((n: string) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);

        const canDelete =
          session?.user?.id === author.id ||
          session?.user?.id === postAuthorId;

        const formattedDate = new Date(comment.createdAt).toLocaleDateString(
          "en-US",
          {
            month: "short",
            day: "numeric",
            year: "numeric",
          }
        );

        return (
          <Card key={comment.id}>
            <CardContent>
              <div>
                <Avatar>
                  <AvatarImage src={author.image || undefined} />
                  <AvatarFallback>{initials || "U"}</AvatarFallback>
                </Avatar>
                <div>
                  <span>{author.name}</span>
                  <span>@{author.username}</span>
                  <span>{formattedDate}</span>
                </div>
                {canDelete && <DeleteCommentButton commentId={comment.id} />}
              </div>
              <PostContent content={comment.content} />
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
