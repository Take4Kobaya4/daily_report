# フォーム・バリデーション

## 基本方針

- フォーム状態は React Hook Form で管理する。
- バリデーションは Zod で行い、**`external/dto` の同じスキーマをフォームとサーバー（handler）の両方で使用する**。
- クライアント側の検証は UX のため、サーバー側の検証は安全性のため。サーバー側の検証は省略しない。
- 日報の作成・編集は共通の `ReportForm`（`features/reports/components/client/ReportForm/`）を使用する。

## Zod スキーマ

フォームは `external/dto/report.dto.ts` の `ReportRequestSchema` をそのまま使用します。Route Handler 経由で handler が検証するスキーマと同一のため、クライアントとサーバーで検証ルールがずれません。

スキーマの定義は [05_external_layer.md](./05_external_layer.md#dto) を参照してください。業務ルール（[../../docs/requirements.md](../../docs/requirements.md#3-業務ルール)）は以下のように反映しています。

| 項目 | ルール |
| --- | --- |
| `reportDate` | 必須。時刻を含まない `YYYY-MM-DD`（`<input type="date">` の値と一致） |
| `title` | 必須（前後の空白を除いて 1 文字以上）、最大 200 文字 |
| `content` | 必須、最大 20,000 文字 |

- `userId` はスキーマに含めない（セッションから取得する）。
- 文字数の上限は `REPORT_TITLE_MAX_LENGTH` などの定数を UI（残り文字数表示など）でも共有する。
- PATCH で部分更新を許可するかは未決定です。MVP では編集フォームが全項目を送るため、同じスキーマを使用します。

## 共通フォーム（ReportForm）

作成・編集で共通の `ReportForm` は、他のコンポーネントと同じく Container / Presenter / 専用 Hook に分けます（[04_features_structure.md](./04_features_structure.md#client-componentscontainer--presenter)）。

```
features/reports/components/client/ReportForm/
├─ index.ts                  # export { ReportFormContainer as ReportForm }
├─ ReportFormContainer.tsx
├─ ReportFormPresenter.tsx
└─ useReportForm.ts          # useForm・プレビュー切り替え
```

`ReportForm` が担うのは **入力状態とバリデーションだけ** です。API 通信・画面遷移は呼び出し元（`ReportCreate` / `ReportEdit`）が担い、`ReportForm` は `defaultValues` と `onSubmit` を受け取ります。

### 専用 Hook

```ts
// features/reports/components/client/ReportForm/useReportForm.ts
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { type ReportRequest, ReportRequestSchema } from "@/external/dto/report.dto";

type Params = {
  defaultValues: ReportRequest;
  onSubmit: (values: ReportRequest) => void;
};

export function useReportForm({ defaultValues, onSubmit }: Params) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ReportRequest>({
    resolver: zodResolver(ReportRequestSchema),
    defaultValues,
  });
  const [isPreview, setIsPreview] = useState(false);

  return {
    register,
    errors,
    content: watch("content"),
    isPreview,
    togglePreview: () => setIsPreview((prev) => !prev),
    handleSubmit: handleSubmit(onSubmit),
  };
}
```

`@hookform/resolvers` は未導入です。導入時は [../AGENTS.md](../AGENTS.md) に従い事前に確認してください。

### Container

```tsx
// features/reports/components/client/ReportForm/ReportFormContainer.tsx
"use client";

import type { ReportRequest } from "@/external/dto/report.dto";
import { ReportFormPresenter } from "./ReportFormPresenter";
import { useReportForm } from "./useReportForm";

type Props = {
  defaultValues: ReportRequest;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
  onSubmit: (values: ReportRequest) => void;
};

export function ReportFormContainer({ defaultValues, onSubmit, ...rest }: Props) {
  const form = useReportForm({ defaultValues, onSubmit });

  return <ReportFormPresenter {...form} {...rest} />;
}
```

### Presenter

```tsx
// features/reports/components/client/ReportForm/ReportFormPresenter.tsx
import type { FieldErrors, UseFormRegister } from "react-hook-form";
import type { ReportRequest } from "@/external/dto/report.dto";
import { Button } from "@/shared/components/ui/button";
import { MarkdownPreview } from "../MarkdownPreview";

type Props = {
  register: UseFormRegister<ReportRequest>;
  errors: FieldErrors<ReportRequest>;
  content: string;
  isPreview: boolean;
  togglePreview: () => void;
  handleSubmit: () => void;
  submitLabel: string;
  isSubmitting: boolean;
  errorMessage?: string;
};

export function ReportFormPresenter(props: Props) {
  const { register, errors } = props;

  return (
    <form onSubmit={props.handleSubmit} noValidate>
      <label htmlFor="reportDate">日付</label>
      <input id="reportDate" type="date" {...register("reportDate")} aria-invalid={!!errors.reportDate} />
      {errors.reportDate && <p role="alert">{errors.reportDate.message}</p>}

      <label htmlFor="title">タイトル</label>
      <input id="title" {...register("title")} aria-invalid={!!errors.title} />
      {errors.title && <p role="alert">{errors.title.message}</p>}

      <label htmlFor="content">本文（Markdown）</label>
      <Button type="button" variant="outline" onClick={props.togglePreview}>
        {props.isPreview ? "編集に戻る" : "プレビュー"}
      </Button>
      {props.isPreview ? (
        <MarkdownPreview content={props.content} />
      ) : (
        <textarea id="content" {...register("content")} aria-invalid={!!errors.content} />
      )}
      {errors.content && <p role="alert">{errors.content.message}</p>}

      {props.errorMessage && <p role="alert">{props.errorMessage}</p>}

      <Button type="submit" disabled={props.isSubmitting}>
        {props.submitLabel}
      </Button>
    </form>
  );
}
```

プレビュー表示中も本文の値を保持できるよう、`textarea` を非表示にする方式（`hidden`）にするか、`shouldUnregister: false`（既定値）のまま切り替えるかは実装時に確認してください。

## 呼び出し元（ReportCreate）

```ts
// features/reports/components/client/ReportCreate/useReportCreate.ts
import { useRouter } from "next/navigation";
import type { ReportRequest } from "@/external/dto/report.dto";
import { useCreateReportMutation } from "@/features/reports/hooks/useReportMutation";

export function useReportCreate(today: string) {
  const router = useRouter();
  const createMutation = useCreateReportMutation();

  return {
    defaultValues: { reportDate: today, title: "", content: "" },
    isSubmitting: createMutation.isPending,
    errorMessage: createMutation.isError ? "保存に失敗しました。時間をおいて再度お試しください。" : undefined,
    onSubmit: (values: ReportRequest) =>
      createMutation.mutate(values, {
        onSuccess: (report) => router.push(`/reports/${report.id}`),
      }),
  };
}
```

```tsx
// features/reports/components/client/ReportCreate/ReportCreateContainer.tsx
"use client";

import { ReportCreatePresenter } from "./ReportCreatePresenter";
import { useReportCreate } from "./useReportCreate";

type Props = {
  today: string; // YYYY-MM-DD。タイムゾーン差異を避けるため PageTemplate（サーバー）から渡す
};

export function ReportCreateContainer({ today }: Props) {
  const createProps = useReportCreate(today);

  return <ReportCreatePresenter {...createProps} />;
}
```

`ReportCreatePresenter` は見出しと `ReportForm`（index.ts 経由の Container）を描画します（[04_features_structure.md](./04_features_structure.md#良い例-作成編集で共通フォームを使う)）。

`ReportEdit` は `useReportDetailQuery(id)` の結果を `defaultValues` に渡し、`useUpdateReportMutation(id)` を使う点だけが異なります。

## チェックリスト

| 項目 | 実装方法 |
| --- | --- |
| 入力エラー表示 | `formState.errors` を入力欄の直下に表示し、`aria-invalid` を付与する |
| 二重送信防止 | `isPending` の間は送信ボタンを `disabled` にする |
| サーバーエラー時の入力保持 | エラー時に `reset` しない、画面遷移しない |
| サーバー側検証 | `external/handler` の Command で同じスキーマを `safeParse` する |
| 422 の表示 | 汎用メッセージを表示する（フィールド単位の表示はエラー形式決定後） |

## Markdown 入力・プレビュー

本文は Markdown のプレーンテキストとして保存し、表示時にレンダリングします。

- 入力は `<textarea>` とし、プレビューはタブまたは横並びで切り替える。
- プレビューと詳細画面は同じ `MarkdownPreview`（`components/client/MarkdownPreview/`）でレンダリングする。
- **XSS 対策**: 生 HTML を描画しない。`dangerouslySetInnerHTML` を使用しない。
- リンクは `javascript:` などの危険なスキームを無効化する。

Markdown レンダリングライブラリは未選定です。生 HTML を既定で無効化できるもの（例: `react-markdown` を `rehype-raw` なしで使用）を候補とし、導入前に確認してください。
