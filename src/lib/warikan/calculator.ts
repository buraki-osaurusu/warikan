import { reasonLabel } from "./reasons";
import { applyRounding } from "./rounding";
import type { CalculationResult, ParticipantResult, WarikanState } from "./types";

/**
 * 重みに応じて金額を按分する。丸め誤差を最後の要素に寄せることで、
 * 合計が必ずtotalと厳密に一致する（浮動小数点の実数レベルで）ようにする。
 */
function allocateByWeight(total: number, weights: number[]): number[] {
  const sumWeight = weights.reduce((a, b) => a + b, 0);
  if (weights.length === 0) return [];
  if (sumWeight <= 0) {
    // 全員の重みが0以下（ありえないが安全策）：均等割り
    const even = total / weights.length;
    const result = weights.map(() => even);
    result[result.length - 1] = total - even * (weights.length - 1);
    return result;
  }
  const result = weights.map((w) => (total * w) / sumWeight);
  const sumSoFar = result.slice(0, -1).reduce((a, b) => a + b, 0);
  result[result.length - 1] = total - sumSoFar;
  return result;
}

export function calculate(state: WarikanState): CalculationResult {
  const warnings: string[] = [];
  const groupById = new Map(state.groups.map((g) => [g.id, g]));
  const participants = state.participants;

  if (participants.length === 0 || state.totalAmount <= 0) {
    return {
      totalAmount: state.totalAmount,
      participants: [],
      roundedSum: 0,
      leftoverAmount: 0,
      isBalanced: true,
      warnings,
    };
  }

  const weights = participants.map((p) => {
    const g = groupById.get(p.groupId);
    if (!g) {
      warnings.push(`参加者「${p.name || "未設定"}」の所属グループが見つかりません。比率1.0として計算しました。`);
      return 1;
    }
    return Math.max(0, g.ratio);
  });

  // STEP1: 傾斜比率による基本按分（個別調整なしの理論値）
  const fairShares = allocateByWeight(state.totalAmount, weights);

  // STEP2: 個別調整（金額・割合）を適用。調整対象者は指定どおりの金額に固定する
  const adjustedTarget: (number | null)[] = participants.map(() => null);
  participants.forEach((p, i) => {
    if (p.adjustmentType === "amount" && p.adjustmentValue !== 0) {
      adjustedTarget[i] = Math.max(0, fairShares[i] + p.adjustmentValue);
    } else if (p.adjustmentType === "percent" && p.adjustmentValue !== 0) {
      adjustedTarget[i] = Math.max(0, fairShares[i] * (1 + p.adjustmentValue / 100));
    }
  });

  const adjustedIndexes = participants
    .map((_, i) => i)
    .filter((i) => adjustedTarget[i] !== null);
  const freeIndexes = participants.map((_, i) => i).filter((i) => adjustedTarget[i] === null);

  const exactAmounts = new Array<number>(participants.length).fill(0);
  const adjustedSumRaw = adjustedIndexes.reduce((a, i) => a + (adjustedTarget[i] as number), 0);

  if (adjustedIndexes.length > 0 && adjustedSumRaw > state.totalAmount + 1e-9) {
    // 個別調整（各自0円未満にはならない）の合計だけで会計金額を超えてしまうケース。
    // このまま「残り」を自由枠に配分すると自由枠がマイナスになってしまうため、
    // 誰にも会計金額を超える金額・マイナスの金額を割り当てないよう、調整額を比率どおりに縮小する。
    // 調整のない参加者（自由枠）は0円になる。
    warnings.push(
      "個別調整の合計が会計金額を超えているため、調整額を比率どおりに縮小して計算しました。",
    );
    const scale = state.totalAmount / adjustedSumRaw;
    adjustedIndexes.forEach((i) => {
      exactAmounts[i] = (adjustedTarget[i] as number) * scale;
    });
    // freeIndexesは0のまま
  } else {
    adjustedIndexes.forEach((i) => {
      exactAmounts[i] = adjustedTarget[i] as number;
    });

    const remaining = state.totalAmount - adjustedSumRaw;

    if (freeIndexes.length > 0) {
      const freeWeights = freeIndexes.map((i) => weights[i]);
      const freeShares = allocateByWeight(remaining, freeWeights);
      freeIndexes.forEach((i, k) => {
        exactAmounts[i] = freeShares[k];
      });
    } else if (adjustedIndexes.length > 0 && Math.abs(remaining) > 1e-9) {
      // 全員が個別調整済み：再配分先がないため、わずかな差額を比重の大きい参加者に寄せて帳尻を合わせる
      warnings.push(
        "全員に個別調整が設定されているため、端数の再配分先がありません。差額は比重が最も大きい参加者に加算しました。",
      );
      let maxIdx = adjustedIndexes[0];
      adjustedIndexes.forEach((i) => {
        if (weights[i] > weights[maxIdx]) maxIdx = i;
      });
      exactAmounts[maxIdx] = Math.max(0, exactAmounts[maxIdx] + remaining);
    }
  }

  // 負の値を0にクランプした際の安全策：実際の合計とtotalAmountがズレていれば最終補正する
  const actualSum = exactAmounts.reduce((a, b) => a + b, 0);
  const safetyDiff = state.totalAmount - actualSum;
  if (Math.abs(safetyDiff) > 1e-9) {
    // 自由枠があればそちらへ、なければ最大重みの参加者へ寄せる
    const target = freeIndexes.length > 0
      ? freeIndexes.reduce((best, i) => (weights[i] > weights[best] ? i : best), freeIndexes[0])
      : participants.reduce((best, _, i) => (weights[i] > weights[best] ? i : best), 0);
    exactAmounts[target] = Math.max(0, exactAmounts[target] + safetyDiff);
  }

  // STEP3: 端数処理
  const roundingInput = participants.map((p, i) => ({ id: p.id, amount: exactAmounts[i], weight: weights[i] }));
  const rounded = applyRounding({
    items: roundingInput,
    totalAmount: state.totalAmount,
    unit: state.roundingUnit,
    mode: state.roundingMode,
    assignedId: state.assignedParticipantId,
  });
  warnings.push(...rounded.warnings);

  const finalById = new Map(rounded.items.map((r) => [r.id, r]));

  const results: ParticipantResult[] = participants.map((p, i) => {
    const g = groupById.get(p.groupId);
    const roundedItem = finalById.get(p.id);
    const label = reasonLabel(p.adjustmentReason, p.adjustmentReasonCustom);
    let adjustmentLabel: string | null = null;
    if (p.adjustmentType === "amount" && p.adjustmentValue !== 0) {
      const sign = p.adjustmentValue > 0 ? "+" : "";
      adjustmentLabel = `${label ? label + " " : ""}${sign}${p.adjustmentValue.toLocaleString("ja-JP")}円`;
    } else if (p.adjustmentType === "percent" && p.adjustmentValue !== 0) {
      const sign = p.adjustmentValue > 0 ? "+" : "";
      adjustmentLabel = `${label ? label + " " : ""}${sign}${p.adjustmentValue}%`;
    } else if (label) {
      adjustmentLabel = label;
    }

    return {
      participantId: p.id,
      displayName: p.name.trim(),
      groupName: g ? g.name : "未所属",
      exactAmount: exactAmounts[i],
      finalAmount: roundedItem ? roundedItem.amount : Math.round(exactAmounts[i]),
      adjustmentLabel,
      isRoundingBearer: roundedItem ? roundedItem.tookRoundingBurden : false,
    };
  });

  const roundedSum = results.reduce((a, r) => a + r.finalAmount, 0);

  return {
    totalAmount: state.totalAmount,
    participants: results,
    roundedSum,
    leftoverAmount: rounded.leftover,
    isBalanced: Math.abs(roundedSum + rounded.leftover - state.totalAmount) < 1e-9,
    warnings,
  };
}
