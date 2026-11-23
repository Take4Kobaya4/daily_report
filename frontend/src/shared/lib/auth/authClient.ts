import { usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  // サーバー側（auth.ts）の basePath と合わせる
  basePath: "/auth",
  plugins: [usernameClient()],
});
