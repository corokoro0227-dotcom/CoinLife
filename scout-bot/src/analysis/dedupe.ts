import { readJson, writeJson } from "../store/jsonStore.js";

const SEEN_PATH = new URL("../../data/seen-tickers.json", import.meta.url).pathname;
const RECYCLE_WINDOW_DAYS = 14;

interface SeenStore {
  // ticker -> 初めて検出したISO8601時刻
  [ticker: string]: string;
}

/**
 * 「新しいコインだけを見つける」ためのフィルタ。
 * RECYCLE_WINDOW_DAYS 以内に既に検出済みのティッカーは「使い回し」とみなし除外する。
 * 初検出のティッカーは記録し、次回以降のスキャンで再度弾けるようにする。
 */
export class TickerDedupe {
  private store: SeenStore = {};
  private loaded = false;

  private async ensureLoaded() {
    if (!this.loaded) {
      this.store = await readJson<SeenStore>(SEEN_PATH, {});
      this.loaded = true;
    }
  }

  async isNew(ticker: string): Promise<boolean> {
    await this.ensureLoaded();
    const seenAt = this.store[ticker.toUpperCase()];
    if (!seenAt) return true;
    const ageMs = Date.now() - new Date(seenAt).getTime();
    return ageMs > RECYCLE_WINDOW_DAYS * 24 * 60 * 60 * 1000;
  }

  async markSeen(ticker: string, at: string = new Date().toISOString()): Promise<void> {
    await this.ensureLoaded();
    const key = ticker.toUpperCase();
    if (!this.store[key]) this.store[key] = at;
  }

  async persist(): Promise<void> {
    await writeJson(SEEN_PATH, this.store);
  }
}
