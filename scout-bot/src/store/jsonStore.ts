import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

/** シンプルなJSONファイル永続化。DB不要でCLIとして自己完結させるため。 */
export async function readJson<T>(path: string, fallback: T): Promise<T> {
  try {
    const raw = await readFile(path, "utf8");
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export async function writeJson<T>(path: string, value: T): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(value, null, 2), "utf8");
}
