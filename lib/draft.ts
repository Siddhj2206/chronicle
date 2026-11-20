export interface DraftFields {
  title: string;
  excerpt: string;
  subtitle?: string;
  tags?: string[];
  content: string;
  coverImage: string;
}

export function draftsMatch(a: DraftFields, b: DraftFields): boolean {
  return (
    a.title === b.title &&
    a.excerpt === b.excerpt &&
    a.subtitle === b.subtitle &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []) &&
    a.content === b.content &&
    a.coverImage === b.coverImage
  );
}

export function draftFormData(draft: DraftFields): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(draft)) {
    if (Array.isArray(value)) {
      for (const item of value) data.append(key, item);
    } else if (value !== undefined) data.set(key, value);
  }
  return data;
}

export function editorUrl(value: string): string | null {
  try {
    const url = new URL(value.trim());
    return ["http:", "https:"].includes(url.protocol) ? url.href : null;
  } catch {
    return null;
  }
}
