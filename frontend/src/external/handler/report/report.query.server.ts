import "server-only";
import type { ReportResponse } from "../../dto/report.dto";
import { reportService } from "../../service/report/report.service";
import { toReportResponse } from "./report.converter";

/** GET /api/reports */
export async function listReportsQuery(
  userId: string,
): Promise<ReportResponse[]> {
  const reports = await reportService.listReports(userId);
  return reports.map(toReportResponse);
}

/**
 * GET /api/reports/:id
 * 存在しない、または他ユーザーの日報の場合は null
 */
export async function getReportByIdQuery(
  userId: string,
  id: string,
): Promise<ReportResponse | null> {
  const report = await reportService.getReport(userId, id);
  return report ? toReportResponse(report) : null;
}
