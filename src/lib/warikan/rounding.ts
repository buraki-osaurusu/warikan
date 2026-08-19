import type { RoundingMode, RoundingUnit } from "./types";

export interface RoundingItemInput {
  id: string;
  /** 丸め前の理論値（円、小数あり） */
  amount: number;
  weight: number;
}

export interface RoundingInput {
  items: RoundingItemInput[];
  totalAmount: number;
  unit: RoundingUnit;
  mode: RoundingMode;
  assignedId: string | null;
}

export interface RoundingItemOutput {
  id: string;
  amount: number;
  /** 単位丸めの端数、または円単位の端数を負担したか */
  tookRoundingBurden: boolean;
}

export interface RoundingOutput {
  items: RoundingItemOutput[];
  /** 誰にも割り当てられなかった端数（円） */
  leftover: number;
  warnings: string[];
}

function roundHalfUp(n: number): number {
  return Math.floor(n + 0.5);
}

export function applyRounding(input: RoundingInput): RoundingOutput {
  const { items, totalAmount, unit, mode } = input;
  const warnings: string[] = [];

  if (items.length === 0) {
    return { items: [], leftover: 0, warnings };
  }

  if (mode === "leaveRemainder") {
    const rounded = items.map((it) => ({
      id: it.id,
      amount: roundHalfUp(it.amount / unit) * unit,
      tookRoundingBurden: false,
    }));
    const sum = rounded.reduce((a, r) => a + r.amount, 0);
    const leftover = totalAmount - sum;
    if (Math.abs(leftover) >= 1) {
      warnings.push(
        `${unit.toLocaleString("ja-JP")}円単位に丸めたため、${leftover.toLocaleString("ja-JP")}円の端数が残っています（誰にも割り当てていません）。`,
      );
    }
    return { items: rounded, leftover, warnings };
  }

  // A〜D: 最終的に合計が totalAmount と一致するように配分する
  // 浮動小数点誤差が境界値（ちょうど整数倍など）でfloorを誤らせないよう微小な補正を入れる
  const EPS = 1e-9;
  const totalUnits = Math.floor(totalAmount / unit + EPS);
  const trueRemainder = totalAmount - totalUnits * unit; // 0 <= trueRemainder < unit

  const unitsFloat = items.map((it) => it.amount / unit);
  const unitsFloor = unitsFloat.map((u) => Math.floor(u + EPS));
  const remainders = unitsFloat.map((u, i) => u - unitsFloor[i]);
  const sumFloor = unitsFloor.reduce((a, b) => a + b, 0);
  const unitsToDistribute = Math.max(0, totalUnits - sumFloor);

  const assignedUnits = items.map(() => 0);
  const burdened = items.map(() => false);

  if (mode === "smart") {
    const order = items
      .map((_, i) => i)
      .sort((a, b) => {
        if (remainders[b] !== remainders[a]) return remainders[b] - remainders[a];
        return items[b].weight - items[a].weight;
      });
    for (let k = 0; k < unitsToDistribute; k++) {
      const idx = order[k % order.length];
      assignedUnits[idx] += 1;
      burdened[idx] = true;
    }
  } else if (mode === "highPayer") {
    const order = items
      .map((_, i) => i)
      .sort((a, b) => items[b].amount - items[a].amount);
    for (let k = 0; k < unitsToDistribute; k++) {
      const idx = order[k % order.length];
      assignedUnits[idx] += 1;
      burdened[idx] = true;
    }
  } else if (mode === "assigned") {
    let idx = items.findIndex((it) => it.id === input.assignedId);
    if (idx === -1) {
      warnings.push("端数を負担する参加者が指定されていないため、支払額が最も多い人に端数を割り当てました。");
      idx = items
        .map((_, i) => i)
        .sort((a, b) => items[b].amount - items[a].amount)[0];
    }
    assignedUnits[idx] += unitsToDistribute;
    if (unitsToDistribute > 0) burdened[idx] = true;
  } else {
    // distribute: 全員にできるだけ均等にラウンドロビンで配分
    const order = items.map((_, i) => i);
    for (let k = 0; k < unitsToDistribute; k++) {
      const idx = order[k % order.length];
      assignedUnits[idx] += 1;
      burdened[idx] = true;
    }
  }

  const roundedItems = items.map((it, i) => ({
    id: it.id,
    amount: (unitsFloor[i] + assignedUnits[i]) * unit,
    tookRoundingBurden: burdened[i],
  }));

  // 1円単位の端数（unit未満）は、単位丸めの負担者と同じ人に寄せる
  if (trueRemainder > 0) {
    let bearerIdx = 0;
    if (mode === "assigned") {
      const idx = items.findIndex((it) => it.id === input.assignedId);
      bearerIdx = idx !== -1 ? idx : 0;
    } else if (mode === "highPayer") {
      bearerIdx = items
        .map((_, i) => i)
        .sort((a, b) => items[b].amount - items[a].amount)[0];
    } else {
      // smart / distribute: 単位を受け取った人の中で最も端数が大きかった人、いなければ重み最大の人
      const withUnit = items.map((_, i) => i).filter((i) => assignedUnits[i] > 0);
      if (withUnit.length > 0) {
        bearerIdx = withUnit.sort((a, b) => remainders[b] - remainders[a])[0];
      } else {
        bearerIdx = items.map((_, i) => i).sort((a, b) => items[b].weight - items[a].weight)[0];
      }
    }
    roundedItems[bearerIdx].amount += trueRemainder;
    roundedItems[bearerIdx].tookRoundingBurden = true;
    warnings.push(
      `会計金額が${unit.toLocaleString("ja-JP")}円単位で割り切れないため、${trueRemainder.toLocaleString("ja-JP")}円分は1人だけ1円単位の金額になっています。`,
    );
  }

  const sum = roundedItems.reduce((a, r) => a + r.amount, 0);
  return { items: roundedItems, leftover: totalAmount - sum, warnings };
}
