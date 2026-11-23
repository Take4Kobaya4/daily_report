import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/shared/lib/auth/authClient";

const LOGOUT_ERROR_MESSAGE =
  "ログアウトに失敗しました。時間をおいて再度お試しください";

export function useLogout() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>();

  // cacheComponents では遷移元の画面の state が保持されるため、
  // 再ログインして戻ったときにログアウト中のままにならないよう、画面を離れるときに初期化する
  useEffect(() => () => setIsPending(false), []);

  const handleLogout = async () => {
    setErrorMessage(undefined);
    setIsPending(true);

    const { error } = await authClient
      .signOut()
      .catch(() => ({ error: { status: 0 } }));
    if (error) {
      setErrorMessage(LOGOUT_ERROR_MESSAGE);
      setIsPending(false);
      return;
    }

    // 前のユーザーのデータを残さない
    queryClient.clear();
    // 成功時は画面遷移まで isPending を戻さず、二重送信を防ぐ
    router.replace("/login");
    router.refresh();
  };

  return { isPending, errorMessage, handleLogout };
}
