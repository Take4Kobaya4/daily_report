import "server-only";
import { ReportRequestSchema, type ReportResponse } from "../../dto/report.dto";
import { reportService } from "../../service/report/report.service";
import type { HandlerResult } from "../result";
import { toReportResponse } from "./report.converter";

/** POST /api/reports */
export async function createReportCommand(
  userId: string,
  request: unknown,
): Promise<HandlerResult<ReportResponse>> {
  const parsed = ReportRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "VALIDATION_ERROR" };

  const report = await reportService.createReport(userId, parsed.data);
  return { ok: true, data: toReportResponse(report) };
}

/**
 * PATCH /api/reports/:id
 * MVP では編集フォームが全項目を送るため、作成と同じスキーマで検証する。
 */
export async function updateReportCommand(
  userId: string,
  id: string,
  request: unknown,
): Promise<HandlerResult<ReportResponse>> {
  const parsed = ReportRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "VALIDATION_ERROR" };

  const report = await reportService.updateReport(userId, id, parsed.data);
  if (!report) return { ok: false, error: "NOT_FOUND" };

  return { ok: true, data: toReportResponse(report) };
}

/** DELETE /api/reports/:id */
export async function deleteReportCommand(
  userId: string,
  id: string,
): Promise<HandlerResult<null>> {
  const deleted = await reportService.deleteReport(userId, id);
  return deleted ? { ok: true, data: null } : { ok: false, error: "NOT_FOUND" };
}
