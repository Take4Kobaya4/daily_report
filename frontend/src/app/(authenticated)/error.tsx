"use client";

import { Button } from "@/shared/components/ui/button";

export default function ErrorPage(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">エラーが発生しました</h2>
      {/* error.message はユーザーに見せる前提で作られていないため表示しない */}
      <Button type="button" variant="outline" onClick={props.reset}>
        再試行
      </Button>
    </div>
  );
}
