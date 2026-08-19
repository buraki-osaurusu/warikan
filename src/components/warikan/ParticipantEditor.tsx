import { useState } from "preact/hooks";
import { autoName } from "../../lib/warikan/names";
import { ADJUSTMENT_REASON_LABELS, ADJUSTMENT_REASON_ORDER } from "../../lib/warikan/reasons";
import type { AdjustmentReason, AdjustmentType, Participant, PaymentGroup } from "../../lib/warikan/types";

interface Props {
  participants: Participant[];
  groups: PaymentGroup[];
  onNameChange: (id: string, name: string) => void;
  onGroupChange: (id: string, groupId: string) => void;
  onAdjustmentChange: (
    id: string,
    adjustmentType: AdjustmentType,
    adjustmentValue: number,
    adjustmentReason?: AdjustmentReason,
    adjustmentReasonCustom?: string,
  ) => void;
  onRemove: (id: string) => void;
  onAdd: () => void;
}

export default function ParticipantEditor({
  participants,
  groups,
  onNameChange,
  onGroupChange,
  onAdjustmentChange,
  onRemove,
  onAdd,
}: Props) {
  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-500">参加者と所属グループ</h2>
        <span class="text-xs text-slate-400">{participants.length}人</span>
      </div>

      <ul class="mt-2 space-y-1.5">
        {participants.map((p, i) => (
          <ParticipantRow
            key={p.id}
            participant={p}
            index={i}
            groups={groups}
            onNameChange={onNameChange}
            onGroupChange={onGroupChange}
            onAdjustmentChange={onAdjustmentChange}
            onRemove={onRemove}
            canRemove={participants.length > 1}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        class="mt-3 min-h-11 w-full touch-manipulation select-none rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-semibold text-slate-500 active:bg-slate-50"
      >
        ＋ 参加者を追加
      </button>
    </section>
  );
}

interface RowProps {
  participant: Participant;
  index: number;
  groups: PaymentGroup[];
  onNameChange: Props["onNameChange"];
  onGroupChange: Props["onGroupChange"];
  onAdjustmentChange: Props["onAdjustmentChange"];
  onRemove: Props["onRemove"];
  canRemove: boolean;
}

function ParticipantRow({
  participant,
  index,
  groups,
  onNameChange,
  onGroupChange,
  onAdjustmentChange,
  onRemove,
  canRemove,
}: RowProps) {
  const [expanded, setExpanded] = useState(participant.adjustmentType !== "none");
  const hasAdjustment = participant.adjustmentType !== "none";

  return (
    <li class="rounded-xl border border-slate-200 p-2">
      <div class="flex items-center gap-2">
        <input
          type="text"
          value={participant.name}
          placeholder={autoName(index)}
          onInput={(e) => onNameChange(participant.id, (e.currentTarget as HTMLInputElement).value)}
          class="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium"
          aria-label="参加者名"
        />
        <select
          value={participant.groupId}
          onChange={(e) => onGroupChange(participant.id, (e.currentTarget as HTMLSelectElement).value)}
          class="rounded-lg border border-slate-200 px-2 py-2 text-sm"
          aria-label="所属グループ"
        >
          {groups.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => onRemove(participant.id)}
          disabled={!canRemove}
          aria-label="参加者を削除"
          class="flex min-h-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-lg px-2 py-2 text-sm text-rose-500 disabled:opacity-20"
        >
          削除
        </button>
      </div>

      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        aria-expanded={expanded}
        class="mt-1.5 flex min-h-11 touch-manipulation select-none items-center gap-1 text-xs font-semibold text-teal-700"
      >
        {expanded ? "詳細を閉じる ▲" : "詳細 ▼"}
        {!expanded && hasAdjustment && (
          <span class="rounded-full bg-teal-100 px-1.5 py-0.5 text-[10px] font-bold text-teal-700">調整あり</span>
        )}
      </button>

      {expanded && (
        <div class="mt-2 space-y-2 rounded-lg bg-slate-50 p-2.5">
          <div class="flex flex-wrap gap-1.5">
            <AdjustmentTypeButton
              label="調整なし"
              active={participant.adjustmentType === "none"}
              onClick={() => onAdjustmentChange(participant.id, "none", 0)}
            />
            <AdjustmentTypeButton
              label="±円"
              active={participant.adjustmentType === "amount"}
              onClick={() =>
                onAdjustmentChange(
                  participant.id,
                  "amount",
                  participant.adjustmentType === "amount" ? participant.adjustmentValue : 0,
                  participant.adjustmentReason,
                  participant.adjustmentReasonCustom,
                )
              }
            />
            <AdjustmentTypeButton
              label="±%"
              active={participant.adjustmentType === "percent"}
              onClick={() =>
                onAdjustmentChange(
                  participant.id,
                  "percent",
                  participant.adjustmentType === "percent" ? participant.adjustmentValue : 0,
                  participant.adjustmentReason,
                  participant.adjustmentReasonCustom,
                )
              }
            />
          </div>

          {participant.adjustmentType !== "none" && (
            <div class="flex flex-wrap items-center gap-2">
              <AdjustmentValueInput
                value={participant.adjustmentValue}
                onCommit={(v) =>
                  onAdjustmentChange(
                    participant.id,
                    participant.adjustmentType,
                    v,
                    participant.adjustmentReason,
                    participant.adjustmentReasonCustom,
                  )
                }
              />
              <span class="text-sm text-slate-500">
                {participant.adjustmentType === "amount" ? "円" : "%"}
              </span>
              {participant.adjustmentType === "percent" && (
                <div class="flex gap-1">
                  {[-30, -20, -10].map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() =>
                        onAdjustmentChange(
                          participant.id,
                          "percent",
                          v,
                          participant.adjustmentReason,
                          participant.adjustmentReasonCustom,
                        )
                      }
                      class="inline-flex min-h-11 touch-manipulation select-none items-center justify-center rounded-full bg-white px-2.5 text-xs text-slate-500 ring-1 ring-slate-200 active:scale-95"
                    >
                      {v}%
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          <div>
            <label class="text-xs text-slate-500">理由（結果の共有文にも使えます）</label>
            <select
              value={participant.adjustmentReason ?? ""}
              onChange={(e) =>
                onAdjustmentChange(
                  participant.id,
                  participant.adjustmentType,
                  participant.adjustmentValue,
                  ((e.currentTarget as HTMLSelectElement).value || undefined) as AdjustmentReason | undefined,
                  participant.adjustmentReasonCustom,
                )
              }
              class="mt-1 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              aria-label="調整の理由"
            >
              <option value="">選択しない</option>
              {ADJUSTMENT_REASON_ORDER.map((r) => (
                <option key={r} value={r}>
                  {ADJUSTMENT_REASON_LABELS[r]}
                </option>
              ))}
            </select>
            {participant.adjustmentReason === "other" && (
              <input
                type="text"
                placeholder="理由を入力"
                aria-label="理由（自由入力）"
                value={participant.adjustmentReasonCustom ?? ""}
                onInput={(e) =>
                  onAdjustmentChange(
                    participant.id,
                    participant.adjustmentType,
                    participant.adjustmentValue,
                    participant.adjustmentReason,
                    (e.currentTarget as HTMLInputElement).value,
                  )
                }
                class="mt-1.5 w-full rounded-lg border border-slate-200 px-2 py-2 text-sm"
              />
            )}
          </div>
        </div>
      )}
    </li>
  );
}

function AdjustmentTypeButton({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      class={`inline-flex min-h-11 touch-manipulation select-none items-center justify-center rounded-full px-3 text-xs font-semibold transition-transform active:scale-95 ${
        active ? "bg-teal-600 text-white" : "bg-white text-slate-500 ring-1 ring-slate-200"
      }`}
    >
      {label}
    </button>
  );
}

/**
 * ±円・±%の調整値入力。
 * グループ比率のRatioNumberInputと同じく、入力中はローカルのtext stateのみを更新し、
 * blur/Enterで確定した時にだけ親のstateへ反映する（type="number"のまま維持し、
 * iOS純正の数字キーパッドにあるマイナスキーを使えるようにしている）。
 */
function AdjustmentValueInput({ value, onCommit }: { value: number; onCommit: (value: number) => void }) {
  const [text, setText] = useState(() => String(value));

  function commit() {
    const parsed = parseFloat(text);
    if (Number.isFinite(parsed)) {
      const rounded = Math.round(parsed);
      setText(String(rounded));
      if (rounded !== value) onCommit(rounded);
    } else {
      setText(String(value));
    }
  }

  return (
    <input
      type="number"
      enterkeyhint="done"
      value={text}
      onInput={(e) => setText((e.currentTarget as HTMLInputElement).value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLInputElement).blur();
        }
      }}
      class="w-24 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm"
      aria-label="調整値（確定はEnterまたはタップ外し）"
    />
  );
}
