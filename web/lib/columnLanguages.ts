export const COLUMN_LANGUAGES = [
  { code: "ja", label: "日本語" },
  { code: "en", label: "English" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
] as const;

export type ColumnLanguageCode = (typeof COLUMN_LANGUAGES)[number]["code"];

export function languageLabel(code: string): string {
  return COLUMN_LANGUAGES.find((lang) => lang.code === code)?.label ?? code;
}

export const MAX_QUOTE_LENGTH = 300;
export const MIN_COMMENTARY_LENGTH = 20;
