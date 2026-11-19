import { getDb } from "@/lib/db";
import { comment } from "@/lib/db/schema";
import { createPost, createUser, resetDatabase } from "@/tests/helpers/db";

async function seed(): Promise<void> {
  const db = await getDb();
  await resetDatabase();
  const writer = await createUser({
    id: "seed-writer",
    username: "test_writer",
    name: "Test Writer",
    email: "writer@example.test",
  });
  const reader = await createUser({
    id: "seed-reader",
    username: "test_reader",
    name: "Test Reader",
    email: "reader@example.test",
  });
  const article = await createPost(writer.id, {
    id: "seed-published",
    slug: "chronicle-testing",
    title: "Chronicle Testing Journal",
    excerpt: "A deterministic story for the testing newsroom.",
    content: [
      "## A reproducible newsroom\n\nThis seeded article makes smoke tests reliable.",
      ...Array.from(
        { length: 4 },
        () =>
          "A newsroom begins with attention. We walk through familiar streets, listening to the people who give a place its character. Each conversation invites us to look more closely, to ask better questions, and to make space for another perspective. These observations become a record of everyday life, connecting readers through the details that might otherwise go unnoticed.",
      ),
      "### Listening closely\n\n> A good story leaves room for the reader to see the world anew.",
      "- Begin with curiosity.\n- Listen before writing.\n- Leave time to reflect.",
      "## A thoughtful practice\n\nA simple tool can help us keep a record of what matters.",
      '```typescript\nconst observation = { place: "The old station", story: "A city learning to pause" };\nconsole.log(observation.story);\n```',
      "| Practice | Purpose |\n| --- | --- |\n| Observe | Notice the ordinary |\n| Reflect | Find a new perspective |",
      "### Returning to the page\n\nThe work continues beyond the final paragraph. We share drafts, listen to feedback, and return to the places that first inspired us.",
    ].join("\n\n"),
    searchVector: "Chronicle Testing Journal deterministic newsroom",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  });
  await createPost(reader.id, {
    id: "seed-second",
    slug: "reader-notes",
    title: "Reader Notes",
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  });
  await createPost(writer.id, {
    id: "seed-draft",
    slug: "unfinished-notes",
    title: "Unfinished Notes",
    published: false,
    publishedAt: null,
    createdAt: new Date("2025-01-01"),
    updatedAt: new Date("2025-01-02"),
  });
  await db.insert(comment).values({
    id: "seed-comment",
    postId: article.id,
    authorId: reader.id,
    content: "A helpful seeded comment.",
    createdAt: new Date("2025-01-03"),
    updatedAt: new Date("2025-01-03"),
  });
  console.log("Seeded 2 users, 2 published posts, 1 draft, and 1 comment.");
}

seed()
  .then(() => process.exit(0))
  .catch((error: unknown) => {
    console.error(error);
    process.exit(1);
  });
