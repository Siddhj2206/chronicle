import { z } from "zod";

import { isAllowedImageUrl } from "@/lib/image-sources";
import { tagsSchema } from "@/lib/tags";

export const imageUrlSchema = z
  .string()
  .url("Invalid image URL")
  .refine(
    isAllowedImageUrl,
    "Image URL must use an allowed image host over HTTPS",
  );

// Reserved usernames that cannot be used
const RESERVED_USERNAMES = [
  "admin",
  "api",
  "auth",
  "dashboard",
  "edit",
  "new",
  "onboarding",
  "search",
  "settings",
  "sign-in",
  "sign-out",
];

export const usernameSchema = z
  .string()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(
    /^[a-zA-Z0-9_]+$/,
    "Username can only contain letters, numbers, and underscores",
  )
  .refine(
    (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
    "This username is reserved",
  );

export const postSchema = z.object({
  tags: tagsSchema.default([]),
  title: z
    .string()
    .min(1, "Title is required")
    .max(200, "Title must be at most 200 characters"),
  content: z.string().min(1, "Content is required"),
  excerpt: z
    .string()
    .max(300, "Excerpt must be at most 300 characters")
    .optional(),
  coverImage: imageUrlSchema.optional().or(z.literal("")),
});

export const commentSchema = z.object({
  content: z
    .string()
    .min(1, "Comment is required")
    .max(2000, "Comment must be at most 2000 characters"),
});

export const profileSchema = z.object({
  name: z
    .string()
    .min(1, "Name is required")
    .max(100, "Name must be at most 100 characters"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .max(20, "Username must be at most 20 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores",
    )
    .refine(
      (val) => !RESERVED_USERNAMES.includes(val.toLowerCase()),
      "This username is reserved",
    )
    .optional(),
  bio: z.string().max(500, "Bio must be at most 500 characters").optional(),
  image: imageUrlSchema.optional().or(z.literal("")),
});
