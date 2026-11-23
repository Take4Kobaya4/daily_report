import "server-only";
import type { Report } from "../../domain/report/report.entity";
import type { ReportRequest } from "../../dto/report.dto";
import { reportRepository } from "../../repository/report.repository";

/**
 * 日報の業務ロジック。
 * どの接続先（MVP: repository / Go 移行後: client/api）からデータを取得するかを決める唯一の場所。
 * 戻り値は常に domain の entity とする。
 */
export const reportService = {
  listReports(userId: string): Promise<Report[]> {
    return reportRepository.findManyByUserId(userId);
  },

  /** 存在しない、または他ユーザーの日報の場合は null */
  getReport(userId: string, id: string): Promise<Report | null> {
    return reportRepository.findByIdAndUserId(id, userId);
  },

  createReport(userId: string, input: ReportRequest): Promise<Report> {
    return reportRepository.create(userId, input);
  },

  /** 存在しない、または他ユーザーの日報の場合は null */
  updateReport(
    userId: string,
    id: string,
    input: ReportRequest,
  ): Promise<Report | null> {
    return reportRepository.updateByIdAndUserId(id, userId, input);
  },

  /** 存在しない、または他ユーザーの日報の場合は false */
  async deleteReport(userId: string, id: string): Promise<boolean> {
    const count = await reportRepository.deleteByIdAndUserId(id, userId);
    return count > 0;
  },
};
