import { cn } from "@/lib/utils";
import type { DailyReportRow } from "@/types/domain";

/**
 * Compact stacked bars for daily queue activity. Deliberately dependency-free:
 * the data is small and a chart library would cost more than it adds here.
 */
export function DailyBars({ rows, className }: { rows: DailyReportRow[]; className?: string }) {
  if (rows.length === 0) return <p className={cn("text-sm text-ink-500", className)}>No activity yet.</p>;

  const max = Math.max(1, ...rows.map((r) => r.joined));

  return (
    <div className={className}>
      <div className="flex items-end gap-1.5" role="img" aria-label={`Daily queue joins for the last ${rows.length} days`}>
        {rows.map((r) => {
          const height = Math.round((r.joined / max) * 100);
          const completedShare = r.joined > 0 ? Math.round((r.completed / r.joined) * 100) : 0;
          const day = new Date(r.date).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
          return (
            <div key={r.date} className="group relative flex flex-1 flex-col items-center gap-1">
              <div className="flex h-28 w-full items-end">
                <div className="relative w-full overflow-hidden rounded-sm bg-ink-100" style={{ height: `${Math.max(4, height)}%` }}>
                  <div className="absolute inset-x-0 bottom-0 bg-brand-500" style={{ height: `${completedShare}%` }} />
                </div>
              </div>
              <span className="text-[10px] text-ink-400 tabular">{new Date(r.date).getDate()}</span>
              <span className="pointer-events-none absolute bottom-full z-10 mb-1 hidden whitespace-nowrap rounded bg-ink-950 px-2 py-1 text-[11px] text-white group-hover:block">
                {day}: {r.joined} joined · {r.completed} completed
              </span>
            </div>
          );
        })}
      </div>
      <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-600">
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-brand-500" aria-hidden />
          <dt>Completed</dt>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-ink-100" aria-hidden />
          <dt>Joined</dt>
        </div>
        <div>
          <dt className="inline">Total joined:</dt>{" "}
          <dd className="inline font-semibold text-ink-900 tabular">{rows.reduce((n, r) => n + r.joined, 0)}</dd>
        </div>
        <div>
          <dt className="inline">No-shows:</dt>{" "}
          <dd className="inline font-semibold text-ink-900 tabular">{rows.reduce((n, r) => n + r.no_show, 0)}</dd>
        </div>
      </dl>
    </div>
  );
}
