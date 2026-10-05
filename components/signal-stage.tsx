import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

type SignalStageProps = {
  number: number;
  align: "left" | "right" | "wide";
  children: ReactNode;
  className?: string;
};

/** Places semantic portfolio content around the shared vertical signal. */
export default function SignalStage({ number, align, children, className }: SignalStageProps) {
  return (
    <div className={cn("signal-stage", `signal-stage--${align}`, className)}>
      <span aria-hidden="true" className="signal-stage__number">
        {String(number).padStart(2, "0")}
      </span>
      <div className="signal-stage__content">{children}</div>
    </div>
  );
}
