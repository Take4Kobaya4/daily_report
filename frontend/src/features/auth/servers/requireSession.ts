import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./getSession";

/** PageTemplate 用。未認証の場合は /login へリダイレクトする */
export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
