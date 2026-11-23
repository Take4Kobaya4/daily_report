import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    // generate は DB に接続しないため、未設定でも失敗させない（migrate 時は .env で設定する）
    url: process.env.DATABASE_URL ?? "",
  },
});
