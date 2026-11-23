import "server-only";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { nextCookies } from "better-auth/next-js";
import { username } from "better-auth/plugins";
import { prisma } from "@/external/client/database/prisma";

export const auth = betterAuth({
  // Route Handler を app/(authenticated)/auth/[...all] に置いているため、既定の /api/auth から変更する
  basePath: "/auth",
  database: prismaAdapter(prisma, { provider: "postgresql" }),
  // username プラグインは emailAndPassword の上に成り立つため有効にしておく
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    maxPasswordLength: 128,
  },
  // ログインはログインID + パスワードに限定する（メールアドレスでのログインを無効化）
  // 登録は username を含めて /sign-up/email を使うため無効化しない
  disabledPaths: ["/sign-in/email"],
  plugins: [
    username({ minUsernameLength: 3, maxUsernameLength: 30 }),
    nextCookies(), // 最後に置く
  ],
});
