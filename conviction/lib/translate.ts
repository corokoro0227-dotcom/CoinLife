// Optional machine translation of article headlines/excerpts for the
// Japanese toggle. The English sources stay the single source of truth —
// this only changes the display language, it never adds a separate set of
// native-language sources. Requires DEEPL_API_KEY; when it isn't set, the
// caller falls back to showing the original English text untranslated.
const DEEPL_API_KEY = process.env.DEEPL_API_KEY;
const DEEPL_URL = DEEPL_API_KEY?.endsWith(":fx")
  ? "https://api-free.deepl.com/v2/translate"
  : "https://api.deepl.com/v2/translate";

type DeeplResponse = { translations: { text: string }[] };

/**
 * Translates a batch of strings to Japanese in one request. Returns null
 * (never throws) if no API key is configured or the request fails, so
 * callers can cleanly fall back to the original English text.
 */
export async function translateToJapanese(texts: string[]): Promise<string[] | null> {
  if (!DEEPL_API_KEY || texts.length === 0) return null;
  try {
    const res = await fetch(DEEPL_URL, {
      method: "POST",
      headers: { Authorization: `DeepL-Auth-Key ${DEEPL_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text: texts, target_lang: "JA" }),
      next: { revalidate: 900 },
    });
    if (!res.ok) {
      console.warn(`DeepL translation failed: ${res.status}`);
      return null;
    }
    const data = (await res.json()) as DeeplResponse;
    return data.translations.map((t) => t.text);
  } catch (error) {
    console.error("DeepL translation error", error);
    return null;
  }
}
