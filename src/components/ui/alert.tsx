import * as React from "react";
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "info" | "success" | "warning" | "danger";

const tones: Record<Tone, { box: string; icon: React.ReactNode }> = {
  info: { box: "border-blue-200 bg-info-50 text-info-700", icon: <Info /> },
  success: { box: "border-green-200 bg-success-50 text-success-700", icon: <CheckCircle2 /> },
  warning: { box: "border-amber-200 bg-warning-50 text-warning-700", icon: <AlertTriangle /> },
  danger: { box: "border-red-200 bg-danger-50 text-danger-700", icon: <AlertCircle /> },
};

export function Alert({
  tone = "info",
  title,
  children,
  className,
}: {
  tone?: Tone;
  title?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      role={tone === "danger" ? "alert" : "status"}
      className={cn("flex gap-3 rounded-md border p-3 text-sm [&_svg]:mt-0.5 [&_svg]:size-4 [&_svg]:shrink-0", tones[tone].box, className)}
    >
      {tones[tone].icon}
      <div>
        {title ? <p className="font-semibold">{title}</p> : null}
        {children ? <div className={cn(title && "mt-0.5")}>{children}</div> : null}
      </div>
    </div>
  );
}
