export interface DraftFields {
  title: string;
  excerpt: string;
  subtitle?: string;
  content: string;
  coverImage: string;
}

export function draftsMatch(a: DraftFields, b: DraftFields): boolean {
  return (
    a.title === b.title &&
    a.excerpt === b.excerpt &&
    a.subtitle === b.subtitle &&
    a.content === b.content &&
    a.coverImage === b.coverImage
  );
}

export function draftFormData(draft: DraftFields): FormData {
  const data = new FormData();
  for (const [key, value] of Object.entries(draft)) {
    if (value !== undefined) data.set(key, value);
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
