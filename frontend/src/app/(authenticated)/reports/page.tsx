import type { Metadata } from "next";
import { ReportListPageTemplate } from "@/features/reports/components/server/ReportListPageTemplate";

export const metadata: Metadata = {
  title: "日報一覧 | Daily Report",
};

export default function Page() {
  return <ReportListPageTemplate />;
}
