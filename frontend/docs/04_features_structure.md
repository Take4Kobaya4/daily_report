# Features ディレクトリ設計

## 概要

`features/` は、**その機能のページ群でしか使わないもの** を機能単位でひとまとめにする場所です。MVP の Feature は以下の 2 つです。

```
features/
├─ auth/       # ユーザー登録・ログイン・ログアウト
└─ reports/    # 日報の作成・一覧・詳細・編集・削除
```

| 置き場所 | 置くもの |
| --- | --- |
| `features/{feature}/` | その機能のページ群でしか使わないもの（PageTemplate、Container / Presenter、そのコンポーネント専用の Hook、クエリキーなど） |
| `shared/` | 複数の Feature から使うもの（shadcn/ui、汎用 UI、QueryClient、Provider など） |
| `external/` | DB・外部 API とのやり取り（入力検証・業務ロジック・データアクセス）（[05_external_layer.md](./05_external_layer.md)） |

最初は `features/` に置き、2 つ以上の Feature で必要になった時点で `shared/` へ移動してください。先回りして汎用化しないでください。

## 機能モジュールの内部構造

`reports` を例にした完成形です。ファイルは必要になった段階で追加してください。

```
features/reports/
├─ components/
│  ├─ server/                         # Server Components（ページ単位）
│  │  ├─ ReportListPageTemplate/
│  │  │  ├─ index.ts
│  │  │  └─ ReportListPageTemplate.tsx
│  │  ├─ ReportDetailPageTemplate/
│  │  ├─ ReportNewPageTemplate/
│  │  └─ ReportEditPageTemplate/
│  └─ client/                         # Client Components（コンポーネント単位）
│     ├─ ReportList/
│     │  ├─ index.ts
│     │  ├─ ReportListContainer.tsx
│     │  ├─ ReportListPresenter.tsx
│     │  ├─ ReportListItem.tsx        # View 専用の子コンポーネント
│     │  ├─ ReportListSkeleton.tsx    # View 専用の子コンポーネント
│     │  ├─ ReportListEmpty.tsx       # View 専用の子コンポーネント
│     │  └─ useReportList.ts          # このコンポーネント専用の Hook
│     ├─ ReportDetail/
│     │  ├─ index.ts
│     │  ├─ ReportDetailContainer.tsx
│     │  ├─ ReportDetailPresenter.tsx
│     │  ├─ ReportDeleteDialog.tsx
│     │  └─ useReportDetail.ts
│     ├─ ReportCreate/
│     │  ├─ index.ts
│     │  ├─ ReportCreateContainer.tsx
│     │  ├─ ReportCreatePresenter.tsx
│     │  └─ useReportCreate.ts
│     ├─ ReportEdit/
│     │  ├─ index.ts
│     │  ├─ ReportEditContainer.tsx
│     │  ├─ ReportEditPresenter.tsx
│     │  └─ useReportEdit.ts
│     ├─ ReportForm/                  # 作成・編集で共通のフォーム
│     │  ├─ index.ts
│     │  ├─ ReportFormContainer.tsx
│     │  ├─ ReportFormPresenter.tsx
│     │  └─ useReportForm.ts
│     └─ MarkdownPreview/             # ロジックなし（Presenter のみ）
│        ├─ index.ts
│        └─ MarkdownPreview.tsx
├─ hooks/                             # Feature 内で共有するデータ取得 Hook
│  ├─ useReportQuery.ts               # useQuery
│  └─ useReportMutation.ts            # useMutation
├─ queries/
│  └─ keys.ts                         # クエリキー
└─ api/
   └─ reportApi.ts                    # fetch による Route Handler 呼び出し
```

Zod スキーマ・API の入出力型は `external/dto/report.dto.ts` を使用し、`features/` 側で重複して定義しません。画面専用の型が必要になった場合は `features/reports/types/` を追加します。

### `auth` の構成

```
features/auth/
├─ components/
│  ├─ server/
│  │  ├─ LoginPageTemplate/
│  │  └─ RegisterPageTemplate/
│  └─ client/
│     ├─ LoginForm/
│     ├─ RegisterForm/
│     └─ LogoutButton/
└─ servers/                           # サーバー専用の関数（コンポーネント以外）
   ├─ getSession.ts
   ├─ getSessionUserId.ts
   └─ requireSession.ts
```

詳細は [08_authentication.md](./08_authentication.md) を参照してください。

## Server Components（PageTemplate）

`components/server/` には `page.tsx` から呼ばれるページ単位のコンポーネントを置きます。命名は `XxxPageTemplate` とし、ディレクトリを作って `index.ts` でエクスポートします。

責務：

- 認証確認（未認証なら `/login` へリダイレクト）
- `external/handler` による初期データのプリフェッチ（[06_tanstack_query.md](./06_tanstack_query.md#サーバーサイドプリフェッチ)）
- 存在しない・他ユーザーの日報の `notFound()`
- Client Component（Container）の呼び出し

```tsx
// features/reports/components/server/ReportDetailPageTemplate/ReportDetailPageTemplate.tsx
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { notFound } from "next/navigation";
import { getReportByIdQuery } from "@/external/handler/report/report.query.server";
import { requireSession } from "@/features/auth/servers/requireSession";
import { reportKeys } from "@/features/reports/queries/keys";
import { getQueryClient } from "@/shared/lib/queryClient";
import { ReportDetail } from "../../client/ReportDetail";

type Props = { reportId: string };

export async function ReportDetailPageTemplate({ reportId }: Props) {
  const session = await requireSession();
  const report = await getReportByIdQuery(session.user.id, reportId);
  if (!report) notFound();

  const queryClient = getQueryClient();
  queryClient.setQueryData(reportKeys.detail(reportId), report);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReportDetail reportId={reportId} />
    </HydrationBoundary>
  );
}
```

```ts
// features/reports/components/server/ReportDetailPageTemplate/index.ts
export { ReportDetailPageTemplate } from "./ReportDetailPageTemplate";
```

## Client Components（Container / Presenter）

1 つのコンポーネントにつき 1 ディレクトリを作り、Container・Presenter・専用 Hook をまとめます。

```
ReportList/
├─ index.ts                   # 外部への公開窓口（Container のみ公開）
├─ ReportListContainer.tsx    # ロジック層
├─ ReportListPresenter.tsx    # 表示層
└─ useReportList.ts           # Container が使う Hook
```

### Container（ロジック層）

**Container は DOM を直接描画せず、同じディレクトリの Presenter に Props を渡すだけにします。**

責務：

- 専用 Hook（`useXxx`）を呼び出す
- Presenter をレンダリングして Props を渡す

```tsx
// features/reports/components/client/ReportList/ReportListContainer.tsx
"use client";

import { ReportListPresenter } from "./ReportListPresenter";
import { useReportList } from "./useReportList";

export function ReportListContainer() {
  const { reports, isLoading, isError } = useReportList();

  return <ReportListPresenter reports={reports} isLoading={isLoading} isError={isError} />;
}
```

#### 悪い例 ❌

```tsx
// ❌ Container で DOM を描画している
export function ReportListContainer() {
  const { reports, isLoading } = useReportList();

  return (
    <section className="space-y-4">
      <h1>日報一覧</h1>
      <ReportListPresenter reports={reports} isLoading={isLoading} />
    </section>
  );
}
```

この場合は、DOM をすべて Presenter に移動してください。

### 専用 Hook

Container のロジック（データ取得、イベントハンドラ、画面遷移、表示用の整形）は、同じディレクトリの `useXxx.ts` に集約します。

```ts
// features/reports/components/client/ReportList/useReportList.ts
import { useReportListQuery } from "@/features/reports/hooks/useReportQuery";

export function useReportList() {
  const { data, isPending, isError } = useReportListQuery();

  return {
    reports: data ?? [],
    isLoading: isPending,
    isError,
  };
}
```

```ts
// features/reports/components/client/ReportDetail/useReportDetail.ts
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useDeleteReportMutation } from "@/features/reports/hooks/useReportMutation";
import { useReportDetailQuery } from "@/features/reports/hooks/useReportQuery";

export function useReportDetail(reportId: string) {
  const router = useRouter();
  const { data: report } = useReportDetailQuery(reportId);
  const deleteMutation = useDeleteReportMutation();
  const [isDeleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleDeleteConfirm = () => {
    deleteMutation.mutate(reportId, {
      onSuccess: () => router.push("/reports"),
    });
  };

  return {
    report,
    isDeleteDialogOpen,
    isDeleting: deleteMutation.isPending,
    openDeleteDialog: () => setDeleteDialogOpen(true),
    closeDeleteDialog: () => setDeleteDialogOpen(false),
    handleDeleteConfirm,
  };
}
```

React Compiler が有効なため、ハンドラを `useCallback` で包む必要はありません。

### Presenter（表示層）

**Presenter はロジックを持たず、Props で渡されたデータを表示するのみにします。**

```tsx
// features/reports/components/client/ReportList/ReportListPresenter.tsx
import Link from "next/link";
import type { ReportResponse } from "@/external/dto/report.dto";
import { ReportListEmpty } from "./ReportListEmpty";
import { ReportListItem } from "./ReportListItem";
import { ReportListSkeleton } from "./ReportListSkeleton";

type Props = {
  reports: ReportResponse[];
  isLoading: boolean;
  isError: boolean;
};

export function ReportListPresenter({ reports, isLoading, isError }: Props) {
  if (isLoading) return <ReportListSkeleton />;
  if (isError) return <p role="alert">日報の取得に失敗しました。</p>;
  if (reports.length === 0) return <ReportListEmpty />;

  return (
    <ul className="space-y-2">
      {reports.map((report) => (
        <li key={report.id}>
          <Link href={`/reports/${report.id}`}>
            <ReportListItem report={report} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
```

Presenter では以下を行いません。

- `useState` / `useEffect` などの状態・副作用（ロジックは専用 Hook へ）
- `useQuery` / `useMutation` / `useRouter` の利用
- API 通信・業務ロジック（絞り込み・並び替え・権限判定など）

#### 悪い例 ❌

```tsx
// ❌ Presenter で状態と絞り込みロジックを持っている
export function ReportListPresenter({ reports }: Props) {
  const [month, setMonth] = useState("2026-11");
  const filtered = reports.filter((r) => r.reportDate.startsWith(month));
  ...
}
```

### index.ts と公開名

`index.ts` では Container だけを、役割が分かる名前で公開します。Presenter・専用 Hook は公開しません。

```ts
// features/reports/components/client/ReportList/index.ts
export { ReportListContainer as ReportList } from "./ReportListContainer";
```

```ts
// features/reports/components/client/ReportForm/index.ts
export { ReportFormContainer as ReportForm } from "./ReportFormContainer";
```

## Presenter の使用ルール

**Presenter は同じディレクトリの Container からのみ呼び出します。** 他のディレクトリの Presenter を直接 import することは禁止です。

他のコンポーネントの表示を再利用したい場合は、`index.ts` で公開されている **Container を呼び出します**。

### 良い例 ✅：作成・編集で共通フォームを使う

```
ReportCreateContainer ─▶ ReportCreatePresenter ─▶ ReportForm（= ReportFormContainer）─▶ ReportFormPresenter
ReportEditContainer   ─▶ ReportEditPresenter   ─▶ ReportForm（= ReportFormContainer）─▶ ReportFormPresenter
```

```tsx
// features/reports/components/client/ReportCreate/ReportCreatePresenter.tsx
import type { ReportRequest } from "@/external/dto/report.dto";
import { ReportForm } from "../ReportForm"; // ✅ index.ts 経由で Container を呼ぶ

type Props = {
  defaultValues: ReportRequest;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: ReportRequest) => void;
};

export function ReportCreatePresenter(props: Props) {
  return (
    <section>
      <h1>日報作成</h1>
      <ReportForm submitLabel="保存する" {...props} />
    </section>
  );
}
```

### 悪い例 ❌

```tsx
import { ReportFormPresenter } from "../ReportForm/ReportFormPresenter"; // ❌ 別ディレクトリの Presenter
```

## コンポーネント分割のルール

### 1 ファイル 1 コンポーネント

すべての Client Component は 1 ファイルにつき 1 コンポーネントのみ定義します。

### View 専用の子コンポーネント（ロジックなし）

**同じディレクトリ内に配置** します（例：`ReportListItem.tsx`, `ReportListSkeleton.tsx`）。

```tsx
// features/reports/components/client/ReportList/ReportListItem.tsx
import type { ReportResponse } from "@/external/dto/report.dto";

type Props = { report: ReportResponse };

export function ReportListItem({ report }: Props) {
  return (
    <div>
      <time dateTime={report.reportDate}>{report.reportDate}</time>
      <h3>{report.title}</h3>
    </div>
  );
}
```

### ロジックを含むコンポーネント

**`components/client/` 配下に新しいディレクトリを作成** し、Container / Presenter / 専用 Hook に分けます（例：`ReportForm/`）。

### Hook の置き場所

| Hook | 置き場所 | 例 |
| --- | --- | --- |
| 1 つのコンポーネントでしか使わない | そのコンポーネントのディレクトリ | `ReportList/useReportList.ts` |
| Feature 内の複数コンポーネントで使う | `features/{feature}/hooks/` | `useReportListQuery`, `useDeleteReportMutation` |
| 複数の Feature で使う | `shared/hooks/` | — |

## 命名規則

| 種類 | 命名 | 例 |
| --- | --- | --- |
| Server Component（ページ単位） | `XxxPageTemplate` | `ReportDetailPageTemplate` |
| Container | `XxxContainer` | `ReportEditContainer` |
| Presenter | `XxxPresenter` | `ReportEditPresenter` |
| 専用 Hook | `useXxx`（ディレクトリ名と対応） | `useReportEdit` |
| データ取得 Hook | `useXxxQuery` / `useXxxMutation` | `useReportListQuery`, `useCreateReportMutation` |
| index.ts の公開名 | 役割が分かる名前（`Container` を外す） | `ReportList`, `ReportForm` |
| クエリキー | `xxxKeys` | `reportKeys` |

- ファイル名とコンポーネント名を一致させる（PascalCase）。
- `external/` の命名規則は [05_external_layer.md](./05_external_layer.md#命名規則) を参照。
- shadcn/ui が生成するファイル（`button.tsx` など）は生成時の命名に従う。

## ベストプラクティス

1. **ページ群専用のものは features にまとめる**: 2 つ以上の Feature で必要になるまで `shared/` へ移動しない
2. **1 コンポーネント 1 ディレクトリ**: Container・Presenter・専用 Hook を同じ場所に置く
3. **Container は DOM を描画しない**: Presenter に Props を渡すだけ
4. **Presenter はロジックを持たない**: 状態・副作用は専用 Hook に集約する
5. **Presenter の独立性**: Presenter は同じディレクトリの Container からのみ呼ばれる。再利用は Container 経由
6. **external の入口は handler だけ**: PageTemplate から service / repository を直接呼ばない
7. **型は `external/dto` で一元管理**: features 側で API の型を再定義しない
