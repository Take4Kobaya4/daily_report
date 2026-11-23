# 認証・認可

## 概要

Better Auth の `username` プラグインを使用し、**ログインID + パスワード** で認証します。MVP は個人ユーザーのみを対象とし、ロールベースの権限管理（RBAC）は導入しません。

方針の正は [../../docs/architecture.md](../../docs/architecture.md#8-authentication--authorization) です。

## 技術スタック

| 項目 | 技術 |
| --- | --- |
| 認証ライブラリ | Better Auth（未導入） |
| 認証方式 | ログインID + パスワード（`username` プラグイン） |
| セッション管理 | Better Auth に委譲（Cookie + DB セッション） |
| ユーザーデータ | PostgreSQL（Better Auth 管理のテーブル） |
| DB アダプター | Prisma |

パスワードのハッシュ化・セッション管理を独自実装しないでください。

## アーキテクチャ

```
┌──────────────┐   signUp / signIn / signOut   ┌──────────────────────┐
│ auth feature │ ────────────────────────────▶ │ /auth/[...all]       │
│ (Client)     │      authClient               │ Better Auth Handler  │
└──────────────┘                               └──────────┬───────────┘
                                                          │
                                                          ▼
┌──────────────┐  Cookie の有無で事前判定       ┌──────────────────────┐
│ proxy.ts     │ ─────────────────────────────▶│ PostgreSQL           │
└──────────────┘                               │ user / session / ... │
                                               └──────────▲───────────┘
┌──────────────┐  auth.api.getSession()                   │
│ Server Comp. │ ─────────────────────────────────────────┤
│ Route Handler│  （毎回サーバー側で検証）                 │
└──────────────┘ ─────────────────────────────────────────┘
```

| 箇所 | 役割 | 信頼してよいか |
| --- | --- | --- |
| `proxy.ts` | Cookie の有無で未ログインを早期リダイレクト | **No**（UX のための楽観的チェック） |
| PageTemplate（Server Component） | セッション検証、未認証なら `/login` へ | Yes |
| Route Handler | セッション検証、未認証なら 401 | Yes |
| UI のボタン非表示 | 表示制御 | **No**（認可の代わりにしない） |

## ファイル構成

```
shared/lib/auth/           # proxy.ts・app/api・features から使うため shared に置く
├─ auth.ts                 # Better Auth サーバー設定
└─ authClient.ts           # Better Auth クライアント
app/(authenticated)/auth/[...all]/
└─ route.ts                # Better Auth の Route Handler（/auth/*。認証不要のエンドポイントも含む）
proxy.ts                   # 楽観的なリダイレクト（Next.js 16 の Proxy）

features/auth/
├─ components/
│  ├─ server/
│  │  ├─ LoginPageTemplate/      # 認証済みなら /reports へリダイレクト
│  │  └─ RegisterPageTemplate/
│  └─ client/
│     ├─ LoginForm/              # index.ts, LoginFormContainer, LoginFormPresenter, useLoginForm
│     ├─ RegisterForm/           # index.ts, RegisterFormContainer, RegisterFormPresenter, useRegisterForm
│     └─ LogoutButton/           # index.ts, LogoutButtonContainer, LogoutButtonPresenter, useLogout
├─ schemas/                      # ログイン・登録フォームの Zod スキーマ（auth のページ群専用）
└─ servers/                      # サーバー専用の関数
   ├─ getSession.ts              # セッション取得（リクエスト内でキャッシュ）
   ├─ getSessionUserId.ts        # Route Handler 用
   └─ requireSession.ts          # PageTemplate 用（未認証はリダイレクト）
```

ログイン・登録は Better Auth の `authClient` が `/auth/*` を呼ぶため、`external/` を経由しません。

## 設定

以下は実装方針を示す例です。導入時は Better Auth のバージョンに合わせて API を確認してください。

```ts
// shared/lib/auth/auth.ts
import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/external/client/database/prisma";

export const auth = betterAuth({
  // Route Handler の配置に合わせて既定の /api/auth から変更する
  basePath: "/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // username プラグインは emailAndPassword の上に成り立つため有効にしておく
  emailAndPassword: { enabled: true, minPasswordLength: 8, maxPasswordLength: 128 },
  // ログインはログインID + パスワードに限定する（メールアドレスでのログインを無効化）
  // 登録は username を含めて /sign-up/email を使うため無効化しない
  disabledPaths: ["/sign-in/email"],
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    nextCookies(), // 最後に置く
  ],
});
```

- Better Auth の `user` テーブルではメールアドレスが必須のため、登録時にメールアドレスも受け取ります（ログインには使えません）。
- ログインはログインID + パスワード（`/sign-in/username`）のみとし、メールアドレスでのログイン API（`/sign-in/email`）は `disabledPaths` で無効化します。UI だけでなく API としても呼べない状態にします。

```ts
// app/(authenticated)/auth/[...all]/route.ts
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/shared/lib/auth/auth";

export const { GET, POST } = toNextJsHandler(auth);
```

```ts
// shared/lib/auth/authClient.ts
import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/auth", // サーバー側の basePath と合わせる
  plugins: [usernameClient()],
});
```

## 認証ガード

### セッション取得

```ts
// features/auth/servers/getSession.ts
import "server-only";
import { headers } from "next/headers";
import { cache } from "react";
import { auth } from "@/shared/lib/auth/auth";

// 同一リクエスト内で複数回呼ばれても DB 問い合わせを 1 回にする
export const getSession = cache(async () => auth.api.getSession({ headers: await headers() }));
```

### Server Component

```ts
// features/auth/servers/requireSession.ts
import "server-only";
import { redirect } from "next/navigation";
import { getSession } from "./getSession";

export async function requireSession() {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}
```

`headers()` を読むため、呼び出し元は `<Suspense>` の内側に置いてください（[03_app_router.md](./03_app_router.md#cache-components-と-suspense)）。

### Route Handler

```ts
// features/auth/servers/getSessionUserId.ts
import "server-only";
import { getSession } from "./getSession";

/** 未認証の場合は null。Route Handler では null のとき 401 を返す */
export async function getSessionUserId(): Promise<string | null> {
  const session = await getSession();
  return session?.user.id ?? null;
}
```

Route Handler ではリダイレクトせず、401 を返します。取得した `userId` を `external/handler` に渡します（[05_external_layer.md](./05_external_layer.md#route-handler-からの呼び出し)）。

### Proxy（楽観的リダイレクト）

```ts
// proxy.ts
import { getSessionCookie } from "better-auth/cookies";
import { type NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  // Cookie の存在のみを確認する。正当性の検証はページ・API 側で行う
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/reports/:path*"],
};
```

## 認可（所有者チェック）

| ルール | 実装箇所 |
| --- | --- |
| 自分の日報のみ閲覧・編集・削除できる | `external/repository` のクエリ条件に `userId` を含める |
| 他ユーザーの日報は存在を秘匿する | 該当なしと同じく 404 / `notFound()` |
| `userId` はクライアントから受け取らない | Zod スキーマに含めず、セッションから取得 |

実装例は [05_external_layer.md](./05_external_layer.md#repository) を参照してください。

Go 移行後は、所有者の制限は Go API 側の責務になります。認証情報の受け渡し方法は移行時に設計します。

## ログイン・登録・ログアウト

| ユースケース | クライアント処理 | 成功時 | 失敗時 |
| --- | --- | --- | --- |
| UC-01 登録 | `authClient.signUp.email({ username, email, password, name })` | `/reports` へ遷移 | 入力エラー / ID・メール登録済みの旨を表示 |
| UC-02 ログイン | `authClient.signIn.username({ username, password })` | `/reports` へ遷移 | 「ログインIDまたはパスワードが正しくありません」 |
| UC-03 ログアウト | `authClient.signOut()` | `/login` へ遷移 | エラーメッセージ表示 |

- `signUp.email` は `name`（表示名）が必須です。MVP では入力項目を増やさず、ログインIDを `name` に設定します。
- ログイン失敗時は、ログインIDとパスワードのどちらが誤っているかを区別して表示しない。
- ログアウト時は `queryClient.clear()` でキャッシュを破棄し、前ユーザーのデータを残さない。

## フォームのスキーマ

入力ルールは [../../docs/requirements.md](../../docs/requirements.md#認証) を正とします。

```ts
// features/auth/schemas/authSchema.ts
import { z } from "zod";

const usernameSchema = z
  .string()
  .min(3, "ログインIDは3文字以上で入力してください")
  .max(30, "ログインIDは30文字以内で入力してください")
  .regex(/^[a-zA-Z0-9_.]+$/, "ログインIDは半角英数字・_・. で入力してください");

const passwordSchema = z
  .string()
  .min(8, "パスワードは8文字以上で入力してください")
  .max(128, "パスワードは128文字以内で入力してください");

export const LoginSchema = z.object({
  username: z.string().min(1, "ログインIDを入力してください"),
  password: z.string().min(1, "パスワードを入力してください"),
});

export const RegisterSchema = z.object({
  username: usernameSchema,
  email: z.email("メールアドレスの形式が正しくありません"),
  password: passwordSchema,
});

export type LoginInput = z.infer<typeof LoginSchema>;
export type RegisterInput = z.infer<typeof RegisterSchema>;
```

- ログイン時は形式チェックを最小限にし、詳しい理由を出さずに「ログインIDまたはパスワードが正しくありません」と表示します。
- 文字数・文字種の最終的な検証は Better Auth（サーバー側）で行われます。上記はフォームの UX のための検証です。

## 環境変数

```bash
# .env（Git にコミットしない）
BETTER_AUTH_SECRET=   # ランダムな秘密鍵
BETTER_AUTH_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

秘密情報・セッショントークンをログに出力しないでください。

## トラブルシューティング

### セッションが取得できない

1. `BETTER_AUTH_SECRET` / `BETTER_AUTH_URL` が設定されているか確認する
2. ブラウザに Better Auth の Cookie が保存されているか確認する
3. Server Component 内で `headers()` を `<Suspense>` の外で読んでいないか確認する

### 認証テーブルが存在しない

1. Better Auth の CLI でスキーマを生成し、Prisma のマイグレーションを実行したか確認する
2. Better Auth 管理のテーブルを独自に変更していないか確認する
