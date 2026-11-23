import "server-only";
import { getSession } from "./getSession";

/** 未認証の場合は null。Route Handler では null のとき 401 を返す */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}
