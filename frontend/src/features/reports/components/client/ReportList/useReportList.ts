import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { ApiError } from "@/features/reports/api/reportApi";
import { useReportListQuery } from "@/features/reports/hooks/useReportQuery";

const UNAUTHORIZED_STATUS = 401;

export function useReportList() {
  const router = useRouter();
  const { data, isPending, isError, error } = useReportListQuery();

  // セッション切れで再取得が 401 になった場合はログイン画面へ戻す
  const isUnauthorized =
    error instanceof ApiError && error.status === UNAUTHORIZED_STATUS;
  useEffect(() => {
    if (isUnauthorized) router.replace("/login");
  }, [isUnauthorized, router]);

  return {
    reports: data ?? [],
    isLoading: isPending,
    isError: isError && !isUnauthorized,
  };
}
