import { NextResponse } from "next/server";
import { createReportCommand } from "@/external/handler/report/report.command.server";
import { listReportsQuery } from "@/external/handler/report/report.query.server";
import { getSessionUserId } from "@/features/auth/servers/getSessionUserId";

// 暫定: エラーレスポンスの JSON 形式は api-design.md の未決定事項

/** 日報一覧 */
export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await listReportsQuery(userId));
}

/** 日報作成 */
export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) {
    return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  }

  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) {
    return NextResponse.json({ message: "Bad Request" }, { status: 400 });
  }

  const result = await createReportCommand(userId, body);
  if (!result.ok) {
    return NextResponse.json({ message: "Validation Error" }, { status: 422 });
  }

  return NextResponse.json(result.data, { status: 201 });
}
