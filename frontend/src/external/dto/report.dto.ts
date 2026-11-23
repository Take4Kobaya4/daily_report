import { z } from "zod";

/**
 * 日報 API の入出力の契約。
 *
 * - Route Handler（handler）の検証とフォームのバリデーションで同じスキーマを使う。
 * - Client Component から import するため `server-only` を付けない。
 * - `userId` はリクエスト・レスポンスのどちらにも含めない（セッションから取得する）。
 */

export const REPORT_TITLE_MAX_LENGTH = 200;
export const REPORT_CONTENT_MAX_LENGTH = 20000;

/** POST /api/reports, PATCH /api/reports/:id のリクエスト */
export const ReportRequestSchema = z.object({
  /** 時刻を含まない日付（YYYY-MM-DD。`<input type="date">` の値と一致） */
  reportDate: z.iso.date("日付を入力してください"),
  title: z
    .string()
    .trim()
    .min(1, "タイトルは必須です")
    .max(
      REPORT_TITLE_MAX_LENGTH,
      `タイトルは${REPORT_TITLE_MAX_LENGTH}文字以内で入力してください`,
    ),
  /** Markdown 本文（空白・改行も内容の一部として扱うため trim しない） */
  content: z
    .string()
    .min(1, "本文は必須です")
    .max(
      REPORT_CONTENT_MAX_LENGTH,
      `本文は${REPORT_CONTENT_MAX_LENGTH}文字以内で入力してください`,
    ),
});

/** GET / POST / PATCH のレスポンス */
export const ReportResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  reportDate: z.iso.date(), // 暫定: シリアライズ形式は api-design.md の未決定事項
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
