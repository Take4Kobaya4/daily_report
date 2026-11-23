# TanStack Query 実装ガイド

## 概要

TanStack Query でクライアント側のサーバー状態（日報一覧・詳細）を管理します。

- **初期表示**: Server Component で `external/handler` を呼び、キャッシュへプリフェッチしてハイドレーションする
- **再取得・更新**: Client API（`fetch` → Route Handler）を使用する

## セットアップ

### Provider

```tsx
// shared/providers/QueryProvider.tsx
"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function QueryProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            refetchOnWindowFocus: false,
          },
        },
      }),
  );

  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
}
```

`app/layout.tsx` の `<body>` 内で `QueryProvider` を使用します。

### staleTime の設定意図

| 設定 | 値 | 理由 |
| --- | --- | --- |
| `staleTime` | 60 秒 | ハイドレーション直後にクライアントで即座に再取得しないため。`0` にするとプリフェッチの効果がなくなる |
| `refetchOnWindowFocus` | `false` | 個人利用で他端末からの同時編集を想定しないため |

### サーバー用 QueryClient

```ts
// shared/lib/queryClient.ts
import { QueryClient } from "@tanstack/react-query";
import { cache } from "react";

// リクエスト単位で 1 つの QueryClient を共有する
export const getQueryClient = cache(() => new QueryClient());
```

## クエリキーの管理

クエリキーは日報のページ群でしか使わないため、`features/reports/queries/` に置きます。PageTemplate（サーバーのプリフェッチ）と Client Component の両方から参照します。

```ts
// features/reports/queries/keys.ts
export const reportKeys = {
  all: ["reports"] as const,
  lists: () => [...reportKeys.all, "list"] as const,
  details: () => [...reportKeys.all, "detail"] as const,
  detail: (id: string) => [...reportKeys.details(), id] as const,
};
```

キーを文字列リテラルで直書きしないでください。無効化漏れの原因になります。

## Client API

Route Handler の呼び出しは `features/reports/api/` に集約します。

```ts
// features/reports/api/reportApi.ts
import type { ReportRequest, ReportResponse } from "@/external/dto/report.dto";

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API Error: ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

export const reportApi = {
  list: () => request<ReportResponse[]>("/api/reports"),
  get: (id: string) => request<ReportResponse>(`/api/reports/${id}`),
  create: (input: ReportRequest) =>
    request<ReportResponse>("/api/reports", { method: "POST", body: JSON.stringify(input) }),
  update: (id: string, input: ReportRequest) =>
    request<ReportResponse>(`/api/reports/${id}`, { method: "PATCH", body: JSON.stringify(input) }),
  remove: (id: string) => request<void>(`/api/reports/${id}`, { method: "DELETE" }),
};
```

エラーレスポンスの形式が決まったら、`ApiError` に本文（フィールドエラーなど）を持たせてください。

## サーバーサイドプリフェッチ

Server Component では自分自身の Route Handler を `fetch` せず、`external/handler` の Query を直接呼び出します。

```tsx
// features/reports/components/server/ReportListPageTemplate/ReportListPageTemplate.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { listReportsQuery } from "@/external/handler/report/report.query.server";
import { requireSession } from "@/features/auth/servers/requireSession";
import { reportKeys } from "@/features/reports/queries/keys";
import { getQueryClient } from "@/shared/lib/queryClient";
import { ReportList } from "../../client/ReportList";

export async function ReportListPageTemplate() {
  const session = await requireSession();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: reportKeys.lists(),
    queryFn: () => listReportsQuery(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReportList />
    </HydrationBoundary>
  );
}
```

プリフェッチ結果と API レスポンスは、どちらも handler の converter を通るため同じ `ReportResponse` 型になります（[05_external_layer.md](./05_external_layer.md#converterdomain--dto)）。

## Query

```ts
// features/reports/hooks/useReportQuery.ts
import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/features/reports/api/reportApi";
import { reportKeys } from "@/features/reports/queries/keys";

export function useReportListQuery() {
  return useQuery({
    queryKey: reportKeys.lists(),
    queryFn: reportApi.list,
  });
}

export function useReportDetailQuery(id: string) {
  return useQuery({
    queryKey: reportKeys.detail(id),
    queryFn: () => reportApi.get(id),
  });
}
```

## Mutation

```ts
// features/reports/hooks/useReportMutation.ts
import { useMutation, useQueryClient } from "@tanstack/react-query";
import type { ReportRequest } from "@/external/dto/report.dto";
import { reportApi } from "@/features/reports/api/reportApi";
import { reportKeys } from "@/features/reports/queries/keys";

export function useCreateReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportApi.create,
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(report.id), report);
      return queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

export function useUpdateReportMutation(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ReportRequest) => reportApi.update(id, input),
    onSuccess: (report) => {
      queryClient.setQueryData(reportKeys.detail(id), report);
      return queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}

export function useDeleteReportMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: reportApi.remove,
    onSuccess: (_, id) => {
      queryClient.removeQueries({ queryKey: reportKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: reportKeys.lists() });
    },
  });
}
```

- これらは Feature 内の複数コンポーネントで使うため `features/reports/hooks/` に置く。コンポーネント専用の処理（画面遷移など）は各コンポーネントの専用 Hook（`useReportCreate` など）に書く。
- 画面遷移（`router.push`）は専用 Hook の `mutate(..., { onSuccess })` で行う。
- 保存中の二重送信は `isPending` でボタンを無効化して防ぐ（[07_form_validation.md](./07_form_validation.md)）。
- 楽観的更新・無限スクロールは MVP では導入しない。

## エラー時の扱い

| ステータス | 扱い |
| --- | --- |
| 401 | ログイン画面へ遷移する |
| 404 | Not Found 表示（他ユーザーの日報も同様） |
| 422 | フォームにエラーメッセージを表示する |
| その他 | 汎用エラーメッセージを表示し、入力内容は保持する |
