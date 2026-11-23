import { redirect } from "next/navigation";
import { Suspense } from "react";
import { getSession } from "@/features/auth/servers/getSession";

const AUTHENTICATED_HOME = "/reports";
const UNAUTHENTICATED_HOME = "/login";

/** 認証済みなら日報一覧、未認証ならログイン画面へ振り分ける */
async function RedirectByAuth(): Promise<never> {
  const session = await getSession();
  redirect(session ? AUTHENTICATED_HOME : UNAUTHENTICATED_HOME);
}

// セッション（Cookie）の読み取りは cacheComponents のため Suspense 境界の内側で行う
export default function Page() {
  return (
    <Suspense>
      <RedirectByAuth />
    </Suspense>
  );
}
