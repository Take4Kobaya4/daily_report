# External Layer（外部連携層）

## 概要

`external/` は、アプリケーションと外部の接続先（DB・外部 API）との境界をまとめた層です。

MVP では Next.js から PostgreSQL へ直接接続します。将来、Go のバックエンド API へ移行するときは、**`service` が呼び出す先を repository（DB）から client（API）へ切り替えるだけ** で済む構成にします。handler・dto・domain・features・app は変更しません。

API の仕様（エンドポイント・ステータスコード）は [../../docs/api-design.md](../../docs/api-design.md)、テーブル定義は [../../docs/database-design.md](../../docs/database-design.md) を正とします。

## ディレクトリ構造

```
src/external/
├─ client/                      # 接続先そのもの
│  ├─ database/
│  │  └─ prisma.ts              # Prisma Client（MVP の接続先）
│  └─ api/
│     └─ apiClient.ts           # Go API 用 HTTP クライアント（移行時に追加）
├─ domain/                      # アプリ内部で扱うモデル
│  └─ report/
│     └─ report.entity.ts
├─ dto/                         # 入出力の契約（Zod スキーマ + 型）
│  └─ report.dto.ts
├─ handler/                     # external の入口
│  └─ report/
│     ├─ report.query.server.ts    # 読み取り
│     ├─ report.command.server.ts  # 書き込み
│     └─ report.converter.ts       # domain → dto（レスポンス）
├─ repository/                  # DB アクセス
│  └─ report.repository.ts
└─ service/                     # 接続先を切り替える唯一の場所
   └─ report/
      └─ report.service.ts
```

## レイヤーの責務

| レイヤー | 責務 | 依存してよいもの | 移行時の変更 |
| --- | --- | --- | --- |
| `client` | DB 接続・HTTP クライアントの生成 | 外部ライブラリのみ | `api/` を追加 |
| `domain` | アプリ内部のモデル（entity）の型 | なし | なし |
| `dto` | リクエスト / レスポンスの Zod スキーマと型 | `zod` のみ | なし |
| `handler` | 入力の検証、service 呼び出し、レスポンスへの変換 | `service`, `dto`, `domain` | なし |
| `service` | 業務ロジック、**接続先の選択** | `repository` または `client/api`, `domain`, `dto` | **ここだけ変更** |
| `repository` | Prisma によるデータアクセス、DB モデル → domain の変換 | `client/database`, `domain` | 不要になれば削除 |

### 依存の向き

```
【MVP】
handler ──▶ service ──▶ repository ──▶ client/database ──▶ PostgreSQL

【Go 移行後】
handler ──▶ service ──▶ client/api ──────────────────────▶ Go API ──▶ PostgreSQL
            ▲
            └─ 変更はここだけ
```

service の戻り値は常に **domain の entity** です。接続先が DB でも API でも service の入出力の型は変わらないため、service より上（handler 以降）に影響しません。

## external の呼び出し元

```
features/*/components/server（PageTemplate）──▶ external/handler/*.server.ts
app/api/**/route.ts（Route Handler）──▶ external/handler/*.server.ts
features/*/client                    ──▶ external/dto（スキーマ・型のみ）
```

- external の入口は `handler` だけです。`service` / `repository` / `client` を features や app から直接 import しないでください。
- Client Component から import してよいのは `dto` だけです（`server-only` を付けないファイルのため）。
- 認証（セッションの取得）は呼び出し元で行い、handler には `userId` を渡します（[08_authentication.md](./08_authentication.md)）。

## client

接続先そのものを生成します。

```ts
// external/client/database/prisma.ts
import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// 開発時のホットリロードで接続が増え続けないよう再利用する
export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
```

Prisma は未導入です。導入時のバージョンに合わせて import パス・生成先を確認してください。

`client/api/apiClient.ts` は Go 移行時に追加します。MVP では作成しません。

## domain

アプリ内部で扱うモデルです。DB のテーブル定義にも API の JSON にも依存させません。

```ts
// external/domain/report/report.entity.ts
export type Report = {
  id: string;
  userId: string;
  title: string;
  content: string;
  reportDate: Date; // 時刻を含まない日付
  createdAt: Date;
  updatedAt: Date;
};
```

MVP では型のみとします。業務ルールが増えた場合は、同じディレクトリに純粋関数として追加してください。

## dto

API の入出力の契約です。Route Handler の検証・フォームのバリデーション・クライアントの型で共通して使います。

```ts
// external/dto/report.dto.ts
import { z } from "zod";

export const REPORT_TITLE_MAX_LENGTH = 200;
export const REPORT_CONTENT_MAX_LENGTH = 20_000;

/** POST /api/reports, PATCH /api/reports/:id のリクエスト */
export const ReportRequestSchema = z.object({
  reportDate: z.iso.date("日付を入力してください"),
  title: z
    .string()
    .trim()
    .min(1, "タイトルは必須です")
    .max(REPORT_TITLE_MAX_LENGTH, `タイトルは${REPORT_TITLE_MAX_LENGTH}文字以内で入力してください`),
  content: z
    .string()
    .min(1, "本文は必須です")
    .max(REPORT_CONTENT_MAX_LENGTH, `本文は${REPORT_CONTENT_MAX_LENGTH}文字以内で入力してください`),
});

/** GET / POST / PATCH のレスポンス */
export const ReportResponseSchema = z.object({
  id: z.string(),
  title: z.string(),
  content: z.string(),
  reportDate: z.iso.date(), // 暫定: シリアライズ形式は api-design.md の未決定事項
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export type ReportRequest = z.infer<typeof ReportRequestSchema>;
export type ReportResponse = z.infer<typeof ReportResponseSchema>;
```

- `userId` はリクエストに含めない（セッションから取得する）。レスポンスにも含めない。
- dto は外部仕様なので、DB や Go 側の実装が変わっても変更しない。
- dto には `server-only` を付けない（Client Component から import するため）。

## handler

external の入口です。HTTP（`Request` / `Response`）には依存させず、結果を値として返します。HTTP ステータスへの変換は Route Handler が行います。

### 結果の型

```ts
// external/handler/result.ts
export type HandlerResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: "VALIDATION_ERROR" | "NOT_FOUND" };
```

### Query（読み取り）

```ts
// external/handler/report/report.query.server.ts
import "server-only";
import type { ReportResponse } from "../../dto/report.dto";
import { reportService } from "../../service/report/report.service";
import { toReportResponse } from "./report.converter";

export async function listReportsQuery(userId: string): Promise<ReportResponse[]> {
  const reports = await reportService.listReports(userId);
  return reports.map(toReportResponse);
}

/** 存在しない、または他ユーザーの日報の場合は null */
export async function getReportByIdQuery(userId: string, id: string): Promise<ReportResponse | null> {
  const report = await reportService.getReport(userId, id);
  return report ? toReportResponse(report) : null;
}
```

### Command（書き込み）

```ts
// external/handler/report/report.command.server.ts
import "server-only";
import { ReportRequestSchema, type ReportResponse } from "../../dto/report.dto";
import { reportService } from "../../service/report/report.service";
import type { HandlerResult } from "../result";
import { toReportResponse } from "./report.converter";

export async function createReportCommand(
  userId: string,
  request: unknown,
): Promise<HandlerResult<ReportResponse>> {
  const parsed = ReportRequestSchema.safeParse(request);
  if (!parsed.success) return { ok: false, error: "VALIDATION_ERROR" };

  const report = await reportService.createReport(userId, parsed.data);
  return { ok: true, data: toReportResponse(report) };
}

export async function deleteReportCommand(userId: string, id: string): Promise<HandlerResult<null>> {
  const deleted = await reportService.deleteReport(userId, id);
  return deleted ? { ok: true, data: null } : { ok: false, error: "NOT_FOUND" };
}
```

### Converter（domain → dto）

Server Component のプリフェッチ結果と Route Handler のレスポンスは、どちらも handler を通るため同じ形になります（[06_tanstack_query.md](./06_tanstack_query.md#サーバーサイドプリフェッチ)）。

```ts
// external/handler/report/report.converter.ts
import "server-only";
import type { Report } from "../../domain/report/report.entity";
import type { ReportResponse } from "../../dto/report.dto";

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
```

### 命名規則

| 種類 | ファイル | 関数名 |
| --- | --- | --- |
| 読み取り | `xxx.query.server.ts` | `xxxQuery`（例: `listReportsQuery`, `getReportByIdQuery`） |
| 書き込み | `xxx.command.server.ts` | `xxxCommand`（例: `createReportCommand`） |
| 変換 | `xxx.converter.ts` | `toXxxResponse` |

`*.server.ts` には必ず `import "server-only";` を記載します。

## service

業務ロジックを実装し、**どの接続先からデータを取得するかを決める唯一の場所** です。

```ts
// external/service/report/report.service.ts
import "server-only";
import type { Report } from "../../domain/report/report.entity";
import type { ReportRequest } from "../../dto/report.dto";
import { reportRepository } from "../../repository/report.repository";

export const reportService = {
  listReports(userId: string): Promise<Report[]> {
    return reportRepository.findManyByUserId(userId);
  },

  getReport(userId: string, id: string): Promise<Report | null> {
    return reportRepository.findByIdAndUserId(id, userId);
  },

  createReport(userId: string, input: ReportRequest): Promise<Report> {
    return reportRepository.create(userId, input);
  },

  /** 対象が存在しない、または他ユーザーの日報の場合は null */
  updateReport(userId: string, id: string, input: ReportRequest): Promise<Report | null> {
    return reportRepository.updateByIdAndUserId(id, userId, input);
  },

  /** 対象が存在しない、または他ユーザーの日報の場合は false */
  async deleteReport(userId: string, id: string): Promise<boolean> {
    const count = await reportRepository.deleteByIdAndUserId(id, userId);
    return count > 0;
  },
};
```

- 戻り値は domain の entity にする（DB モデルや API の JSON を返さない）。
- 所有者の判定は repository のクエリ条件で行う（他ユーザーの日報は「存在しない」と同じ扱い）。

## repository

Prisma によるデータアクセスです。DB モデルを domain の entity に変換して返します。

```ts
// external/repository/report.repository.ts
import "server-only";
import type { Report as ReportModel } from "@prisma/client";
import { prisma } from "../client/database/prisma";
import type { Report } from "../domain/report/report.entity";
import type { ReportRequest } from "../dto/report.dto";

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

export const reportRepository = {
  async findManyByUserId(userId: string): Promise<Report[]> {
    const models = await prisma.report.findMany({
      where: { userId },
      orderBy: [{ reportDate: "desc" }, { createdAt: "desc" }], // 暫定: 並び順は未決定
    });
    return models.map(toEntity);
  },

  async findByIdAndUserId(id: string, userId: string): Promise<Report | null> {
    const model = await prisma.report.findFirst({ where: { id, userId } });
    return model ? toEntity(model) : null;
  },

  async create(userId: string, input: ReportRequest): Promise<Report> {
    const model = await prisma.report.create({
      data: { ...input, reportDate: new Date(input.reportDate), userId },
    });
    return toEntity(model);
  },

  async deleteByIdAndUserId(id: string, userId: string): Promise<number> {
    const result = await prisma.report.deleteMany({ where: { id, userId } });
    return result.count;
  },

  // updateByIdAndUserId も同様に userId を条件に含めて実装する
};
```

- 更新・削除は一意キーだけを指定する `update` / `delete` ではなく、`userId` を条件に含めて所有者を限定する。
- 業務ルール（文字数制限など）の判断は repository で行わない。
- N+1 クエリを避ける。

## Route Handler からの呼び出し

Route Handler（`app/api/`）は、認証・JSON の解析・HTTP ステータスへの変換だけを行い、処理は handler に委譲します。

```ts
// app/api/reports/route.ts
import { NextResponse } from "next/server";
import { createReportCommand } from "@/external/handler/report/report.command.server";
import { listReportsQuery } from "@/external/handler/report/report.query.server";
import { getSessionUserId } from "@/features/auth/servers/getSessionUserId";

export async function GET() {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  return NextResponse.json(await listReportsQuery(userId));
}

export async function POST(request: Request) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const body: unknown = await request.json().catch(() => undefined);
  if (body === undefined) return NextResponse.json({ message: "Bad Request" }, { status: 400 });

  const result = await createReportCommand(userId, body);
  if (!result.ok) return NextResponse.json({ message: "Validation Error" }, { status: 422 });

  return NextResponse.json(result.data, { status: 201 });
}
```

```ts
// app/api/reports/[id]/route.ts
import { NextResponse } from "next/server";
import { deleteReportCommand } from "@/external/handler/report/report.command.server";
import { getSessionUserId } from "@/features/auth/servers/getSessionUserId";

export async function DELETE(_request: Request, ctx: RouteContext<"/api/reports/[id]">) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });

  const { id } = await ctx.params;
  const result = await deleteReportCommand(userId, id);
  if (!result.ok) return NextResponse.json({ message: "Not Found" }, { status: 404 });

  return new Response(null, { status: 204 });
}
```

| handler の結果 | HTTP ステータス |
| --- | --- |
| `{ ok: true }`（作成） | 201 |
| `{ ok: true }`（取得・更新） | 200 |
| `{ ok: true }`（削除） | 204 |
| `VALIDATION_ERROR` | 422 |
| `NOT_FOUND` | 404（他ユーザーの日報も同じ） |

- 想定外の例外は握りつぶさず、Next.js の 500 応答に任せる。ログに日報本文やセッション情報を出力しない。
- エラーレスポンスの JSON 形式は未決定です。上記の `{ message }` は暫定です。

## Go 移行時の変更

### 変更前（MVP）

```ts
// external/service/report/report.service.ts
import { reportRepository } from "../../repository/report.repository";

export const reportService = {
  listReports(userId: string): Promise<Report[]> {
    return reportRepository.findManyByUserId(userId);
  },
  // ...
};
```

### 変更後（Go API）

```ts
// external/service/report/report.service.ts
import { apiClient } from "../../client/api/apiClient";

type ReportApiResponse = {
  id: string;
  user_id: string;
  title: string;
  content: string;
  report_date: string;
  created_at: string;
  updated_at: string;
};

// Go API の JSON → domain の変換も service 内に閉じ込める
function toEntity(res: ReportApiResponse): Report {
  return {
    id: res.id,
    userId: res.user_id,
    title: res.title,
    content: res.content,
    reportDate: new Date(res.report_date),
    createdAt: new Date(res.created_at),
    updatedAt: new Date(res.updated_at),
  };
}

export const reportService = {
  async listReports(userId: string): Promise<Report[]> {
    const res = await apiClient.get<ReportApiResponse[]>("/reports", { userId });
    return res.map(toEntity);
  },
  // ...
};
```

service の関数のシグネチャ（引数と戻り値の domain 型）が変わらないため、以下は変更不要です。

| 変更しない | 理由 |
| --- | --- |
| `handler` / `dto` / `domain` | service の入出力の型が同じ |
| `app/api/**/route.ts` | handler の入出力が同じ |
| `features/` | Route Handler の API 契約（dto）が同じ |

移行が完了した service から順に `repository` を参照しなくなり、すべて移行し終えたら `repository` と `client/database` を削除できます。

### 移行時に別途設計が必要なこと

- Go API への認証情報（セッション・トークン）の受け渡し方法（[../../docs/architecture.md](../../docs/architecture.md#9-future-go-migration)）
- `apiClient` のエラーを domain 側の結果（`null` / `false`）へどう対応させるか

MVP では `client/api/` を作らず、フィーチャーフラグによる DB / API の切り替えも先行実装しないでください。

## ベストプラクティス

1. **接続先の切り替えは service だけ**: handler や features に DB / API の分岐を書かない
2. **service は domain を返す**: Prisma の型・API の JSON を service より上に漏らさない
3. **dto は契約として固定**: 内部実装が変わっても変更しない
4. **入口は handler だけ**: features / app から service・repository を直接呼ばない
5. **所有者制限はクエリで行う**: 取得後に比較するのではなく、条件に `userId` を含める
