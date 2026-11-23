import { redirect } from "next/navigation";
import { getSession } from "@/features/auth/servers/getSession";

/** トップページ（/）。認証状態に応じて日報一覧またはログイン画面へ振り分ける */
export async function HomePageTemplate(): Promise<never> {
  const session = await getSession();
  redirect(session ? "/reports" : "/login");
}
