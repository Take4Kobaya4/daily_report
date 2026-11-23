# 開発ガイド

## 新規画面追加フロー

### 1. 仕様確認

- 対象のユースケースを確認する（[../../docs/use-cases.md](../../docs/use-cases.md)）
- MVP の対象外機能でないことを確認する（[../../docs/requirements.md](../../docs/requirements.md#対象外mvpでは実装しない)）
- API・DB の変更が必要か確認する

### 2. ルート設計

適切なルートグループを選択します（[03_app_router.md](./03_app_router.md#ルートグループ)）。

- `(guest)` - 未ログインユーザー向け
- `(authenticated)` - ログイン必須

### 3. 実装順序

日報作成（UC-04）を例にした推奨順序です。

| # | 実装対象 | 配置 |
| --- | --- | --- |
| 1 | dto（Zod スキーマ・型）・domain | `external/dto/`, `external/domain/` |
| 2 | repository | `external/repository/` |
| 3 | service | `external/service/report/` |
| 4 | handler（Command / Query / converter） | `external/handler/report/` |
| 5 | Route Handler | `app/api/reports/route.ts` |
| 6 | Client API・クエリキー・データ取得 Hook | `features/reports/api/`, `queries/`, `hooks/` |
| 7 | Presenter（+ Story） | `features/reports/components/client/ReportCreate/` |
| 8 | 専用 Hook・Container・index.ts | 同上 |
| 9 | PageTemplate | `features/reports/components/server/ReportNewPageTemplate/` |
| 10 | page.tsx / loading.tsx | `app/(authenticated)/reports/new/` |

### 4. 実装チェックリスト

- [ ] `page.tsx` は Feature を呼ぶだけになっている
- [ ] Route Handler で認証確認をし、処理は `external/handler` に委譲している
- [ ] handler で dto の Zod スキーマによる検証をしている
- [ ] repository のクエリに `userId` 条件がある
- [ ] service が domain を返し、handler の converter で dto に変換している
- [ ] features / app から service・repository を直接 import していない
- [ ] ローディング・空状態・エラー状態を表示している
- [ ] 保存中の二重送信を防いでいる
- [ ] 関連ドキュメントを更新した

## コーディング規約

基本ルールは [../AGENTS.md](../AGENTS.md#3-typescript--coding-rules) に従います。

### ファイル命名規則

```
- コンポーネント        : PascalCase.tsx       （ReportForm.tsx）
- Hook                  : useCamelCase.ts      （useReportList.ts, useReportQuery.ts）
- Container / Presenter : XxxContainer.tsx / XxxPresenter.tsx（ディレクトリ名 = Xxx）
- 公開窓口              : index.ts
- external 配下        : 対象.役割.ts         （report.service.ts, report.repository.ts, report.dto.ts）
- external/handler     : 対象.query|command.server.ts（report.query.server.ts）
- Story                 : PascalCase.stories.tsx
- テスト                : 対象ファイル名.test.ts(x)
- shadcn/ui 生成物      : 生成時の命名に従う   （button.tsx）
```

### インポート

- インポートの並び順は Biome（`organizeImports`）に任せる。
- Feature 外のモジュールは `@/` の絶対パスで、Feature 内は相対パスで参照する。
- 型のみの import には `import type` を使う。

### コンポーネント

```tsx
// 1. Props の型定義（type で明示する）
type Props = {
  report: ReportResponse;
  onDelete: (id: string) => void;
};

// 2. 名前付きエクスポートの関数コンポーネント（page.tsx などの規約ファイルを除く）
export function ReportDetail({ report, onDelete }: Props) {
  // 3. Hooks
  // 4. ハンドラ（React Compiler が有効なため useCallback は不要）
  // 5. 描画
  return <article>...</article>;
}
```

### 型定義

```ts
// ❌ 避ける
const data: any = await res.json();
const report = data as Report;

// ✅ 推奨
const data: unknown = await res.json();
const parsed = ReportRequestSchema.safeParse(data);
```

- `any` を使用しない。外部からの値は `unknown` で受けて Zod で絞り込む。
- 型はできるだけ Zod スキーマから `z.infer` で導出し、二重定義しない。
- マジックナンバー（文字数上限など）は定数化してスキーマと UI で共有する。

## テスト戦略

方針の正は [../AGENTS.md](../AGENTS.md#4-testing-policy) です。

| 種類 | 対象 | ツール | 配置 |
| --- | --- | --- | --- |
| Unit | dto の Zod スキーマ、converter、純粋関数 | Vitest | 対象ファイルと同じディレクトリ |
| Component | フォーム、一覧、空状態、エラー表示 | Vitest + React Testing Library（+ MSW） | 同上 |
| Story | Presenter の表示パターン | Storybook + `@storybook/addon-vitest` | 同上 |
| API Integration | handler → service → repository（認可・永続化） | Vitest + テスト用 DB | 同上 |
| E2E | 登録〜日報 CRUD の主要フロー | Playwright | `e2e/`（未作成） |

### Unit テスト例

```ts
// external/dto/report.dto.test.ts
import { describe, expect, it } from "vitest";
import { REPORT_TITLE_MAX_LENGTH, ReportRequestSchema } from "./report.dto";

const valid = { reportDate: "2026-11-23", title: "タイトル", content: "本文" };

describe("ReportRequestSchema", () => {
  it("タイトルが空の場合はエラー", () => {
    expect(ReportRequestSchema.safeParse({ ...valid, title: "" }).success).toBe(false);
  });

  it("タイトルは上限文字数まで許可する", () => {
    const title = "a".repeat(REPORT_TITLE_MAX_LENGTH);
    expect(ReportRequestSchema.safeParse({ ...valid, title }).success).toBe(true);
  });
});
```

### Component テスト例

```tsx
// features/reports/components/client/ReportForm/ReportForm.test.tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ReportForm } from "."; // index.ts 経由で Container ごとテストする

describe("ReportForm", () => {
  it("タイトル未入力で送信するとエラーを表示し、onSubmit を呼ばない", async () => {
    const onSubmit = vi.fn();
    render(
      <ReportForm
        defaultValues={{ reportDate: "2026-11-23", title: "", content: "本文" }}
        submitLabel="保存する"
        isSubmitting={false}
        onSubmit={onSubmit}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "保存する" }));

    expect(await screen.findByText("タイトルは必須です")).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
```

`@testing-library/user-event`・`@testing-library/jest-dom`・MSW は未導入です。

### Storybook

Presenter には Story を用意し、ローディング・空状態・エラー状態を確認できるようにします。

```ts
// features/reports/components/client/ReportList/ReportListPresenter.stories.tsx
import type { Meta, StoryObj } from "@storybook/nextjs-vite";
import { ReportListPresenter } from "./ReportListPresenter";

const meta = { component: ReportListPresenter } satisfies Meta<typeof ReportListPresenter>;
export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    isLoading: false,
    isError: false,
    reports: [
      {
        id: "1",
        title: "11/23 の作業",
        content: "- 設計",
        reportDate: "2026-11-23",
        createdAt: "2026-11-23T09:00:00.000Z",
        updatedAt: "2026-11-23T09:00:00.000Z",
      },
    ],
  },
};
```

`src/shared/stories/` 配下は Storybook 初期化時のサンプルです。不要になった時点で削除してください。

## 品質チェック

AGENTS.md の CI 要件は以下です。

```bash
pnpm biome ci .
pnpm typecheck
pnpm test
pnpm build
```

現状の `package.json` には `typecheck` / `test` スクリプトがなく、`vitest.config.ts` も Storybook 用プロジェクトのみです。CI 整備時に以下を追加してください。

- `"typecheck": "tsc --noEmit"`
- `"test": "vitest run"`
- Vitest に jsdom 環境の Unit / Component テスト用プロジェクト

チェックを実行していない場合は、実行していないことを明示して報告してください。

## デバッグ

### TanStack Query

キャッシュの状態を確認したい場合は `@tanstack/react-query-devtools` の導入を検討してください（未導入）。

### Server Components / Route Handlers

- `console.log` の出力はブラウザではなく `pnpm dev` のターミナルに表示される。
- 日報本文・セッション・パスワードをログに出力しない。デバッグ用のログはコミット前に削除する。

### Cache Components

ビルド時に「Uncached data was accessed outside of `<Suspense>`」系のエラーが出た場合は、セッション取得や DB アクセスが `<Suspense>` の外で行われていないか確認してください（[03_app_router.md](./03_app_router.md#cache-components-と-suspense)）。
