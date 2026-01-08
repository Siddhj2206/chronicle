import { db } from "../lib/db";
import { post, user } from "../lib/db/schema";
import { getR2, R2_BUCKET_NAME } from "../lib/r2";
import { PutObjectCommand } from "@aws-sdk/client-s3";

// Real images from Unsplash (direct URLs that exist)
const UNSPLASH_IMAGES = {
  tech: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=1200&q=80",
  nature: "https://images.unsplash.com/photo-1469474968028-56623f02e42e?w=1200&q=80",
  city: "https://images.unsplash.com/photo-1480714378408-67cf0d13bc1b?w=1200&q=80",
  coffee: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=1200&q=80",
  books: "https://images.unsplash.com/photo-1512820790803-83ca734da794?w=1200&q=80",
  workspace: "https://images.unsplash.com/photo-1497032628192-86f99bcd76bc?w=1200&q=80",
  food: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200&q=80",
  travel: "https://images.unsplash.com/photo-1488646953014-85cb44e25828?w=1200&q=80",
};

async function downloadImage(url: string): Promise<Buffer> {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed to download: ${url}`);
  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}

async function uploadToR2(
  buffer: Buffer,
  userId: string,
  filename: string
): Promise<string> {
  const key = `uploads/${userId}/${crypto.randomUUID()}-${filename}`;

  await getR2().send(
    new PutObjectCommand({
      Bucket: R2_BUCKET_NAME,
      Key: key,
      Body: buffer,
      ContentType: "image/jpeg",
    })
  );

  const R2_DOMAIN = process.env.NEXT_PUBLIC_R2_DOMAIN;
  if (R2_DOMAIN) {
    return `https://${R2_DOMAIN.replace(/^https?:\/\//, '')}/${key}`;
  }
  return `${process.env.R2_ENDPOINT}/${R2_BUCKET_NAME}/${key}`;
}

function generateSlug(title: string): string {
  const base = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
  const uniqueSuffix = Math.random().toString(36).substring(2, 8);
  return `${base}-${uniqueSuffix}`;
}

async function seed() {
  console.log("🌱 Starting seed...\n");

  // Get the first user from the database
  const users = await db.select().from(user).limit(1);
  if (users.length === 0) {
    console.error("❌ No users found! Please sign in first to create a user.");
    process.exit(1);
  }

  const author = users[0];
  console.log(`📝 Creating posts for user: ${author.name} (@${author.username})\n`);

  // Upload images
  console.log("📸 Uploading images to R2...");
  const images: Record<string, string> = {};

  for (const [name, url] of Object.entries(UNSPLASH_IMAGES)) {
    try {
      console.log(`  Downloading ${name}...`);
      const buffer = await downloadImage(url);
      console.log(`  Uploading ${name} to R2...`);
      images[name] = await uploadToR2(buffer, author.id, `${name}.jpg`);
      console.log(`  ✓ ${name}: ${images[name]}`);
    } catch (error) {
      console.error(`  ✗ Failed to upload ${name}:`, error);
    }
  }

  console.log("\n📰 Creating posts...\n");

  // Sample posts with full content
  const samplePosts = [
    {
      title: "The Complete Guide to Modern Web Development",
      excerpt:
        "An in-depth exploration of the tools, frameworks, and best practices shaping the future of web development in 2026.",
      coverImage: images.tech,
      viewCount: 1250,
      content: `
# The Complete Guide to Modern Web Development

The landscape of web development has transformed dramatically over the past few years. In this comprehensive guide, we'll explore the technologies and practices that define modern web development in 2026.

## The Rise of Server Components

React Server Components have fundamentally changed how we think about building web applications. By moving rendering to the server, we can:

- **Reduce bundle sizes** dramatically
- **Improve initial page load** times
- **Simplify data fetching** patterns

> "Server Components represent the biggest shift in React architecture since hooks." — Dan Abramov

### Code Example

Here's a simple server component that fetches data:

\`\`\`typescript
async function PostList() {
  const posts = await db.query.posts.findMany({
    limit: 10,
    orderBy: desc(posts.createdAt),
  });

  return (
    <ul>
      {posts.map((post) => (
        <li key={post.id}>{post.title}</li>
      ))}
    </ul>
  );
}
\`\`\`

## Database Choices in 2026

The database landscape has evolved significantly:

| Database | Best For | Considerations |
|----------|----------|----------------|
| PostgreSQL | General purpose | Excellent ecosystem |
| SQLite | Edge computing | Surprisingly powerful |
| PlanetScale | Serverless MySQL | Great DX |
| Neon | Serverless Postgres | Branching support |

## Essential Tools

Every modern developer should be familiar with:

1. **TypeScript** — Type safety is no longer optional
2. **Tailwind CSS** — Utility-first styling
3. **Drizzle ORM** — Type-safe database queries
4. **Bun** — Fast JavaScript runtime

---

## Conclusion

The web platform continues to evolve at a rapid pace. By staying current with these technologies and practices, you'll be well-equipped to build fast, reliable, and maintainable web applications.

*What technologies are you most excited about? Share your thoughts in the comments below.*
`,
    },
    {
      title: "Finding Peace in Nature: A Photographer's Journey",
      excerpt:
        "How spending time in the wilderness transformed my approach to photography and life.",
      coverImage: images.nature,
      viewCount: 890,
      content: `
# Finding Peace in Nature: A Photographer's Journey

![Mountain landscape at sunset](${images.nature})

There's something profoundly healing about standing alone in the wilderness, camera in hand, waiting for the perfect light.

## The Beginning

It started three years ago when burnout forced me to take a sabbatical. I packed my camera gear and headed to the mountains with no plan—just a vague notion that I needed to *escape*.

> "In every walk with nature, one receives far more than he seeks." — John Muir

### What I Discovered

The first week was hard. My mind raced with thoughts of deadlines, emails, and responsibilities. But slowly, something shifted:

- The rhythm of sunrise and sunset became my schedule
- The silence taught me to listen
- The vastness put my problems in perspective

## Technical Lessons

Nature photography taught me patience and preparation:

\`\`\`
Golden Hour Checklist:
□ Scout location day before
□ Arrive 45 minutes early
□ Check weather and cloud cover
□ Bring layers (it gets cold!)
□ Fully charged batteries
□ Empty memory cards
\`\`\`

### Gear I Can't Live Without

1. **Wide-angle lens** (16-35mm) for landscapes
2. **Sturdy tripod** — don't cheap out on this
3. **ND filters** for long exposures
4. **Weather-sealed body** — conditions change fast

## The Transformation

What began as an escape became a lifestyle. Now I spend at least one week per month in nature, and my work has never been better.

---

*Where do you find your peace? I'd love to hear about your sanctuaries.*
`,
    },
    {
      title: "Urban Architecture: The Soul of Cities",
      excerpt:
        "Exploring how architecture shapes our daily experiences and defines the character of urban spaces.",
      coverImage: images.city,
      viewCount: 654,
      content: `
# Urban Architecture: The Soul of Cities

Every city tells a story through its buildings. From towering skyscrapers to humble row houses, architecture shapes how we live, work, and interact.

## The Language of Buildings

Architecture speaks in many dialects:

- **Brutalism** — Raw concrete, honest materials
- **Art Deco** — Geometric elegance, golden accents
- **Modernism** — Form follows function
- **Contemporary** — Breaking all the rules

> "Architecture is frozen music." — Johann Wolfgang von Goethe

### New York: A Case Study

Walking through Manhattan is like traversing a timeline of architectural ambition:

| Era | Style | Example |
|-----|-------|---------|
| 1930s | Art Deco | Chrysler Building |
| 1950s | International | Seagram Building |
| 1970s | Postmodern | AT&T Building |
| 2020s | Supertall | One Vanderbilt |

## The Human Scale

The best cities balance grandeur with intimacy. Consider:

1. **Street width** — Narrow streets feel cozier
2. **Building setbacks** — Space for trees and cafes
3. **Mixed-use zoning** — Living above shopping
4. **Public spaces** — Parks, plazas, promenades

### What Makes a Street Livable?

\`\`\`
Elements of a great street:
├── Trees (shade and beauty)
├── Wide sidewalks (room to stroll)
├── Ground-floor retail (eyes on the street)
├── Varied building heights (visual interest)
└── Benches and gathering spots
\`\`\`

## Looking Forward

The cities of tomorrow must address:

- [ ] Climate resilience
- [ ] Affordable housing
- [ ] Sustainable materials
- [ ] Adaptive reuse
- [x] Public transportation

---

*What's your favorite building? Share it in the comments!*
`,
    },
    {
      title: "The Art and Science of Perfect Coffee",
      excerpt:
        "From bean selection to brewing technique, everything you need to know about crafting the perfect cup.",
      coverImage: images.coffee,
      viewCount: 2100,
      content: `
# The Art and Science of Perfect Coffee

There's a reason coffee is the world's most popular beverage. When done right, it's a transcendent experience. Let me show you how to achieve coffee perfection at home.

![Fresh coffee and beans](${images.coffee})

## Understanding the Bean

Not all coffee is created equal. The journey to great coffee starts with understanding origins:

### Single Origins Worth Trying

| Origin | Flavor Profile | Best For |
|--------|---------------|----------|
| Ethiopia Yirgacheffe | Floral, citrus, tea-like | Pour over |
| Colombia Huila | Caramel, red fruit, balanced | All methods |
| Sumatra Mandheling | Earthy, herbal, full body | French press |
| Guatemala Antigua | Chocolate, spice, smoky | Espresso |

> "Coffee is a language in itself." — Jackie Chan

## The Variables That Matter

Perfect coffee requires controlling these variables:

1. **Grind size** — Match to your brewing method
2. **Water temperature** — 195-205°F (90-96°C)
3. **Brew ratio** — Start with 1:16 (coffee to water)
4. **Time** — Varies by method

### My Pour Over Recipe

\`\`\`
Equipment: V60, gooseneck kettle, scale, timer

Dose: 20g coffee (medium-fine grind)
Water: 320g at 205°F

00:00 - Bloom with 40g water
00:45 - Pour to 160g in slow spirals
01:30 - Pour to 320g
02:30 - Drawdown complete

Total time: ~3:00
\`\`\`

## Common Mistakes

Avoid these pitfalls:

- [ ] Using pre-ground coffee (grind fresh!)
- [x] Measuring by weight, not volume
- [ ] Ignoring water quality
- [ ] Storing beans in the fridge

### The Water Problem

Your coffee is 98% water. If your tap water tastes bad, your coffee will too. Solutions:

1. Use filtered water
2. Try Third Wave Water minerals
3. At minimum, use fresh cold water

---

## Final Thoughts

Great coffee is within everyone's reach. Start with fresh beans, dial in your variables, and taste critically. Your morning ritual will never be the same.

*What's your brewing method of choice? Share your tips below!*
`,
    },
    {
      title: "Building a Reading Habit That Sticks",
      excerpt:
        "Practical strategies for reading more books and retaining what you learn.",
      coverImage: images.books,
      viewCount: 1540,
      content: `
# Building a Reading Habit That Sticks

In an age of infinite scrolling, reading books feels almost countercultural. Yet the rewards—knowledge, empathy, focus—have never been more valuable.

## Why We Struggle to Read

Let's be honest about the obstacles:

- **Attention fragmentation** — Our brains are rewired for snippets
- **Decision paralysis** — Too many books, too little time
- **Guilt cycles** — Unfinished books haunt us

> "A reader lives a thousand lives before he dies. The man who never reads lives only one." — George R.R. Martin

## The System That Works

After years of experimentation, here's what actually works:

### 1. Lower the Barrier

\`\`\`
Old approach:
"I'll read for an hour tonight"
↓ (fails after 3 days)

New approach:
"I'll read one page before bed"
↓ (builds momentum)
\`\`\`

### 2. Environment Design

| Location | Optimization |
|----------|--------------|
| Bedroom | Book on pillow, phone charging elsewhere |
| Living room | Book on coffee table, visible |
| Bag | Always carry a book or e-reader |
| Bathroom | Yes, really. Short essays work great. |

### 3. The Two-Book System

Always have two books going:

1. **Main book** — Whatever interests you most
2. **Backup book** — Different genre, for when you're not in the mood

## Retention Strategies

Reading without retention is entertainment, not education. Try:

- [ ] Highlight and annotate
- [x] Take notes in your own words
- [x] Discuss books with others
- [ ] Write reviews (even brief ones)
- [x] Apply concepts immediately

### My Note-Taking Template

\`\`\`markdown
# Book Title by Author

## Key Concepts
- Concept 1: explanation in my words
- Concept 2: explanation in my words

## Memorable Quotes
> "Quote here" (page X)

## Action Items
- [ ] Thing to try
- [ ] Habit to build

## Questions/Disagreements
- Why does the author assume X?
\`\`\`

## Recommended Starting Points

New to reading? Try these accessible gems:

1. **Fiction**: *The Martian* by Andy Weir
2. **Non-fiction**: *Atomic Habits* by James Clear
3. **Essays**: *Consider the Lobster* by David Foster Wallace
4. **Biography**: *Shoe Dog* by Phil Knight

---

*What book changed your life? I'm always looking for recommendations!*
`,
    },
    {
      title: "Designing Your Perfect Home Office",
      excerpt:
        "A comprehensive guide to creating a workspace that boosts productivity and protects your health.",
      coverImage: images.workspace,
      viewCount: 980,
      content: `
# Designing Your Perfect Home Office

After years of remote work, I've learned that your environment profoundly impacts your output. Here's everything I know about creating a workspace that works.

![Clean workspace setup](${images.workspace})

## The Essentials

Before aesthetics, get the fundamentals right:

### Ergonomics Checklist

- [x] Monitor at eye level
- [x] Elbows at 90 degrees
- [x] Feet flat on floor (or footrest)
- [ ] Wrists neutral when typing
- [x] Chair supports lumbar spine

> "Take care of your body. It's the only place you have to live." — Jim Rohn

## My Current Setup

| Item | Recommendation | Why |
|------|---------------|-----|
| Desk | Standing desk | Movement matters |
| Chair | Herman Miller Aeron | Worth every penny |
| Monitor | 4K 27" | Sharp text reduces strain |
| Keyboard | Mechanical (linear) | Satisfying and durable |
| Mouse | Ergonomic vertical | Prevents RSI |

### The Desk Configuration

\`\`\`
┌─────────────────────────────────────┐
│           Monitor (centered)         │
│  ┌─────┐                   ┌─────┐  │
│  │Plant│                   │Lamp │  │
│  └─────┘   ┌─────────┐    └─────┘  │
│            │Keyboard │              │
│            └─────────┘              │
│     ┌─────┐         ┌──────┐       │
│     │Mouse│         │Coffee│       │
│     └─────┘         └──────┘       │
└─────────────────────────────────────┘
\`\`\`

## Lighting Matters

Bad lighting causes:

1. **Eye strain** — Headaches and fatigue
2. **Poor video calls** — Looking like a shadow
3. **Mood issues** — Especially in winter

### The Three-Light Setup

\`\`\`typescript
const lightingSources = {
  ambient: "Overhead or floor lamp (soft, indirect)",
  task: "Desk lamp (adjustable, focused)",
  natural: "Window (ideally perpendicular to screen)"
};
\`\`\`

## Sound Management

Working from home means dealing with:

- Neighbors
- Family members
- Street noise
- Your own music preferences

**Solutions:**

1. Noise-canceling headphones (essential)
2. White noise machine or app
3. Soft furnishings to absorb sound
4. "Do not disturb" signals for family

---

## The Hidden Details

Small things that make a big difference:

- **Cable management** — Out of sight, out of mind
- **Plants** — Real ones, for air and mood
- **Personal items** — A few, not cluttered
- **Temperature** — Slightly cool (68-72°F) is ideal

*What's your home office secret weapon? Share below!*
`,
    },
    {
      title: "The Science of Flavor: Understanding Taste",
      excerpt:
        "A deep dive into how our senses combine to create the experience of flavor.",
      coverImage: images.food,
      viewCount: 720,
      content: `
# The Science of Flavor: Understanding Taste

What we call "taste" is actually a complex symphony of senses. Understanding this can transform how you cook, eat, and appreciate food.

![Beautifully plated dish](${images.food})

## The Five Basic Tastes

Our tongues can detect five primary tastes:

| Taste | Detects | Examples |
|-------|---------|----------|
| Sweet | Sugars, energy | Honey, fruit |
| Salty | Minerals | Sea salt, soy sauce |
| Sour | Acidity | Lemon, vinegar |
| Bitter | Potential toxins | Coffee, dark chocolate |
| Umami | Proteins | Parmesan, mushrooms |

> "Cooking is like love. It should be entered into with abandon or not at all." — Harriet Van Horne

## Beyond the Tongue

Flavor is much more than taste:

### The Flavor Equation

\`\`\`
Flavor = Taste + Aroma + Texture + Temperature + Sound + Memory
\`\`\`

**Aroma** is particularly crucial—it accounts for up to 80% of what we perceive as flavor. That's why food tastes bland when you have a cold.

## Balancing Flavors

Great cooks balance these elements:

1. **Sweet** counters sour and bitter
2. **Salt** enhances everything
3. **Acid** brightens and cuts richness
4. **Fat** carries flavor and adds richness
5. **Umami** adds depth and savory satisfaction

### The Fix-It Guide

\`\`\`
Problem → Solution

Too salty → Add acid or sweet
Too sour → Add fat or sweet  
Too bitter → Add salt or fat
Too sweet → Add acid or salt
Too flat → Add salt or acid
\`\`\`

## Practical Applications

Use this knowledge in your cooking:

- [ ] Taste as you go
- [x] Season in layers
- [x] Finish with acid
- [x] Balance rich dishes with brightness
- [ ] Consider texture contrast

### Building Layers

\`\`\`typescript
// Example: Building a pasta sauce
const layers = [
  { step: "Sauté aromatics", adds: "Base flavor, fond" },
  { step: "Deglaze with wine", adds: "Acid, depth" },
  { step: "Add tomatoes", adds: "Sweet, acid, umami" },
  { step: "Simmer", adds: "Concentration" },
  { step: "Finish with butter", adds: "Richness, gloss" },
  { step: "Fresh basil", adds: "Brightness, aroma" },
  { step: "Parmesan", adds: "Salt, umami" },
];
\`\`\`

---

## The Takeaway

Next time you eat something delicious, pause. What are you tasting? What are you smelling? How does the texture contribute? Understanding flavor makes every meal an education.

*What dish taught you about flavor? Share your food epiphanies!*
`,
    },
    {
      title: "Lessons from a Year of Solo Travel",
      excerpt:
        "What twelve months on the road taught me about the world and myself.",
      coverImage: images.travel,
      viewCount: 1890,
      content: `
# Lessons from a Year of Solo Travel

One year ago, I sold most of my possessions, packed a 40L backpack, and left. What followed was the most transformative experience of my life.

![Travel scene](${images.travel})

## Why Solo?

People asked constantly: "Aren't you scared?" "Won't you be lonely?"

The truth:

> "Travel is fatal to prejudice, bigotry, and narrow-mindedness." — Mark Twain

Yes, sometimes I was scared. Yes, sometimes I was lonely. But more often, I was:

- Surprised by kindness
- Humbled by hospitality
- Amazed by resilience
- Changed by connection

## The Practical Stuff

### Packing List (What Actually Mattered)

\`\`\`
Essential:
├── 3 t-shirts (merino wool)
├── 2 pants (one converts to shorts)
├── Rain jacket
├── Comfortable walking shoes
├── Sandals
├── Laptop + charger
├── Phone + power bank
├── First aid basics
└── Good book

Wish I'd Left Home:
├── Jeans (too heavy, slow to dry)
├── Multiple guidebooks (use apps)
├── "Just in case" items
└── Expensive jewelry
\`\`\`

### Budget Breakdown

| Category | Monthly Average |
|----------|----------------|
| Accommodation | $600 |
| Food | $400 |
| Transportation | $300 |
| Activities | $200 |
| Misc | $100 |
| **Total** | **$1,600** |

## The Lessons

### 1. Comfort Zones Are Overrated

Every scary thing I did—from eating alone to navigating foreign transit systems—got easier with practice.

### 2. Less Stuff, More Freedom

\`\`\`
Possessions before: 1 apartment full
Possessions after: 1 backpack

Happiness: Increased
\`\`\`

### 3. People Are Generally Good

In 12 countries, strangers:

- [x] Invited me into their homes
- [x] Shared meals with me
- [x] Helped me when I was lost
- [x] Asked nothing in return

### 4. Home Is a Feeling

By the end, I realized home isn't a place. It's:

- A language you speak
- People who know your name
- Routines that ground you
- Feeling *known*

## Coming Back

Re-entry was harder than leaving. The world kept spinning without me. Old problems seemed smaller. Consumer culture felt absurd.

But I also gained:

1. **Gratitude** for hot showers and fast internet
2. **Perspective** on what matters
3. **Confidence** that I can handle anything
4. **Stories** for a lifetime

---

## Would I Do It Again?

In a heartbeat. But maybe differently—slower, deeper, less checking boxes.

*Have you traveled solo? What did it teach you?*
`,
    },
  ];

  // Create posts
  for (const postData of samplePosts) {
    try {
      const slug = generateSlug(postData.title);
      const now = new Date();
      // Stagger publish dates for variety
      const publishedAt = new Date(
        now.getTime() - Math.random() * 14 * 24 * 60 * 60 * 1000
      );

      await db.insert(post).values({
        id: crypto.randomUUID(),
        authorId: author.id,
        title: postData.title,
        slug,
        content: postData.content.trim(),
        excerpt: postData.excerpt,
        coverImage: postData.coverImage || null,
        viewCount: postData.viewCount,
        published: true,
        publishedAt,
        createdAt: publishedAt,
        updatedAt: now,
      });

      console.log(`✓ Created: "${postData.title}"`);
    } catch (error) {
      console.error(`✗ Failed to create "${postData.title}":`, error);
    }
  }

  console.log("\n✅ Seed complete!");
  process.exit(0);
}

seed().catch((error) => {
  console.error("Seed failed:", error);
  process.exit(1);
});
