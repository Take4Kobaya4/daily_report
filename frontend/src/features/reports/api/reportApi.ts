import type { ReportResponse } from "@/external/dto/report.dto";

export class ApiError extends Error {
  constructor(readonly status: number) {
    super(`API Error: ${status}`);
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  if (!res.ok) throw new ApiError(res.status);
  return (res.status === 204 ? undefined : await res.json()) as T;
}

// 作成・詳細・編集・削除は各画面の実装時に追加する
export const reportApi = {
  list: () => request<ReportResponse[]>("/api/reports"),
};
