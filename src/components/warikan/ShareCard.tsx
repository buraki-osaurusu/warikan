import { useState } from "preact/hooks";
import { copyToClipboard } from "../../lib/warikan/clipboard";
import { withAutoNames } from "../../lib/warikan/names";
import { buildShareText } from "../../lib/warikan/share";
import type { CalculationResult } from "../../lib/warikan/types";

interface Props {
  result: CalculationResult;
}

export default function ShareCard({ result: rawResult }: Props) {
  const [copied, setCopied] = useState(false);
  const canShare = typeof navigator !== "undefined" && !!(navigator as any).share;

  if (rawResult.participants.length === 0) return null;

  const result = withAutoNames(rawResult);

  async function handleCopy() {
    const text = buildShareText(result);
    const ok = await copyToClipboard(text);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else {
      // 通常は発生しない最終手段のフォールバック（クリップボードAPI・execCommandどちらも失敗した場合のみ）
      window.prompt("コピーできませんでした。以下を選択してコピーしてください", text);
    }
  }

  async function handleShare() {
    const text = buildShareText(result);
    try {
      await (navigator as any).share({ text });
    } catch {
      // ユーザーがキャンセルした場合等は何もしない
    }
  }

  return (
    <section class="flex gap-2">
      <button
        type="button"
        onClick={handleCopy}
        class="min-h-11 flex-1 touch-manipulation select-none rounded-xl bg-teal-600 py-3.5 text-sm font-bold text-white active:bg-teal-700"
      >
        {copied ? "コピーしました！" : "結果をコピー"}
      </button>
      {canShare && (
        <button
          type="button"
          onClick={handleShare}
          class="min-h-11 touch-manipulation select-none rounded-xl bg-slate-100 px-4 py-3.5 text-sm font-bold text-slate-600 active:bg-slate-200"
        >
          共有
        </button>
      )}
    </section>
  );
}
