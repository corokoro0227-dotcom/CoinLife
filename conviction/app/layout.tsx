import type { Metadata } from "next";
import Link from "next/link";
import { cookies } from "next/headers";
import "./globals.css";
import { getCurrentUser } from "@/lib/session";
import { t, LANG_COOKIE, type Lang } from "@/lib/i18n";

export const metadata: Metadata = {
  title: "Conviction",
  description: "Pick one coin, pick one stance, and never see anything that contradicts it again.",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const cookieStore = await cookies();
  const lang: Lang = cookieStore.get(LANG_COOKIE)?.value === "ja" ? "ja" : "en";
  const user = await getCurrentUser();

  return (
    <html lang={lang}>
      <body className="antialiased">
        <header className="border-b border-zinc-200 dark:border-zinc-800">
          <div className="mx-auto flex max-w-4xl items-center justify-between px-4 py-3">
            <Link href="/" className="flex items-center gap-1.5 font-semibold tracking-tight">
              <span className="h-2.5 w-2.5 bg-zinc-900 dark:bg-white" aria-hidden="true" />
              {t(lang, "siteName")}
            </Link>
            <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
              {user ? (
                <>
                  <Link href="/dashboard" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                    {t(lang, "navDashboard")}
                  </Link>
                  <form action="/api/auth/logout" method="POST">
                    <button type="submit" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                      {t(lang, "navLogout")}
                    </button>
                  </form>
                </>
              ) : (
                <Link href="/login" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                  {t(lang, "navLogin")}
                </Link>
              )}
              <Link href="/about" className="hover:text-zinc-900 dark:hover:text-zinc-100">
                {t(lang, "navAbout")}
              </Link>
              <a href={`/api/lang?lang=${lang === "ja" ? "en" : "ja"}`} className="hover:text-zinc-900 dark:hover:text-zinc-100">
                {t(lang, "navLangToggle")}
              </a>
            </nav>
          </div>
        </header>
        <main className="mx-auto max-w-4xl px-4 py-8">{children}</main>
        <footer className="mx-auto max-w-4xl px-4 pb-10 text-xs text-zinc-400">{t(lang, "footerDisclaimer")}</footer>
      </body>
    </html>
  );
}
