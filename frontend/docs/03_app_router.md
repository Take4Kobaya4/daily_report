# App Router 設計ガイド

## 基本方針

- `app/` はルーティングの責務に限定する。
- `page.tsx` / `layout.tsx` は Server Component とする。
- 業務ロジック・DB アクセス・複雑な UI は `features/` に委譲する。
- ルートグループで認証状態を表現する。
- Next.js のグローバル型（`PageProps` / `LayoutProps` / `RouteContext`）を使用する。

## ルートグループ

```
app/
├─ (guest)/           # 未ログインユーザー向け
│  ├─ login/
│  └─ register/
├─ (authenticated)/   # ログイン必須
│  └─ reports/
│     ├─ page.tsx       # 一覧
│     ├─ new/           # 作成
│     └─ [id]/
│        ├─ page.tsx    # 詳細
│        └─ edit/       # 編集
└─ api/
   ├─ auth/[...all]/    # Better Auth
   └─ reports/
      ├─ route.ts       # GET（一覧）/ POST（作成）
      └─ [id]/route.ts  # GET（詳細）/ PATCH（編集）/ DELETE（削除）
```

### グループ別設定

| グループ | 認証 | 未認証時 | 認証済み時 | 共通 UI |
| --- | --- | --- | --- | --- |
| `(guest)` | 不要 | 表示 | `/reports` へリダイレクト | シンプルなレイアウト |
| `(authenticated)` | 必須 | `/login` へリダイレクト | 表示 | ヘッダー（ログアウト導線） |

認証の詳細は [08_authentication.md](./08_authentication.md) を参照してください。

## ルーティング一覧

| パス | 画面 | ユースケース | 呼び出す PageTemplate |
| --- | --- | --- | --- |
| `/register` | ユーザー登録 | UC-01 | `RegisterPageTemplate` |
| `/login` | ログイン | UC-02 | `LoginPageTemplate` |
| `/reports` | 日報一覧 | UC-05 | `ReportListPageTemplate` |
| `/reports/new` | 日報作成 | UC-04 | `ReportNewPageTemplate` |
| `/reports/[id]` | 日報詳細・削除 | UC-06 / UC-08 | `ReportDetailPageTemplate` |
| `/reports/[id]/edit` | 日報編集 | UC-07 | `ReportEditPageTemplate` |

ユースケースの詳細は [../../docs/use-cases.md](../../docs/use-cases.md) を参照してください。

## ページコンポーネントパターン

`page.tsx` はパラメータを受け取り、Feature の PageTemplate に渡すだけにします。

```tsx
// app/(authenticated)/reports/[id]/page.tsx
import { ReportDetailPageTemplate } from "@/features/reports/components/server/ReportDetailPageTemplate";

export default async function Page(props: PageProps<"/reports/[id]">) {
  const { id } = await props.params;

  return <ReportDetailPageTemplate reportId={id} />;
}
```

`PageProps` / `LayoutProps` はグローバル型のため import 不要です。ルートグループ `(authenticated)` はパスに含めません。

### 悪い例 ❌

```tsx
// ❌ page.tsx で DB アクセスと UI 実装をしている
export default async function Page(props: PageProps<"/reports/[id]">) {
  const { id } = await props.params;
  const report = await prisma.report.findUnique({ where: { id } });

  return (
    <article>
      <h1>{report?.title}</h1>
      ...
    </article>
  );
}
```

## メタデータ

```tsx
// app/(authenticated)/reports/layout.tsx
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "日報一覧 | Daily Report",
};

export default function ReportsLayout(props: LayoutProps<"/reports">) {
  return <>{props.children}</>;
}
```

## Cache Components と Suspense

`cacheComponents: true` のため、Cookie・ヘッダー（セッション取得）や DB アクセスなどの動的データは `<Suspense>` 境界の内側で読み取る必要があります。

- ページ単位では `loading.tsx` が Suspense 境界になる。
- `layout.tsx` でセッションを読み取ると境界の外になりやすいため、認証確認は PageTemplate（ページ側）で行う。

本プロジェクトでは、`(authenticated)` 配下の各ページに `loading.tsx` を置き、PageTemplate 全体を Suspense 境界の内側で実行します。これにより PageTemplate を `async` にして、セッション取得とプリフェッチを直接書けます。

```
app/(authenticated)/reports/
├─ page.tsx      # <ReportListPageTemplate />（async）
└─ loading.tsx   # Suspense の fallback
```

```tsx
// app/(authenticated)/reports/loading.tsx
export default function Loading() {
  return <p>読み込み中...</p>;
}
```

ページ内で一部だけ先に表示したい場合は、PageTemplate 内で `<Suspense>` を追加してください。

## Loading / Error / Not Found

| ファイル | 種別 | 用途 |
| --- | --- | --- |
| `loading.tsx` | Server Component | ページ単位のローディング表示 |
| `error.tsx` | **Client Component** | 想定外のエラー表示と再試行 |
| `not-found.tsx` | Server Component | 日報が存在しない・他ユーザーの日報 |

他ユーザーの日報は存在を秘匿するため、「存在しない日報」と同じく `notFound()` で Not Found を表示します。

```tsx
// app/(authenticated)/reports/[id]/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div>
      <h2>日報が見つかりません</h2>
      <Link href="/reports">日報一覧へ戻る</Link>
    </div>
  );
}
```

```tsx
// app/(authenticated)/error.tsx
"use client";

export default function ErrorPage(props: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div>
      <h2>エラーが発生しました</h2>
      {/* error.message はユーザーに見せる前提で作られていないため表示しない */}
      <button type="button" onClick={props.reset}>
        再試行
      </button>
    </div>
  );
}
```

## Route Handlers

`app/api/` 配下の `route.ts` は認証・JSON の解析・HTTP ステータスへの変換に限定し、処理は `external/handler` に委譲します。実装パターンは [05_external_layer.md](./05_external_layer.md#route-handler-からの呼び出し) を参照してください。
