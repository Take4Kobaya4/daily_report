import type { Metadata } from "next";
import { LoginPageTemplate } from "@/features/auth/components/server/LoginPageTemplate";

export const metadata: Metadata = {
  title: "ログイン | Daily Report",
};

export default function Page() {
  return <LoginPageTemplate />;
}
