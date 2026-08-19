import { formatYen } from "../../lib/warikan/format";
import { withAutoNames } from "../../lib/warikan/names";
import type { CalculationResult } from "../../lib/warikan/types";

interface Props {
  result: CalculationResult;
}

export default function ResultView({ result: rawResult }: Props) {
  if (rawResult.participants.length === 0) {
    return (
      <section class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-400">
        合計金額と参加者を入力すると、ここに結果が表示されます。
      </section>
    );
  }

  const result = withAutoNames(rawResult);

  return (
    <section class="rounded-2xl border-2 border-teal-500 bg-white p-3.5 shadow-md">
      <div class="flex items-baseline justify-between">
        <h2 class="text-sm font-bold text-teal-700">計算結果</h2>
        <span class="text-xs text-slate-400">お会計 {formatYen(result.totalAmount)}</span>
      </div>

      <ul class="mt-2 divide-y divide-slate-100">
        {result.participants.map((p) => (
          <li key={p.participantId} class="flex items-center justify-between py-2.5">
            <div class="min-w-0">
              <p class="truncate text-base font-bold text-slate-900">{p.displayName}</p>
              <p class="truncate text-xs text-slate-400">
                {p.groupName}
                {p.adjustmentLabel ? `・${p.adjustmentLabel}` : ""}
                {p.isRoundingBearer ? "・端数負担" : ""}
              </p>
            </div>
            <p class="shrink-0 pl-2 text-xl font-extrabold text-slate-900">{formatYen(p.finalAmount)}</p>
          </li>
        ))}
      </ul>

      <div class="mt-1 flex items-center justify-between rounded-xl bg-teal-50 px-3 py-2.5">
        <span class="text-sm font-bold text-teal-800">合計</span>
        <span class="flex items-center gap-1.5 text-lg font-extrabold text-teal-800">
          {formatYen(result.roundedSum)}
          {result.isBalanced && <span aria-label="会計金額と一致">✓</span>}
        </span>
      </div>

      {result.leftoverAmount !== 0 && (
        <p class="mt-1.5 text-xs text-amber-600">
          未割当の端数：{formatYen(result.leftoverAmount)}（誰にも割り当てられていません）
        </p>
      )}

      {result.warnings.length > 0 && (
        <ul class="mt-1.5 space-y-1">
          {result.warnings.map((w, i) => (
            <li key={i} class="rounded-lg bg-amber-50 px-2.5 py-1.5 text-xs text-amber-700">
              {w}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
