"use client";

import { ReportListPresenter } from "./ReportListPresenter";
import { useReportList } from "./useReportList";

export function ReportListContainer() {
  const { reports, isLoading, isError } = useReportList();

  return (
    <ReportListPresenter
      reports={reports}
      isLoading={isLoading}
      isError={isError}
    />
  );
}
