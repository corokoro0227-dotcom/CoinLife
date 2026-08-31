"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { MAX_QUOTE_LENGTH, MIN_COMMENTARY_LENGTH } from "@/lib/columnLanguages";

export default function NewColumnPage() {
  const { status } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({
    title: "",
    sourceName: "",
    sourceUrl: "",
    quote: "",
    commentary: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (status === "unauthenticated") {
    return <p className="text-sm text-zinc-500">コラムを書くにはウォレットでログインしてください。</p>;
  }

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/columns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "投稿に失敗しました");
        return;
      }
      router.push(`/columns/${data.id}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mx-auto flex max-w-xl flex-col gap-3">
      <h1 className="text-2xl font-semibold">コラムを書く</h1>
      <p className="text-xs text-zinc-500">
        引用は{MAX_QUOTE_LENGTH}文字までの短い範囲にとどめ、必ず引用元へのリンクを添えてください。あなた自身のコメントも
        {MIN_COMMENTARY_LENGTH}文字以上書いてください。
      </p>

      <input
        required
        placeholder="タイトル"
        value={form.title}
        onChange={(e) => setForm({ ...form, title: e.target.value })}
        className="rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
      />

      <label className="text-xs text-zinc-500">
        引用元の名前(メディア名など)
        <input
          required
          value={form.sourceName}
          onChange={(e) => setForm({ ...form, sourceName: e.target.value })}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="text-xs text-zinc-500">
        引用元URL
        <input
          required
          type="url"
          placeholder="https://"
          value={form.sourceUrl}
          onChange={(e) => setForm({ ...form, sourceUrl: e.target.value })}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      <label className="text-xs text-zinc-500">
        引用(最大{MAX_QUOTE_LENGTH}文字)
        <textarea
          required
          maxLength={MAX_QUOTE_LENGTH}
          value={form.quote}
          onChange={(e) => setForm({ ...form, quote: e.target.value })}
          rows={3}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
        <span className="mt-1 block text-right text-[11px] text-zinc-400">{form.quote.length}/{MAX_QUOTE_LENGTH}</span>
      </label>

      <label className="text-xs text-zinc-500">
        あなたのコメント(最低{MIN_COMMENTARY_LENGTH}文字)
        <textarea
          required
          value={form.commentary}
          onChange={(e) => setForm({ ...form, commentary: e.target.value })}
          rows={5}
          className="mt-1 w-full rounded-none border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
        />
      </label>

      {error && <p className="text-xs text-red-500">{error}</p>}
      <button
        type="submit"
        disabled={submitting}
        className="rounded-none bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900"
      >
        {submitting ? "投稿中…" : "投稿する"}
      </button>
    </form>
  );
}
