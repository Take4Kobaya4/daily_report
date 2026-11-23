import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { listReportsQuery } from "@/external/handler/report/report.query.server";
import { requireSession } from "@/features/auth/servers/requireSession";
import { reportKeys } from "@/features/reports/queries/keys";
import { getQueryClient } from "@/shared/lib/queryClient";
import { ReportList } from "../../client/ReportList";

export async function ReportListPageTemplate() {
  const session = await requireSession();
  const queryClient = getQueryClient();

  await queryClient.prefetchQuery({
    queryKey: reportKeys.lists(),
    queryFn: () => listReportsQuery(session.user.id),
  });

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ReportList />
    </HydrationBoundary>
  );
}
