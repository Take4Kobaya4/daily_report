import Link from "next/link";
import type { ReportResponse } from "@/external/dto/report.dto";
import { buttonVariants } from "@/shared/components/ui/button";
import { ReportListContent } from "./ReportListContent";

type Props = {
  reports: ReportResponse[];
  isLoading: boolean;
  isError: boolean;
};

export function ReportListPresenter({ reports, isLoading, isError }: Props) {
  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">日報一覧</h1>
        <Link href="/reports/new" className={buttonVariants()}>
          日報を作成
        </Link>
      </div>
      <ReportListContent
        reports={reports}
        isLoading={isLoading}
        isError={isError}
      />
    </section>
  );
}
