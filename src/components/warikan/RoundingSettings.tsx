import type { Participant, RoundingMode, RoundingUnit } from "../../lib/warikan/types";
import { autoName } from "../../lib/warikan/names";

interface Props {
  unit: RoundingUnit;
  mode: RoundingMode;
  assignedParticipantId: string | null;
  participants: Participant[];
  onUnitChange: (unit: RoundingUnit) => void;
  onModeChange: (mode: RoundingMode) => void;
  onAssignedChange: (participantId: string | null) => void;
}

const UNITS: RoundingUnit[] = [1, 10, 100, 500, 1000];

const MODES: { value: RoundingMode; label: string; description: string }[] = [
  { value: "smart", label: "おまかせ（おすすめ）", description: "傾斜を考慮して自動調整" },
  { value: "highPayer", label: "多く払う人が負担", description: "支払額が高い人から端数を持つ" },
  { value: "assigned", label: "指定した人が負担", description: "端数を負担する人を1人選ぶ" },
  { value: "distribute", label: "みんなで調整", description: "端数をできるだけ分散" },
  { value: "leaveRemainder", label: "端数として残す", description: "誰にも割り当てず別表示" },
];

export default function RoundingSettings({
  unit,
  mode,
  assignedParticipantId,
  participants,
  onUnitChange,
  onModeChange,
  onAssignedChange,
}: Props) {
  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <h2 class="text-sm font-semibold text-slate-500">端数処理</h2>

      <div class="mt-2 flex flex-wrap gap-1.5">
        {UNITS.map((u) => (
          <button
            key={u}
            type="button"
            onClick={() => onUnitChange(u)}
            aria-pressed={unit === u}
            class={`inline-flex min-h-11 touch-manipulation select-none items-center justify-center rounded-full px-3 text-xs font-semibold transition-transform active:scale-95 ${
              unit === u ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-500"
            }`}
          >
            {u.toLocaleString("ja-JP")}円単位
          </button>
        ))}
      </div>

      <div class="mt-3 space-y-1.5">
        {MODES.map((m) => (
          <label
            key={m.value}
            class={`flex min-h-11 touch-manipulation select-none cursor-pointer items-start gap-2 rounded-xl border p-2.5 ${
              mode === m.value ? "border-teal-500 bg-teal-50" : "border-slate-200"
            }`}
          >
            <input
              type="radio"
              name="rounding-mode"
              class="mt-0.5"
              checked={mode === m.value}
              onChange={() => onModeChange(m.value)}
            />
            <span>
              <span class="block text-sm font-semibold text-slate-800">{m.label}</span>
              <span class="block text-xs text-slate-500">{m.description}</span>
            </span>
          </label>
        ))}
      </div>

      {mode === "assigned" && (
        <div class="mt-2">
          <label class="text-xs text-slate-500">端数を負担する人</label>
          <select
            value={assignedParticipantId ?? ""}
            onChange={(e) => onAssignedChange((e.currentTarget as HTMLSelectElement).value || null)}
            class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
            aria-label="端数を負担する人"
          >
            <option value="">選択してください</option>
            {participants.map((p, i) => (
              <option key={p.id} value={p.id}>
                {p.name.trim() || autoName(i)}
              </option>
            ))}
          </select>
        </div>
      )}
    </section>
  );
}
