import { db } from "../lib/db";
import { user, post } from "../lib/db/schema";
import { eq } from "drizzle-orm";

const SAMPLE_POSTS = [
  {
    title: "The Future of Typography on the Web",
    slug: "future-of-typography",
    excerpt: "Why serif fonts are making a comeback in modern web design, and what it means for readability.",
    content: `
# The Return of the Serif

For years, the web has been dominated by clean, geometric sans-serif typefaces. From the early days of Arial and Verdana to the modern ubiquity of Inter and Roboto, we've prioritized "screen readability" above all else.

But a shift is happening. Designers are rediscovering the warmth, authority, and rhythm of serif typefaces.

## Beyond the Pixel

High-resolution displays have rendered the old arguments against serifs obsolete. We no longer need to worry about pixelation at small sizes. This has opened the door for typefaces like **Lora**, **Merriweather**, and **Playfair Display** to take center stage.

> "Typography is the voice of the web. It's time we started speaking with a bit more character."

## The Editorial Aesthetic

This trend parallels the "digital broadsheet" movement—a desire to make websites feel more like publications and less like applications. By using high-contrast serifs for headings and generous whitespace, we evoke the trust and prestige of legacy print media.

It's not just about looking old-school; it's about signaling quality. In an era of AI-generated slop, a beautifully typeset article feels human, curated, and valuable.
    `,
    coverImage: "https://images.unsplash.com/photo-1555431189-0fabf2667795?q=80&w=2574&auto=format&fit=crop",
    category: "Design",
  },
  {
    title: "Silence in the Age of Noise",
    slug: "silence-in-the-age-of-noise",
    excerpt: "Finding clarity and focus in a digital environment designed to distract us at every turn.",
    content: `
# The Commodity of Attention

We live in an attention economy, but we are rarely the investors. We are the resource being mined. Every notification, every infinite scroll, every algorithmic recommendation is designed to extract a few more seconds of our cognitive surplus.

## The Case for Slow Media

There is a growing counter-movement: Slow Media. It advocates for:

1.  **Finite content:** Articles that end. Feeds that stop.
2.  **Intentional consumption:** Choosing what to read, rather than having it fed to you.
3.  **High signal, low noise:** Prioritizing depth over breadth.

Building a "digital garden" or a personal blog is an act of rebellion. It's a way to reclaim your corner of the internet and tend to it at your own pace.

> "To sit quietly in a room alone is the hardest thing a modern human can do." — Blaise Pascal (paraphrased for 2024)

Let's rebuild an internet that respects our time, rather than devouring it.
    `,
    coverImage: "https://images.unsplash.com/photo-1499750310159-57751c6ce9f7?q=80&w=2670&auto=format&fit=crop",
    category: "Culture",
  },
  {
    title: "Minimalism is Dead. Long Live Maximalism.",
    slug: "minimalism-is-dead",
    excerpt: "Why the beige aesthetic is fading and a new era of color, texture, and chaos is taking over.",
    content: `
# The Beige Age is Over

Look at your phone. Look at your favorite apps. Look at the coffee shop you're sitting in. Chances are, everything is a variation of gray, white, or beige. We've optimized the world into a frictionless, inoffensive blur.

But the pendulum is swinging back.

## Enter Maximalism

Maximalism isn't just about clutter; it's about **personality**. It's about:
- Bold, clashing colors
- Dense, information-rich layouts
- Weird, custom typography
- Raw, unpolished photography

We're seeing this in the resurgence of Y2K aesthetics, the popularity of brutalist web design, and the rejection of the "corporate Memphis" art style.

We are tired of polished perfection. We want things to feel messy, human, and alive again.
    `,
    coverImage: "https://images.unsplash.com/photo-1502014822147-1aed80671c0a?q=80&w=2670&auto=format&fit=crop",
    category: "Style",
  },
  {
    title: "The Architecture of Solitude",
    slug: "architecture-of-solitude",
    excerpt: "How our physical spaces shape our mental landscapes, and the importance of private rooms.",
    content: "Content placeholder...",
    coverImage: "https://images.unsplash.com/photo-1517558368141-94944d18c156?q=80&w=2670&auto=format&fit=crop",
    category: "Design",
  },
  {
    title: "Code as Craft",
    slug: "code-as-craft",
    excerpt: "Software engineering is more than just engineering. It is a creative pursuit akin to woodworking.",
    content: "Content placeholder...",
    coverImage: "https://images.unsplash.com/photo-1517134191118-9d595e4c8c2b?q=80&w=2670&auto=format&fit=crop",
    category: "Technology",
  },
  {
    title: "Urban Farming in 2026",
    slug: "urban-farming-2026",
    excerpt: "How skyscrapers are becoming vertical farms and changing the way we eat in cities.",
    content: "Content placeholder...",
    coverImage: "https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=2670&auto=format&fit=crop",
    category: "Science",
  },
  {
    title: "The Death of the Open Plan Office",
    slug: "death-of-open-plan",
    excerpt: "Productivity data is in, and walls are going back up. The return to private offices.",
    content: "Content placeholder...",
    coverImage: "https://images.unsplash.com/photo-1497366216548-37526070297c?q=80&w=2669&auto=format&fit=crop",
    category: "Business",
  },
  {
    title: "Coffee: The Third Wave is Over",
    slug: "coffee-fourth-wave",
    excerpt: "What comes after specialty coffee? Hyper-local roasting and the search for new varietals.",
    content: "Content placeholder...",
    coverImage: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?q=80&w=2670&auto=format&fit=crop",
    category: "Culture",
  }
];

async function seed() {
  console.log("🌱 Seeding database...");

  // 1. Create or Get Dummy User
  const USER_EMAIL = "editor@chronicle.com";
  let author = await db.query.user.findFirst({
    where: eq(user.email, USER_EMAIL),
  });

  if (!author) {
    console.log("Creating dummy user...");
    const [newUser] = await db
      .insert(user)
      .values({
        id: crypto.randomUUID(),
        name: "Editor in Chief",
        email: USER_EMAIL,
        emailVerified: true,
        username: "editor",
        image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?q=80&w=2070&auto=format&fit=crop",
        bio: "Curating the finest stories for the Chronicle. Lover of serifs, black coffee, and silence.",
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();
    author = newUser;
  } else {
    console.log("Found existing user:", author.name);
  }

  // 2. Create Posts
  console.log("Creating posts...");
  for (const postData of SAMPLE_POSTS) {
    const existingPost = await db.query.post.findFirst({
      where: eq(post.slug, postData.slug),
    });

    if (!existingPost) {
      await db.insert(post).values({
        id: crypto.randomUUID(),
        authorId: author!.id,
        title: postData.title,
        slug: postData.slug,
        content: postData.content,
        excerpt: postData.excerpt,
        coverImage: postData.coverImage,
        published: true,
        publishedAt: new Date(), // All published "now" for sorting
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      console.log(`+ Created: ${postData.title}`);
    } else {
      console.log(`= Skipped: ${postData.title} (Exists)`);
    }
  }

  console.log("✅ Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
