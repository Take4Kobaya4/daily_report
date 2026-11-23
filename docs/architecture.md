# アーキテクチャ

## 1. Technology Stack

### Frontend

- Next.js（App Router）
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- TanStack Query
- React Hook Form
- Zod

### Backend

- Next.js Route Handlers
- PostgreSQL
- Prisma
- Better Auth

### Development Tools

- pnpm
- Biome
- Docker Compose
- GitHub Actions

### Testing

- Vitest
- React Testing Library
- MSW
- Playwright

導入済みライブラリのバージョンと設定は、`package.json`および各設定ファイルを正とする。

ライブラリの追加・変更・削除は、必要性を説明したうえで行うこと。

ESLint・Prettierは原則として追加せず、Biomeを使用する。

---

## 2. Architecture Principles

1. Feature-Based Architecture
2. Server Component / Client Componentの責務分離
3. Container / Presenterパターン（1コンポーネント1ディレクトリ）
4. 外部接続（DB・外部API）を`external/`に分離
5. 将来的なGoへのAPI移行を考慮した設計（接続先の切り替えは`external/service`のみ）

### General Rules

- 可読性と保守性を最優先する。
- 既存のディレクトリ構成と命名規則を尊重する。
- 単一責任の原則を意識する。
- 不必要な抽象化を導入しない。
- 重複する業務ロジックは適切に共通化する。
- UIコンポーネントからDBへ直接アクセスしない。
- クライアント側の入力値を信用しない。
- サーバー側で認証・認可・入力値検証を行う。
- 将来的な拡張のためだけに複雑な仕組みを導入しない。

---

## 3. Directory Structure

以下の構成を基本とする。

```text
src/
├── app/
│   ├── (guest)/
│   │   ├── login/
│   │   └── register/
│   ├── (authenticated)/
│   │   └── reports/
│   │       ├── page.tsx
│   │       ├── new/
│   │       └── [id]/
│   │           ├── page.tsx
│   │           └── edit/
│   └── api/
│       ├── auth/
│       └── reports/
│
├── features/
│   ├── auth/
│   │   ├── components/
│   │   │   ├── server/
│   │   │   └── client/
│   │   ├── schemas/
│   │   └── servers/
│   └── reports/
│       ├── components/
│       │   ├── server/            # XxxPageTemplate/
│       │   └── client/            # Xxx/（Container・Presenter・専用Hook）
│       ├── hooks/
│       ├── queries/
│       └── api/
│
├── shared/
│   ├── components/
│   │   └── ui/
│   ├── lib/
│   │   └── auth/
│   ├── hooks/
│   └── providers/
│
├── external/
│   ├── client/
│   │   └── database/
│   ├── domain/
│   ├── dto/
│   ├── handler/
│   ├── repository/
│   └── service/
```

- `features/`：その機能のページ群でしか使わないものをひとまとめにする。
- `shared/`：複数のFeatureで使うものを配置する。最初は`features/`に置き、2つ以上のFeatureで必要になった時点で移動する。

ディレクトリは必要になった段階で追加すること。

空のディレクトリを大量に生成しないこと。

---

## 4. App Router Rules

`app/`ディレクトリは、ルーティングの責務に限定する。

### Responsibilities

- URLパラメータの受け取り
- クエリパラメータの受け取り
- 対応するFeatureコンポーネントの呼び出し
- Next.js固有のルーティング設定
- Metadata
- Layout
- Loading / Error / Not Found

### Prohibited

- `page.tsx`への業務ロジックの実装
- `page.tsx`へのDBアクセス処理の実装
- `page.tsx`への複雑なUI実装
- `page.tsx`での不要な状態管理

### Example

```tsx
import { ReportDetailPageTemplate } from
  "@/features/reports/components/server/ReportDetailPageTemplate";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function Page({ params }: Props) {
  const { id } = await params;

  return <ReportDetailPageTemplate reportId={id} />;
}
```

Route HandlersもHTTPリクエスト・レスポンスの責務に限定し、処理は`external/handler`へ委譲する（[api-design.md](./api-design.md)）。

---

## 5. Server / Client Component Rules

`features/`配下では、ServerとClientをディレクトリで区別する。

### Server

配置先：`features/{feature}/components/server/`（PageTemplate）、`features/{feature}/servers/`（サーバー専用の関数）

責務：

- ページ単位のServer Components（`XxxPageTemplate`）
- 認証確認
- `external/handler`によるサーバー側データ取得

業務ロジック・DBアクセスは`features/`ではなく`external/`に実装する（後述の「External Layer」）。

サーバー専用モジュールでは、必要に応じて`server-only`を使用する。

### Client

配置先：`features/{feature}/components/client/`（1コンポーネント1ディレクトリ）

責務：

- ユーザー操作
- React Hooks
- フォーム状態管理
- TanStack Query
- Client Components

`"use client"`はClient Componentのエントリーポイントに記載する。

ディレクトリ名だけでServer / Clientの境界が保証されるわけではないため、依存関係にも注意する。

### Shared

配置先：`shared/`

責務：

- 複数のFeatureで利用するUI・Hook・設定（shadcn/ui、QueryClient、Provider、Better Auth設定など）

APIの入出力の型・Zodスキーマは`external/dto`に定義する。

DB接続を`shared/`へ配置しない（`external/client`に置く）。

### External Layer

配置先：`external/`

DB・外部APIとの境界をまとめる。

| ディレクトリ | 責務 |
|---|---|
| `client/` | DB接続・HTTPクライアント |
| `domain/` | entity |
| `dto/` | リクエスト・レスポンスのZodスキーマと型 |
| `handler/` | 入口。入力検証、service呼び出し、レスポンスへの変換 |
| `service/` | 業務ロジック。接続先（repository / API）の選択 |
| `repository/` | PrismaによるDBアクセス |

- 入口は`handler`のみとし、features / appからservice・repositoryを直接呼ばない。
- serviceはdomainのentityを返す。
- DBアクセスはrepositoryに集約する。

詳細は[frontend/docs/05_external_layer.md](../frontend/docs/05_external_layer.md)を参照。

---

## 6. Container / Presenter Pattern

Client Componentでは原則としてContainer / Presenterパターンを採用し、1つのコンポーネントにつき1ディレクトリにまとめる。

```text
features/reports/components/client/ReportList/
├── index.ts                  # Containerのみを公開
├── ReportListContainer.tsx
├── ReportListPresenter.tsx
└── useReportList.ts          # このコンポーネント専用のHook
```

ロジックを持たない小さなコンポーネントは、無理に分割しない。

### Container

責務：

- 専用Hookの呼び出し
- Presenterへのデータ受け渡し

ContainerはDOMを直接描画しない。

### 専用Hook

責務：

- TanStack Queryの利用
- React Hook Formによるフォーム制御
- イベントハンドラ
- UIに渡すデータの整形
- 画面遷移

### Presenter

責務：

- Propsを受け取ってUIを描画
- ユーザー操作をコールバックで通知
- 入力欄やバリデーションメッセージの表示

原則として以下は行わない。

- 状態・副作用
- API通信
- DBアクセス
- 業務ロジックの実装

Presenterは同じディレクトリのContainerからのみ呼び出す。

### Component Reuse

日報作成と日報編集では、共通の`ReportForm`を利用する。他コンポーネントからは`index.ts`経由でContainerを呼び出す。

```text
ReportCreatePresenter
        |
        v
    ReportForm（ReportFormContainer）
        ^
        |
ReportEditPresenter
```

詳細は[frontend/docs/04_features_structure.md](../frontend/docs/04_features_structure.md)を参照。

---

## 7. Form / Validation

フォーム管理にはReact Hook Formを使用する。

バリデーションにはZodを使用する。

- フォーム入力はReact Hook Formで管理する。
- Zodスキーマを使用して入力値を検証する。
- API側でも必ずバリデーションを行う。
- エラーメッセージをユーザーに分かりやすく表示する。
- 保存中の二重送信を防止する。
- 作成・編集で可能な限り共通フォームを使用する。

Markdown本文はプレーンテキストとして保存する。

Markdown表示時はXSS対策を行う。

---

## 8. Authentication / Authorization

認証にはBetter Authを使用する。

MVPでは個人ユーザーのみを対象とするため、複雑なRBACは導入しない。

### Authentication Rules

- 認証が必要な画面への未ログインアクセスを制限する。
- 日報APIでは毎回認証確認を行う。
- セッション管理はBetter Authに委譲する。
- パスワードを独自実装で保存しない。

### Authorization Rules

- ユーザーは自分の日報のみ閲覧可能。
- ユーザーは自分の日報のみ編集可能。
- ユーザーは自分の日報のみ削除可能。
- 他ユーザーの日報は存在を秘匿するため404を返す。
- 認可判定は必ずサーバー側で行う。
- UIでボタンを非表示にするだけで認可を実現しない。

---

## 9. Future Go Migration

MVP完成後、必要に応じてGoバックエンドへの移行を検討する。

### Migration Principles

- フロントエンドはNext.js + TypeScriptを継続する。
- API契約を可能な限り維持する。
- HTTP処理と業務ロジックを分離する。
- DBアクセスを`external/repository`に集約する。
- Goへの移行時は、`external/service`の呼び出し先をrepositoryからAPIクライアントへ切り替える。handler・dto・domain・features・appは変更しない。
- Goへの移行を理由にMVPの実装を複雑にしない。
- 認証・セッション連携は移行時に別途設計する。
- Goへの移行はAPI単位で段階的に進める。

MVPではGoを導入しない。
