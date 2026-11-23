import "server-only";
import {
  Prisma,
  type Report as ReportModel,
} from "../client/database/generated/client";
import { prisma } from "../client/database/prisma";
import type { Report } from "../domain/report/report.entity";
import type { ReportRequest } from "../dto/report.dto";

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * id カラムは UUID 型のため、UUID 形式でない値で検索すると DB エラーになる。
 * 形式が不正な id は「存在しない日報」と同じ扱いにする。
 */
function isUuid(id: string): boolean {
  return UUID_PATTERN.test(id);
}

/** DB モデル → domain */
function toEntity(model: ReportModel): Report {
  return {
    id: model.id,
    userId: model.userId,
    title: model.title,
    content: model.content,
    reportDate: model.reportDate,
    createdAt: model.createdAt,
    updatedAt: model.updatedAt,
  };
}

/** リクエスト → 保存する値（"YYYY-MM-DD" は UTC の 00:00:00 として解釈される） */
function toData(input: ReportRequest) {
  return {
    title: input.title,
    content: input.content,
    reportDate: new Date(input.reportDate),
  };
}

function isRecordNotFound(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2025"
  );
}

/**
 * 日報のデータアクセス。
 * すべてのクエリで userId を条件に含め、所有者を限定する（他ユーザーの日報は「存在しない」と同じ扱い）。
 */
export const reportRepository = {
  async findManyByUserId(userId: string): Promise<Report[]> {
    const models = await prisma.report.findMany({
      where: { userId },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }], // 暫定: 並び順は未決定
    });
    return models.map(toEntity);
  },

  /** 存在しない、または他ユーザーの日報の場合は null */
  async findByIdAndUserId(id: string, userId: string): Promise<Report | null> {
    if (!isUuid(id)) return null;

    const model = await prisma.report.findFirst({ where: { id, userId } });
    return model ? toEntity(model) : null;
  },

  async create(userId: string, input: ReportRequest): Promise<Report> {
    const model = await prisma.report.create({
      data: { ...toData(input), userId },
    });
    return toEntity(model);
  },

  /** 存在しない、または他ユーザーの日報の場合は null */
  async updateByIdAndUserId(
    id: string,
    userId: string,
    input: ReportRequest,
  ): Promise<Report | null> {
    if (!isUuid(id)) return null;

    try {
      const model = await prisma.report.update({
        where: { id, userId },
        data: toData(input),
      });
      return toEntity(model);
    } catch (error) {
      if (isRecordNotFound(error)) return null;
      throw error;
    }
  },

  /** 削除した件数を返す（存在しない、または他ユーザーの日報の場合は 0） */
  async deleteByIdAndUserId(id: string, userId: string): Promise<number> {
    if (!isUuid(id)) return 0;

    const result = await prisma.report.deleteMany({ where: { id, userId } });
    return result.count;
  },
};
