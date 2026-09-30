import { getCollection, type CollectionEntry } from 'astro:content';

export type Note = CollectionEntry<'notes'>;

/** Published notes, newest first. Drafts are included only in dev. */
export async function getNotes(): Promise<Note[]> {
  const notes = await getCollection('notes', ({ data }) => import.meta.env.DEV || !data.draft);
  return notes.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

/** 2026-09-30 — ISO date, matches the monospace look and reads the same everywhere. */
export function formatDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}
