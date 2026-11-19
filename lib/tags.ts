import slugify from "slugify";
import { z } from "zod";

export function normalizeTag(value: string): string {
  return slugify(value.normalize("NFKC").trim(), { lower: true, strict: true });
}

export const tagsSchema = z.array(z.string().trim().min(1).max(50)
  .refine((value) => normalizeTag(value).length > 0, "Tag must contain letters or numbers"))
  .max(5, "Choose at most 5 tags")
  .transform((values) => [...new Map(values.map((name) => [normalizeTag(name), { name, slug: normalizeTag(name) }])).values()]);
