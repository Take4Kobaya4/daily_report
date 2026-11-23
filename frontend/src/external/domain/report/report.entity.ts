/**
 * 日報（アプリ内部で扱うモデル）
 *
 * DB のテーブル定義（Prisma のモデル）にも API の JSON にも依存させない。
 * service はこの型を返し、handler の converter で dto に変換する。
 */
export type Report = {
  id: string;
  /** 作成者 ID（Better Auth の user.id） */
  userId: string;
  /** タイトル（必須、最大 200 文字） */
  title: string;
  /** Markdown 本文（必須、最大 20,000 文字） */
  content: string;
  /** 日報日付（時刻を含まない日付。UTC の 00:00:00 として保持する） */
  reportDate: Date;
  createdAt: Date;
  updatedAt: Date;
};
