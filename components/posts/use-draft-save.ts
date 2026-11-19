"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { createPost, updatePost } from "@/actions/posts";
import { draftFormData, draftsMatch } from "@/lib/draft";

import type { DraftFields } from "@/lib/draft";

export function useDraftSave(
  data: DraftFields,
  initialSlug: string,
  published: boolean,
) {
  const latest = useRef(data);
  useEffect(() => {
    latest.current = data;
  }, [data]);
  const saved = useRef(data);
  const slug = useRef(initialSlug);
  const flight = useRef<Promise<string | null> | null>(null);
  const [currentSlug, setCurrentSlug] = useState(initialSlug);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [hasSaved, setHasSaved] = useState(!!initialSlug);
  const [savedData, setSavedData] = useState(data);
  const dirty = !draftsMatch(data, savedData);

  if (!dirty && hasSaved && error) setError("");

  const save = useCallback(async function save(): Promise<string | null> {
    if (flight.current) {
      const result = await flight.current;
      if (!result) return null;
      if (!draftsMatch(latest.current, saved.current)) return save();
      return slug.current || null;
    }
    if (slug.current && draftsMatch(latest.current, saved.current)) {
      setError("");
      setHasSaved(true);
      return slug.current;
    }
    const snapshot = { ...latest.current };
    if (!snapshot.title.trim()) {
      setError("Add a title to save your draft.");
      return null;
    }
    setSaving(true);
    setError("");
    const request = (async () => {
      try {
        const result = slug.current
          ? await updatePost(slug.current, draftFormData(snapshot))
          : await createPost(draftFormData(snapshot));
        if (result.error || !result.slug) {
          setError(result.error || "Could not save. Please retry.");
          return null;
        }
        if (!slug.current) {
          slug.current = result.slug;
          setCurrentSlug(result.slug);
          window.history.replaceState(null, "", `/edit/${result.slug}`);
        }
        saved.current = snapshot;
        setHasSaved(true);
        setSavedData(snapshot);
        return result.slug;
      } catch {
        setError("Could not save. Please retry.");
        return null;
      } finally {
        setSaving(false);
        flight.current = null;
      }
    })();
    flight.current = request;
    return request;
  }, []);

  useEffect(() => {
    if (published || !dirty || !data.title.trim()) return;
    const timer = window.setTimeout(() => void save(), 2000);
    return () => window.clearTimeout(timer);
  }, [
    data.title,
    data.excerpt,
    data.subtitle,
    data.content,
    data.coverImage,
    dirty,
    published,
    save,
  ]);

  useEffect(() => {
    function flush(): void {
      if (
        !published &&
        latest.current.title.trim() &&
        !draftsMatch(latest.current, saved.current)
      )
        void save();
    }
    function visibility(): void {
      if (document.visibilityState === "hidden") flush();
    }
    window.addEventListener("blur", flush);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("blur", flush);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [published, save]);

  useEffect(() => {
    function warn(event: BeforeUnloadEvent): void {
      if (dirty) {
        event.preventDefault();
        event.returnValue = "";
      }
    }
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  return {
    save,
    currentSlug,
    saving,
    error,
    dirty,
    status: saving
      ? "Saving…"
      : error
        ? "Save failed"
        : dirty || !hasSaved
          ? "Unsaved"
          : "Saved",
  };
}
