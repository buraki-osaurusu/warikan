import { SERVICE_NAME } from "./branding";
import type { CalculationResult } from "./types";

/**
 * LINE等に貼り付けやすいテキストを生成する。
 * 参加者は必ず1人1行、名前と金額の対応が一目で分かることを最優先し、
 * 説明文・倍率などの内部計算情報は含めない（必要な調整理由のみ金額の横に添える）。
 *
 * 例:
 * 傾斜割り勘の結果
 *
 * Aさん　16,500円
 * Bさん　14,600円
 * Cさん　12,800円
 *
 * 合計　85,490円
 */
export function buildShareText(result: CalculationResult): string {
  const lines: string[] = [];
  lines.push(`${SERVICE_NAME}の結果`);
  lines.push("");

  result.participants.forEach((p) => {
    const note = p.adjustmentLabel ? `（${p.adjustmentLabel}）` : "";
    lines.push(`${p.displayName}　${p.finalAmount.toLocaleString("ja-JP")}円${note}`);
  });

  if (result.leftoverAmount !== 0) {
    lines.push("");
    lines.push(`端数　${result.leftoverAmount.toLocaleString("ja-JP")}円（未割当）`);
  }

  lines.push("");
  lines.push(`合計　${result.totalAmount.toLocaleString("ja-JP")}円`);

  return lines.join("\n");
}
