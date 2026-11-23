import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  type RegisterInput,
  RegisterSchema,
} from "@/features/auth/schemas/authSchema";
import { authClient } from "@/shared/lib/auth/authClient";

const USERNAME_TAKEN_MESSAGE = "このログインIDは既に使用されています";
const EMAIL_TAKEN_MESSAGE = "このメールアドレスは既に登録されています";
const INVALID_INPUT_MESSAGE = "入力内容を確認してください";
const UNEXPECTED_ERROR_MESSAGE =
  "登録に失敗しました。時間をおいて再度お試しください";

// Better Auth のエラーコード（username プラグイン / emailAndPassword）
const USERNAME_TAKEN_CODES = new Set(["USERNAME_IS_ALREADY_TAKEN"]);
const EMAIL_TAKEN_CODES = new Set([
  "USER_ALREADY_EXISTS",
  "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL",
]);

export function useRegisterForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  // cacheComponents では遷移元の画面が破棄されず state が保持される（React の Activity）。
  // 戻ったときに送信中のままにならず、パスワードも残さないよう、画面を離れるときに初期化する
  const { reset, setError } = form;
  useEffect(
    () => () => {
      setIsRedirecting(false);
      reset();
    },
    [reset],
  );

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(undefined);

    const { error } = await authClient.signUp
      .email({
        ...values,
        // name（表示名）は必須のため、入力項目を増やさずログインIDを設定する
        name: values.username,
      })
      .catch(() => ({ error: { status: 0, code: undefined } }));

    if (error) {
      if (error.code && USERNAME_TAKEN_CODES.has(error.code)) {
        setError("username", { message: USERNAME_TAKEN_MESSAGE });
      } else if (error.code && EMAIL_TAKEN_CODES.has(error.code)) {
        setError("email", { message: EMAIL_TAKEN_MESSAGE });
      } else if (error.status >= 400 && error.status < 500) {
        setErrorMessage(INVALID_INPUT_MESSAGE);
      } else {
        setErrorMessage(UNEXPECTED_ERROR_MESSAGE);
      }
      return;
    }

    // 登録と同時にログイン状態になる（Better Auth の autoSignIn 既定値）
    setIsRedirecting(true);
    router.replace("/reports");
    router.refresh();
  });

  return {
    register: form.register,
    errors: form.formState.errors,
    // 送信中〜画面遷移までボタンを無効化し、二重送信を防ぐ
    isSubmitting: form.formState.isSubmitting || isRedirecting,
    errorMessage,
    handleSubmit,
  };
}
