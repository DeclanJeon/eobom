export type BibleTranslationId = "ko-open-bible" | "en-web" | "user-typed";

export type BibleReference = {
  code: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
};

export type BibleVerse = {
  code: string;
  chapter: number;
  verse: number;
  text: string;
};

export type BookMeta = {
  order: number;
  code: string;
  name: string;
  testament: "old" | "new";
  chapters: number;
  verses: number;
};

export type ScriptureBinding = {
  code: string;
  chapter: number;
  startVerse: number;
  endVerse: number;
  display: string;
  excerpt?: string;
  translation: BibleTranslationId;
  slug: string;
};

export type PassageResult = {
  binding: ScriptureBinding;
  verses: BibleVerse[];
};
