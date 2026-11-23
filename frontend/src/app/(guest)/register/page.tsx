import type { Metadata } from "next";
import { RegisterPageTemplate } from "@/features/auth/components/server/RegisterPageTemplate";

export const metadata: Metadata = {
  title: "ユーザー登録 | Daily Report",
};

export default function Page() {
  return <RegisterPageTemplate />;
}
