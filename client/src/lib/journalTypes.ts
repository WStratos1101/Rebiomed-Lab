export type JournalStatus = "draft" | "published" | "archived";

export type JournalLanguage = "English" | "Vietnamese" | "Chinese" | "Japanese" | "Other";

export interface JournalTranslation {
  id: string;
  language: JournalLanguage;
  title: string;
  content: string;
  translator: string;
  status: JournalStatus;
  updatedAt: string;
}

export interface JournalDocument {
  id: string;
  title: string;
  authors: string;
  journal: string;
  year: string;
  doi: string;
  sourceLanguage: JournalLanguage;
  sourceUrl: string;
  abstract: string;
  tags: string[];
  status: JournalStatus;
  createdAt: string;
  updatedAt: string;
  translations: JournalTranslation[];
}
