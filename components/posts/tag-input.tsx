"use client";

import { useEffect, useState } from "react";

import { suggestTags } from "@/actions/tags";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizeTag } from "@/lib/tags";

export function TagInput({ value, onChange }: { value: string[]; onChange: (value: string[]) => void }) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    const timer = setTimeout(() => { suggestTags(query).then((tags) => { if (active) setSuggestions(tags.map((tag) => tag.name)); }); }, 200);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  function add(name: string) {
    const trimmed = name.trim();
    if (!normalizeTag(trimmed) || trimmed.length > 50) { setError("Use a tag of 1–50 characters with letters or numbers."); return; }
    if (value.length >= 5) { setError("Choose at most 5 tags."); return; }
    if (!value.some((tag) => normalizeTag(tag) === normalizeTag(trimmed))) onChange([...value, trimmed]);
    setQuery("");
    setError("");
  }
  return (
    <div className="space-y-3">
      <Label htmlFor="post-tags">Topics</Label>
      <p className="text-sm text-muted-foreground">Add up to 5 tags. Press Enter to add a topic.</p>
      <div className="flex flex-wrap items-center gap-2">
        {value.map((name) => <Badge key={normalizeTag(name)} variant="secondary">{name}<button type="button" aria-label={`Remove ${name}`} onClick={() => onChange(value.filter((tag) => tag !== name))}>×</button></Badge>)}
      </div>
      <Input id="post-tags" value={query} maxLength={50} placeholder="Add a tag" onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); add(query); } }} aria-describedby="tag-error" />
      {query && <div className="flex flex-wrap gap-2">
        {suggestions.filter((name) => !value.some((tag) => normalizeTag(tag) === normalizeTag(name))).map((name) => <Button key={name} type="button" variant="outline" size="sm" onClick={() => add(name)}>{name}</Button>)}
      </div>}
      {error && <p id="tag-error" role="alert" className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
