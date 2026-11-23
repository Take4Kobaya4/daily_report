# 技術スタック

バージョンの正は `package.json` および各設定ファイルとします。本ドキュメントは用途と導入状況の把握のために使用してください。

## コア技術

| カテゴリ | 技術 | バージョン / 備考 |
| --- | --- | --- |
| Framework | Next.js | 16（App Router） |
| 言語 | TypeScript | 5.x（strict mode） |
| UI | React | 19 |
| コンパイラ | React Compiler | `reactCompiler: true` |
| パッケージ管理 | pnpm | `packageManager` フィールドを参照 |

`next.config.ts` では以下を有効にしています。

| 設定 | 影響 |
| --- | --- |
| `cacheComponents: true` | 動的データ（Cookie・ヘッダー・DB）へのアクセスは `<Suspense>` 内で行う必要がある（[03_app_router.md](./03_app_router.md#cache-components-と-suspense)） |
| `reactCompiler: true` | `useMemo` / `useCallback` による手動メモ化は原則不要 |
| `turbopack.rules` | Tailwind CSS を Turbopack で処理 |

## 主要ライブラリ

| 用途 | ライブラリ | 導入状況 | 備考 |
| --- | --- | --- | --- |
| スタイリング | Tailwind CSS v4 | 導入済み | |
| UI コンポーネント | shadcn/ui（Base UI） | 導入済み | `components.json` の style は `base-nova` |
| アイコン | lucide-react | 導入済み | |
| サーバー状態管理 | TanStack Query v5 | 導入済み | |
| フォーム | React Hook Form | 導入済み | |
| バリデーション | Zod v4 | 導入済み | |
| フォーム × Zod 連携 | @hookform/resolvers | **未導入** | 導入時は事前に確認する |
| 認証 | Better Auth | **未導入** | |
| ORM | Prisma 7 | 導入済み | ドライバーアダプター `@prisma/adapter-pg` を使用。クライアントは `src/external/client/database/generated` に生成（git 管理外） |
| DB | PostgreSQL 17 | 導入済み | リポジトリ直下の `compose.yaml` で起動（ホスト側ポート 5433） |
| Markdown 表示 | 未定 | **未導入** | XSS 対策込みで選定する（[07_form_validation.md](./07_form_validation.md#markdown-入力プレビュー)） |
| Lint / Format | Biome | 導入済み | ESLint / Prettier は追加しない |

## テスト・開発ツール

| 用途 | ツール | 導入状況 |
| --- | --- | --- |
| Unit / Component テスト | Vitest + React Testing Library | 導入済み（Storybook 用プロジェクトのみ設定済み） |
| API モック | MSW | **未導入** |
| E2E テスト | Playwright | 導入済み（Vitest Browser Mode 用） |
| コンポーネントカタログ | Storybook 10 | 導入済み |
| CI | GitHub Actions | **未設定** |

ライブラリの追加・変更・削除は、必要性を説明したうえで行ってください（[../AGENTS.md](../AGENTS.md)）。

## 開発環境要件

- Node.js（Next.js 16 の要件を満たすバージョン）
- pnpm（`package.json` の `packageManager` に合わせる）
- Docker Desktop（開発用 PostgreSQL）

初回は `.env.example` を `.env` にコピーし、`pnpm db:up` → `pnpm db:migrate` の順に実行します。

## 主要コマンド

```bash
pnpm dev              # 開発サーバー起動
pnpm build            # 本番ビルド
pnpm lint             # Biome チェック
pnpm format           # Biome フォーマット
pnpm storybook        # Storybook 起動（:6006）
pnpm db:up            # 開発用 PostgreSQL コンテナ起動（:5433）
pnpm db:down          # 開発用 PostgreSQL コンテナ停止
pnpm db:migrate       # マイグレーション作成・適用（prisma migrate dev）
pnpm db:generate      # Prisma Client 生成
```

`pnpm typecheck` / `pnpm test` は AGENTS.md の CI 要件に含まれていますが、`package.json` に未定義です（[09_development_guide.md](./09_development_guide.md#品質チェック)）。
