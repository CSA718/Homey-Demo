import type { LotCheckReport } from "../lib/lotCheck";

const VERDICT_STYLE: Record<
  LotCheckReport["verdict"],
  { bg: string; text: string; border: string }
> = {
  buildable: { bg: "bg-clear-bg", text: "text-clear", border: "border-clear/30" },
  conditional: {
    bg: "bg-caution-bg",
    text: "text-caution",
    border: "border-caution/30",
  },
  "high-risk": { bg: "bg-flag-bg", text: "text-flag", border: "border-flag/30" },
};

export default function VerdictBadge({
  verdict,
  label,
}: {
  verdict: LotCheckReport["verdict"];
  label: string;
}) {
  const style = VERDICT_STYLE[verdict];
  return (
    <span
      className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${style.bg} ${style.text} ${style.border}`}
    >
      {label}
    </span>
  );
}
