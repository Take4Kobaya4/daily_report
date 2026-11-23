import { z } from "zod";

// 入力ルールは docs/requirements.md（認証）を正とする。最終的な検証は Better Auth（サーバー側）が行う
export const USERNAME_MIN_LENGTH = 3;
export const USERNAME_MAX_LENGTH = 30;
export const PASSWORD_MIN_LENGTH = 8;
export const PASSWORD_MAX_LENGTH = 128;

/**
 * ログインフォーム。
 * 形式チェックは最小限にし、失敗理由を区別せずに表示する。
 */
export const LoginSchema = z.object({
  username: z.string().min(1, "ログインIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const RegisterSchema = z.object({
  username: z
    .string()
    .min(
      USERNAME_MIN_LENGTH,
      `ログインIDは${USERNAME_MIN_LENGTH}文字以上で入力してください`,
    )
    .max(
      USERNAME_MAX_LENGTH,
      `ログインIDは${USERNAME_MAX_LENGTH}文字以内で入力してください`,
    )
    .regex(
      /^[a-zA-Z0-9_.]+$/,
      "ログインIDは半角英数字・_・. で入力してください",
    ),
  email: z.email("メールアドレスの形式が正しくありません"),
  password: z
    .string()
    .min(
      PASSWORD_MIN_LENGTH,
      `パスワードは${PASSWORD_MIN_LENGTH}文字以上で入力してください`,
    )
    .max(
      PASSWORD_MAX_LENGTH,
      `パスワードは${PASSWORD_MAX_LENGTH}文字以内で入力してください`,
    ),
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
