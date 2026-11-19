export interface DraftFields {
  title: string;
  excerpt: string;
  tags?: string[];
  content: string;
  coverImage: string;
}

export function draftsMatch(a: DraftFields, b: DraftFields): boolean {
  return (
    a.title === b.title &&
    a.excerpt === b.excerpt &&
    JSON.stringify(a.tags ?? []) === JSON.stringify(b.tags ?? []) &&
    a.content === b.content &&
    a.coverImage === b.coverImage
  );
}

export function draftFormData(draft: DraftFields): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined)
      data.set(key, Array.isArray(value) ? JSON.stringify(value) : value);
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
