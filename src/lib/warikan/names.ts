// 参加者の自動命名（Aさん、Bさん…Zさん、AAさん…）
import type { CalculationResult } from "./types";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";

export function autoName(index: number): string {
  // index: 0-based
  let n = index;
  let label = "";
  do {
    label = ALPHABET[n % 26] + label;
    n = Math.floor(n / 26) - 1;
  } while (n >= 0);
  return `${label}さん`;
}

/** 名前未入力の参加者にAさん・Bさん…の自動名を補って表示・共有用にする */
export function withAutoNames(result: CalculationResult): CalculationResult {
  return {
    ...result,
    participants: result.participants.map((p, i) => ({
      ...p,
      displayName: p.displayName.trim() || autoName(i),
    })),
  };
}

let idCounter = 0;

/** 予測可能かつユニークなID（テスト・SSR安全のためcrypto.randomUUIDに依存しない） */
export function createId(prefix: string): string {
  idCounter += 1;
  return `${prefix}-${Date.now().toString(36)}-${idCounter.toString(36)}`;
}
