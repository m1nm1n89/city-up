import Link from "next/link";
import { SignUpForm } from "@/components/auth/SignUpForm";
import { SIGNUP_ENABLED } from "@/lib/auth/signupGate";

export default function SignUpPage() {
  if (!SIGNUP_ENABLED) {
    return (
      <div className="space-y-4 text-center">
        <h1 className="text-2xl font-bold">クローズドベータ中</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
          現在は招待ユーザーのみが利用できます。
          <br />
          公開はもう少しお待ちください。
        </p>
        <p className="text-sm">
          すでにアカウントをお持ちですか?
          <Link
            href="/login"
            className="ml-1 underline text-gray-700 dark:text-gray-300"
          >
            ログイン
          </Link>
        </p>
      </div>
    );
  }
  return <SignUpForm />;
}
