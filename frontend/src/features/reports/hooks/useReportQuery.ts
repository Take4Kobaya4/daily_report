import { useQuery } from "@tanstack/react-query";
import { reportApi } from "@/features/reports/api/reportApi";
import { reportKeys } from "@/features/reports/queries/keys";

export function useReportListQuery() {
  return useQuery({
    queryKey: reportKeys.lists(),
    queryFn: reportApi.list,
  });
}
