import { useState } from "preact/hooks";
import { RATIO_PRESETS, nearestRatioLabel } from "../../lib/warikan/templates";
import type { PaymentGroup } from "../../lib/warikan/types";

interface Props {
  groups: PaymentGroup[];
  onRename: (groupId: string, name: string) => void;
  onRatioChange: (groupId: string, ratio: number) => void;
  onRemove: (groupId: string) => void;
  onAdd: () => void;
}

export default function GroupEditor({ groups, onRename, onRatioChange, onRemove, onAdd }: Props) {
  const [detailed, setDetailed] = useState(false);

  return (
    <section class="rounded-2xl border border-slate-200 bg-white p-3.5 shadow-sm">
      <div class="flex items-center justify-between">
        <h2 class="text-sm font-semibold text-slate-500">支払いグループ</h2>
        <button
          type="button"
          onClick={() => setDetailed((v) => !v)}
          aria-pressed={detailed}
          class="touch-manipulation select-none py-1 text-xs font-semibold text-teal-700"
        >
          {detailed ? "かんたんに戻す" : "数値で細かく設定"}
        </button>
      </div>

      <ul class="mt-2 space-y-1">
        {groups.map((g) => (
          <GroupRow
            key={g.id}
            group={g}
            detailed={detailed}
            canRemove={groups.length > 1}
            onRename={onRename}
            onRatioChange={onRatioChange}
            onRemove={onRemove}
          />
        ))}
      </ul>

      <button
        type="button"
        onClick={onAdd}
        class="mt-2.5 w-full touch-manipulation select-none rounded-xl border-2 border-dashed border-teal-300 bg-teal-50 py-3 text-sm font-bold text-teal-700 active:bg-teal-100"
      >
        ＋ 学年・役職・グループを追加
      </button>
      <p class="mt-1.5 text-center text-[11px] text-slate-400">
        OB・OG・5年生・院生など自由に追加・名前変更・削除できます。表示順は追加した順番のまま変わりません
      </p>
    </section>
  );
}

interface GroupRowProps {
  group: PaymentGroup;
  detailed: boolean;
  canRemove: boolean;
  onRename: (groupId: string, name: string) => void;
  onRatioChange: (groupId: string, ratio: number) => void;
  onRemove: (groupId: string) => void;
}

/**
 * 1グループ＝1行のコンパクト表示を基本とし、
 * 「かんたん設定」の傾斜プリセット（多め/やや多め/…）はラベルをタップしたときだけ展開する。
 * これにより、グループ数が多くても「支払いグループ」全体の縦スクロール量を抑えている。
 * 「数値で細かく設定」モードでは元々1行に収まる数値入力なので、展開の必要はない。
 */
function GroupRow({ group, detailed, canRemove, onRename, onRatioChange, onRemove }: GroupRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <li class="rounded-xl border border-slate-200 p-2">
      <div class="flex items-center gap-1.5">
        <input
          type="text"
          value={group.name}
          onInput={(e) => onRename(group.id, (e.currentTarget as HTMLInputElement).value)}
          class="min-w-0 flex-1 rounded-lg border border-slate-200 px-2.5 py-2 text-sm font-medium"
          aria-label="グループ名"
        />

        {detailed ? (
          <RatioNumberInput value={group.ratio} onCommit={(ratio) => onRatioChange(group.id, ratio)} />
        ) : (
          <button
            type="button"
            onClick={() => setPickerOpen((v) => !v)}
            aria-expanded={pickerOpen}
            class="inline-flex min-h-11 shrink-0 touch-manipulation select-none items-center justify-center gap-0.5 whitespace-nowrap rounded-full bg-slate-100 px-2.5 text-xs font-semibold text-slate-600 active:bg-slate-200"
          >
            {nearestRatioLabel(group.ratio)}
            <span class="text-slate-400">{pickerOpen ? "▴" : "▾"}</span>
          </button>
        )}

        <button
          type="button"
          onClick={() => onRemove(group.id)}
          disabled={!canRemove}
          aria-label={`${group.name || "グループ"}を削除`}
          class="ml-1 flex min-h-11 shrink-0 touch-manipulation select-none items-center justify-center rounded-lg border-l border-slate-200 pl-3 pr-1.5 text-xs text-slate-400 active:text-rose-600 disabled:opacity-20"
        >
          削除
        </button>
      </div>

      {!detailed && pickerOpen && (
        <div class="mt-1.5 flex flex-wrap items-center gap-1">
          {RATIO_PRESETS.map((preset) => {
            const active = nearestRatioLabel(group.ratio) === preset.name;
            return (
              <button
                key={preset.name}
                type="button"
                onClick={() => {
                  onRatioChange(group.id, preset.ratio);
                  setPickerOpen(false);
                }}
                aria-pressed={active}
                class={`inline-flex min-h-11 touch-manipulation select-none items-center justify-center rounded-full px-3 text-xs transition-transform active:scale-95 ${
                  active ? "bg-teal-600 text-white" : "bg-slate-50 text-slate-400 ring-1 ring-slate-200"
                }`}
              >
                {preset.name}
              </button>
            );
          })}
        </div>
      )}
    </li>
  );
}

interface RatioNumberInputProps {
  value: number;
  onCommit: (ratio: number) => void;
}

/**
 * 「入力中の文字列」と「計算に使う確定済み倍率」を分離した数値入力。
 * - 入力中はstate更新（=グローバルな再計算）を一切行わず、ローカルのtext stateのみ更新する
 *   （空欄・"1."・"1"などの未確定な途中状態をそのまま許容するため）
 * - blur / Enter で初めて確定し、有効な数値ならonCommitで親へ反映する
 * - 無効な入力（空欄など）で確定した場合は、直前の確定値に表示を戻す
 */
function RatioNumberInput({ value, onCommit }: RatioNumberInputProps) {
  const [text, setText] = useState(() => String(value));

  function commit() {
    const parsed = parseFloat(text);
    if (Number.isFinite(parsed) && parsed >= 0) {
      const rounded = Math.round(parsed * 100) / 100;
      setText(String(rounded));
      if (rounded !== value) onCommit(rounded);
    } else {
      setText(String(value));
    }
  }

  return (
    <input
      type="text"
      inputmode="decimal"
      autocomplete="off"
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
      class="w-16 shrink-0 rounded-lg border border-slate-200 px-2 py-2 text-right text-sm font-semibold"
      aria-label="傾斜比率（数値、確定はEnterまたはタップ外し）"
    />
  );
}
