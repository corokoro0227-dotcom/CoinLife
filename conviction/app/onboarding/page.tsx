"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { COINS } from "@/lib/coins";

export default function OnboardingPage() {
  const router = useRouter();
  const [coinId, setCoinId] = useState("");
  const [stance, setStance] = useState<"BULLISH" | "BEARISH" | "">("");
  const [email, setEmail] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!coinId || !stance || !confirmed) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coinId, stance, email }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong");
        return;
      }
      router.push("/onboarding/check-email");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Lock in your coin & stance</h1>
        <p className="mt-2 text-sm text-zinc-500">
          This choice is permanent. Read it carefully before you submit.
        </p>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">1. Pick exactly one coin</legend>
        <div className="mt-2 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {COINS.map((coin) => (
            <label
              key={coin.id}
              className={`cursor-pointer border px-3 py-2 text-sm ${
                coinId === coin.id
                  ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <input
                type="radio"
                name="coin"
                value={coin.id}
                checked={coinId === coin.id}
                onChange={() => setCoinId(coin.id)}
                className="sr-only"
              />
              {coin.name} <span className="opacity-60">{coin.symbol}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">2. Pick exactly one narrative direction to keep seeing</legend>
        <p className="mt-1 text-xs text-zinc-500">
          This isn&apos;t about whether you &quot;like&quot; the coin — it&apos;s about which kind of news you want
          to keep following, whatever your reason. Want confirmation it&apos;s rising? Pick bullish. Waiting to buy
          a dip and want to see crash/risk news the moment it happens? Pick bearish — that <em>is</em> the content
          you&apos;re after.
        </p>
        <div className="mt-2 flex flex-col gap-2">
          <label
            className={`cursor-pointer border px-4 py-3 text-sm ${
              stance === "BULLISH"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="stance"
              value="BULLISH"
              checked={stance === "BULLISH"}
              onChange={() => setStance("BULLISH")}
              className="sr-only"
            />
            <span className="font-medium">Bullish signals</span> — surges, rallies, adoption, approvals, upgrades
          </label>
          <label
            className={`cursor-pointer border px-4 py-3 text-sm ${
              stance === "BEARISH"
                ? "border-zinc-900 bg-zinc-900 text-white dark:border-white dark:bg-white dark:text-zinc-900"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <input
              type="radio"
              name="stance"
              value="BEARISH"
              checked={stance === "BEARISH"}
              onChange={() => setStance("BEARISH")}
              className="sr-only"
            />
            <span className="font-medium">Bearish / risk signals</span> — crashes, hacks, lawsuits, crackdowns,
            sell-offs
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="text-sm font-medium">3. Your email</legend>
        <p className="mt-1 text-xs text-zinc-500">
          We&apos;ll send a confirmation link. Your account (and your locked-in choice) is tied to this email
          permanently — there is no password to reset your way around it.
        </p>
        <input
          required
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="mt-2 w-full border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </fieldset>

      <label className="flex items-start gap-2 text-sm text-zinc-600 dark:text-zinc-400">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="mt-0.5"
        />
        I understand this coin and this stance cannot be changed once I confirm my email. This restriction is
        intentional — it exists to protect my own judgment from being swayed later.
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}

      <button
        type="submit"
        disabled={!coinId || !stance || !confirmed || submitting}
        className="bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-40 dark:bg-white dark:text-zinc-900"
      >
        {submitting ? "Sending…" : "Send confirmation link"}
      </button>
    </form>
  );
}
