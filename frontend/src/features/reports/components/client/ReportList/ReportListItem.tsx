import type { ReportResponse } from "@/external/dto/report.dto";

type Props = { report: ReportResponse };

export function ReportListItem({ report }: Props) {
  return (
    <div className="space-y-1">
      <time
        dateTime={report.reportDate}
        className="text-sm text-muted-foreground"
      >
        {report.reportDate}
      </time>
      <h2 className="font-medium">{report.title}</h2>
    </div>
  );
}
