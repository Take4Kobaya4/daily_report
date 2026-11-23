import "server-only";
import type { Report } from "../../domain/report/report.entity";
import type { ReportResponse } from "../../dto/report.dto";

/** domain → dto（レスポンス）。userId はレスポンスに含めない */
export function toReportResponse(report: Report): ReportResponse {
  return {
    id: report.id,
    title: report.title,
    content: report.content,
    reportDate: report.reportDate.toISOString().slice(0, 10),
    createdAt: report.createdAt.toISOString(),
    updatedAt: report.updatedAt.toISOString(),
  };
}
