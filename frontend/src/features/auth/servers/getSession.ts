import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/shared/lib/auth/auth";

// 同一リクエスト内で複数回呼ばれても DB 問い合わせを 1 回にする
export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);
