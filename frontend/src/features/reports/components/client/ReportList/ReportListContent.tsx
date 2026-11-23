import Link from "next/link";
import type { ReportResponse } from "@/external/dto/report.dto";
import { ReportListEmpty } from "./ReportListEmpty";
import { ReportListItem } from "./ReportListItem";
import { ReportListSkeleton } from "./ReportListSkeleton";

type Props = {
  reports: ReportResponse[];
  isLoading: boolean;
  isError: boolean;
};

export function ReportListContent({ reports, isLoading, isError }: Props) {
  if (isLoading) return <ReportListSkeleton />;
  if (isError) {
    return (
      <p role="alert" className="text-sm text-destructive">
        日報の取得に失敗しました。時間をおいて再度お試しください。
      </p>
    );
  }
  if (reports.length === 0) return <ReportListEmpty />;

  return (
    <ul className="divide-y rounded-lg border">
      {reports.map((report) => (
        <li key={report.id}>
          <Link
            href={`/reports/${report.id}`}
            className="block p-4 transition-colors hover:bg-muted"
          >
            <ReportListItem report={report} />
          </Link>
        </li>
      ))}
    </ul>
  );
}
