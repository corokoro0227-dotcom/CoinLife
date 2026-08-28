import Link from "next/link";
import { SiwsLogin } from "@/components/SiwsLogin";

export default function LoginPage() {
  return (
    <div className="flex flex-col items-center gap-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">ログイン</h1>
      <p className="max-w-sm text-sm text-zinc-500">
        Solanaウォレットを接続し、署名するだけでログインできます。パスワードやメールアドレスは不要です。
      </p>
      <SiwsLogin />
      <p className="max-w-sm text-xs text-zinc-400">
        ログインすることで、
        <Link href="/terms" className="underline hover:text-zinc-600 dark:hover:text-zinc-300">
          利用規約
        </Link>
        に同意したものとみなされます。
      </p>
    </div>
  );
}
