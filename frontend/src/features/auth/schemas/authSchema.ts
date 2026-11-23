import { z } from "zod";

/**
 * ログインフォーム。
 * 形式チェックは最小限にし、失敗理由を区別せずに表示する（文字数・文字種の最終的な検証は Better Auth が行う）。
 */
export const LoginSchema = z.object({
  username: z.string().min(1, "ログインIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export type LoginInput = z.infer<typeof LoginSchema>;
