const SKELETON_ROW_COUNT = 3;

export function ReportListSkeleton() {
  return (
    <ul
      aria-busy="true"
      aria-label="読み込み中"
      className="divide-y rounded-lg border"
    >
      {Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => (
        // biome-ignore lint/suspicious/noArrayIndexKey: 並び替えのない固定のプレースホルダー
        <li key={i} className="space-y-2 p-4">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-5 w-2/3 animate-pulse rounded bg-muted" />
        </li>
      ))}
    </ul>
  );
}
