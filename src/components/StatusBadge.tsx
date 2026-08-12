import type { RiskStatus } from "../lib/lotCheck";

const CONFIG: Record<
  RiskStatus,
  { label: string; text: string; bg: string; dot: string }
> = {
  clear: {
    label: "Clear",
    text: "text-clear",
    bg: "bg-clear-bg",
    dot: "bg-clear",
  },
  caution: {
    label: "Caution",
    text: "text-caution",
    bg: "bg-caution-bg",
    dot: "bg-caution",
  },
  flag: {
    label: "Flag",
    text: "text-flag",
    bg: "bg-flag-bg",
    dot: "bg-flag",
  },
};

export default function StatusBadge({ status }: { status: RiskStatus }) {
  const c = CONFIG[status];
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${c.text} ${c.bg}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${c.dot}`} />
      {c.label}
    </span>
  );
}
