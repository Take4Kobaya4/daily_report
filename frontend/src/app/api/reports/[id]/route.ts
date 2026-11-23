import { NextResponse } from "next/server";
import {
  deleteReportCommand,
  updateReportCommand,
} from "@/external/handler/report/report.command.server";
import { getReportByIdQuery } from "@/external/handler/report/report.query.server";
import { getSessionUserId } from "@/features/auth/servers/getSessionUserId";

// 暫定: エラーレスポンスの JSON 形式は api-design.md の未決定事項
// 他ユーザーの日報は存在を秘匿するため、403 ではなく 404 を返す

/** 日報詳細 */
export async function GET(
  _request: Request,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const report = await getReportByIdQuery(userId, id);
  if (!report) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  return NextResponse.json(report);
}

/** 日報編集 */
export async function PATCH(
  request: Request,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const { id } = await ctx.params;
  const result = await updateReportCommand(userId, id, body);
  if (!result.ok) {
    return result.error === "NOT_FOUND"
      ? NextResponse.json({ message: "Not Found" }, { status: 404 })
      : NextResponse.json({ message: "Validation Error" }, { status: 422 });
  }

  return NextResponse.json(result.data);
}

/** 日報削除 */
export async function DELETE(
  _request: Request,
  ctx: RouteContext<"/api/reports/[id]">,
) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const { id } = await ctx.params;
  const result = await deleteReportCommand(userId, id);
  if (!result.ok) {
    return NextResponse.json({ message: "Not Found" }, { status: 404 });
  }

  return new Response(null, { status: 204 });
}
