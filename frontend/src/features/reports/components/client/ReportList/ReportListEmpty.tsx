import Link from "next/link";
import { buttonVariants } from "@/shared/components/ui/button";

export function ReportListEmpty() {
  return (
    <div className="space-y-4 rounded-lg border border-dashed p-8 text-center">
      <p className="text-muted-foreground">まだ日報がありません。</p>
      <Link
        href="/reports/new"
        className={buttonVariants({ variant: "outline" })}
      >
        最初の日報を作成する
      </Link>
    </div>
  );
}
