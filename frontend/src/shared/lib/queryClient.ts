import "server-only";
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// リクエスト単位で 1 つの QueryClient を共有する（サーバーのプリフェッチ用）
export const getQueryClient = cache(() => new QueryClient());
