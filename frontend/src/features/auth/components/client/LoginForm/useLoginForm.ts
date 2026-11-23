import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import {
  type LoginInput,
  LoginSchema,
} from "@/features/auth/schemas/authSchema";
import { authClient } from "@/shared/lib/auth/authClient";

const INVALID_CREDENTIALS_MESSAGE =
  "ログインIDまたはパスワードが正しくありません";
const UNEXPECTED_ERROR_MESSAGE =
  "ログインに失敗しました。時間をおいて再度お試しください";

/** 4xx はすべて認証失敗として扱い、ログインIDとパスワードのどちらが誤りかを区別しない */
function toErrorMessage(status: number): string {
  return status >= 400 && status < 500
    ? INVALID_CREDENTIALS_MESSAGE
    : UNEXPECTED_ERROR_MESSAGE;
}

export function useLoginForm() {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string>();
  const [isRedirecting, setIsRedirecting] = useState(false);

  const form = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: { username: "", password: "" },
  });

  const handleSubmit = form.handleSubmit(async (values) => {
    setErrorMessage(undefined);

    const { error } = await authClient.signIn
      .username(values)
      .catch(() => ({ error: { status: 0 } }));
    if (error) {
      setErrorMessage(toErrorMessage(error.status));
      return;
    }

    setIsRedirecting(true);
    router.replace("/reports");
    router.refresh();
  });

  return {
    register: form.register,
    errors: form.formState.errors,
    // 送信中〜画面遷移までボタンを無効化し、二重送信を防ぐ
    // （isSubmitSuccessful は認証失敗時も true になるため使わない）
    isSubmitting: form.formState.isSubmitting || isRedirecting,
    errorMessage,
    handleSubmit,
  };
}
