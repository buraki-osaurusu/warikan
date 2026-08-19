import { describe, expect, it } from "vitest";
import { calculate } from "./calculator";
import type { Participant, PaymentGroup, WarikanState } from "./types";

function group(id: string, name: string, ratio: number): PaymentGroup {
  return { id, name, ratio };
}

function participant(
  id: string,
  name: string,
  groupId: string,
  overrides: Partial<Participant> = {},
): Participant {
  return {
    id,
    name,
    groupId,
    adjustmentType: "none",
    adjustmentValue: 0,
    ...overrides,
  };
}

function baseState(overrides: Partial<WarikanState>): WarikanState {
  return {
    totalAmount: 0,
    groups: [],
    participants: [],
    roundingUnit: 100,
    roundingMode: "smart",
    assignedParticipantId: null,
    ...overrides,
  };
}

function sumFinal(result: ReturnType<typeof calculate>): number {
  return result.participants.reduce((a, p) => a + p.finalAmount, 0) + result.leftoverAmount;
}

describe("均等割り", () => {
  it("2人・割り切れる金額", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 2000,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g1")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(result.participants.map((p) => p.finalAmount)).toEqual([1000, 1000]);
    expect(sumFinal(result)).toBe(2000);
  });

  it("3人・割り切れない金額(100円単位)", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 10000,
      groups: g,
      participants: [
        participant("p1", "A", "g1"),
        participant("p2", "B", "g1"),
        participant("p3", "C", "g1"),
      ],
      roundingUnit: 100,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(10000);
    expect(result.isBalanced).toBe(true);
    result.participants.forEach((p) => expect(p.finalAmount % 100).toBe(0));
  });

  it("10人以上の均等割り", () => {
    const g = [group("g1", "普通", 1.0)];
    const participants = Array.from({ length: 13 }, (_, i) => participant(`p${i}`, `P${i}`, "g1"));
    const state = baseState({ totalAmount: 32800, groups: g, participants, roundingUnit: 100 });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(32800);
  });
});

describe("傾斜比率", () => {
  it("全員同じ傾斜は均等割りと一致する", () => {
    const g = [group("g1", "A班", 1.5), group("g2", "B班", 1.5)];
    const state = baseState({
      totalAmount: 9000,
      groups: g,
      participants: [
        participant("p1", "A", "g1"),
        participant("p2", "B", "g1"),
        participant("p3", "C", "g2"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(result.participants.map((p) => p.finalAmount)).toEqual([3000, 3000, 3000]);
  });

  it("全員違う傾斜が比率どおりに按分される", () => {
    const g = [group("g1", "多め", 2.0), group("g2", "普通", 1.0), group("g3", "少なめ", 0.5)];
    const state = baseState({
      totalAmount: 3500,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g2"), participant("p3", "C", "g3")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    // 比率 2:1:0.5 = 4:2:1、合計3500を7分割 -> 500ずつ -> 2000:1000:500
    expect(result.participants.map((p) => p.finalAmount)).toEqual([2000, 1000, 500]);
    expect(sumFinal(result)).toBe(3500);
  });

  it("OBや5年・6年などのグループを追加しても計算できる", () => {
    const g = [
      group("ob", "OB", 1.6),
      group("g6", "6年生", 1.5),
      group("g5", "5年生", 1.4),
      group("g4", "4年生", 1.3),
      group("g1", "1年生", 0.8),
    ];
    const state = baseState({
      totalAmount: 33000,
      groups: g,
      participants: [
        participant("p1", "先輩", "ob"),
        participant("p2", "6年", "g6"),
        participant("p3", "5年", "g5"),
        participant("p4", "4年", "g4"),
        participant("p5", "1年", "g1"),
      ],
      roundingUnit: 100,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(33000);
  });

  it("カスタムグループ名・比率変更後も正しく計算される", () => {
    const g = [group("g1", "自由入力グループ", 3)];
    const state = baseState({
      totalAmount: 1000,
      groups: g,
      participants: [participant("p1", "A", "g1")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(result.participants[0].finalAmount).toBe(1000);
    expect(result.participants[0].groupName).toBe("自由入力グループ");
  });
});

describe("個別の金額調整", () => {
  it("1人だけ多め・少なめでも合計が一致する", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 10000,
      groups: g,
      participants: [
        participant("p1", "A", "g1", { adjustmentType: "amount", adjustmentValue: -1000, adjustmentReason: "driver" }),
        participant("p2", "B", "g1"),
        participant("p3", "C", "g1"),
        participant("p4", "D", "g1", { adjustmentType: "amount", adjustmentValue: 500 }),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    const a = result.participants.find((p) => p.participantId === "p1")!;
    const d = result.participants.find((p) => p.participantId === "p4")!;
    expect(sumFinal(result)).toBe(10000);
    // 調整分がベース(2500)から正確に反映されている
    expect(a.finalAmount).toBe(2500 - 1000);
    expect(d.finalAmount).toBe(2500 + 500);
  });

  it("調整額が負の値になる場合は0円にクランプされ、合計は維持される", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 3000,
      groups: g,
      participants: [
        participant("p1", "主役", "g1", { adjustmentType: "amount", adjustmentValue: -5000, adjustmentReason: "birthday" }),
        participant("p2", "B", "g1"),
        participant("p3", "C", "g1"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    const main = result.participants.find((p) => p.participantId === "p1")!;
    expect(main.finalAmount).toBe(0);
    expect(sumFinal(result)).toBe(3000);
  });
});

describe("割合による個別調整", () => {
  it("-20%調整が正しく反映され合計が一致する", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 10000,
      groups: g,
      participants: [
        participant("p1", "途中参加", "g1", { adjustmentType: "percent", adjustmentValue: -20, adjustmentReason: "lateArrival" }),
        participant("p2", "B", "g1"),
        participant("p3", "C", "g1"),
        participant("p4", "D", "g1"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    const p1 = result.participants.find((p) => p.participantId === "p1")!;
    // ベース2500の-20% = 2000
    expect(p1.finalAmount).toBe(2000);
    expect(sumFinal(result)).toBe(10000);
  });
});

describe("端数処理単位", () => {
  const g = [group("g1", "普通", 1.0)];
  const units = [1, 10, 100, 500, 1000] as const;

  units.forEach((unit) => {
    it(`${unit}円単位で合計が一致する`, () => {
      const state = baseState({
        totalAmount: 23728,
        groups: g,
        participants: [
          participant("p1", "A", "g1"),
          participant("p2", "B", "g1"),
          participant("p3", "C", "g1"),
        ],
        roundingUnit: unit,
        roundingMode: "smart",
      });
      const result = calculate(state);
      expect(sumFinal(result)).toBe(23728);
      result.participants.forEach((p) => {
        // 端数負担者以外はunitの倍数のはず。合計整合性だけを厳密に見る
        expect(Number.isInteger(p.finalAmount)).toBe(true);
      });
    });
  });
});

describe("端数処理モード", () => {
  const g = [
    group("g1", "多め", 1.5),
    group("g2", "普通", 1.0),
    group("g3", "少なめ", 0.5),
  ];
  const participants = [
    participant("p1", "A", "g1"),
    participant("p2", "B", "g2"),
    participant("p3", "C", "g3"),
  ];

  it("おまかせ(smart)は合計が一致する", () => {
    const state = baseState({ totalAmount: 23728, groups: g, participants, roundingUnit: 100, roundingMode: "smart" });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(23728);
  });

  it("多く払う人から負担(highPayer)は最高額の人が端数を持つ", () => {
    const state = baseState({ totalAmount: 10050, groups: g, participants, roundingUnit: 100, roundingMode: "highPayer" });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(10050);
    const sorted = [...result.participants].sort((a, b) => b.exactAmount - a.exactAmount);
    expect(sorted[0].isRoundingBearer || result.participants.some((p) => p.isRoundingBearer)).toBe(true);
  });

  it("指定した人が負担(assigned)は指定参加者にのみ端数がのる", () => {
    const state = baseState({
      totalAmount: 10050,
      groups: g,
      participants,
      roundingUnit: 100,
      roundingMode: "assigned",
      assignedParticipantId: "p2",
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(10050);
    const p2 = result.participants.find((p) => p.participantId === "p2")!;
    expect(p2.isRoundingBearer).toBe(true);
  });

  it("みんなで調整(distribute)は合計が一致する", () => {
    const many = Array.from({ length: 11 }, (_, i) => participant(`p${i}`, `P${i}`, "g2"));
    const state = baseState({ totalAmount: 10073, groups: g, participants: many, roundingUnit: 100, roundingMode: "distribute" });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(10073);
  });

  it("端数として残す(leaveRemainder)は端数を別枠に表示し、合計は保たれる", () => {
    const state = baseState({ totalAmount: 23728, groups: g, participants, roundingUnit: 100, roundingMode: "leaveRemainder" });
    const result = calculate(state);
    expect(result.leftoverAmount).not.toBe(0);
    expect(sumFinal(result)).toBe(23728);
    result.participants.forEach((p) => expect(p.finalAmount % 100).toBe(0));
  });
});

describe("境界値・特殊ケース", () => {
  it("0円は空の結果を返す", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({ totalAmount: 0, groups: g, participants: [participant("p1", "A", "g1")] });
    const result = calculate(state);
    expect(result.participants).toEqual([]);
  });

  it("非常に大きい金額でも合計が一致する", () => {
    const g = [group("g1", "普通", 1.0), group("g2", "多め", 1.3)];
    const state = baseState({
      totalAmount: 12345678,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g2"), participant("p3", "C", "g1")],
      roundingUnit: 100,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(12345678);
  });

  it("名前未入力の参加者は空文字のまま返す(表示側でauto-nameを補う想定)", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 1000,
      groups: g,
      participants: [participant("p1", "", "g1"), participant("p2", "", "g1")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(result.participants[0].displayName).toBe("");
    expect(sumFinal(result)).toBe(1000);
  });

  it("人数変更（参加者を減らす）後も整合する", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 5000,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g1")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(5000);
    expect(result.participants).toHaveLength(2);
  });
});

describe("個別調整の合計が会計金額を超えるケース（公開前監査で発見・修正）", () => {
  it("1人への+調整が会計金額を超える場合、他の参加者がマイナスにならず、合計も超過しない", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 1000,
      groups: g,
      participants: [
        participant("p1", "A", "g1", { adjustmentType: "amount", adjustmentValue: 5000 }),
        participant("p2", "B", "g1"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);

    result.participants.forEach((p) => {
      expect(p.finalAmount).toBeGreaterThanOrEqual(0);
      expect(p.finalAmount).toBeLessThanOrEqual(state.totalAmount);
    });
    expect(sumFinal(result)).toBe(1000);
    expect(result.warnings.some((w) => w.includes("会計金額を超えている"))).toBe(true);
  });

  it("複数人の＋調整合計が会計金額を超える場合でも、全員0円以上・合計金額以下で合計が一致する", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 3000,
      groups: g,
      participants: [
        participant("p1", "A", "g1", { adjustmentType: "amount", adjustmentValue: 4000 }),
        participant("p2", "B", "g1", { adjustmentType: "amount", adjustmentValue: 4000 }),
        participant("p3", "C", "g1"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);

    result.participants.forEach((p) => {
      expect(p.finalAmount).toBeGreaterThanOrEqual(0);
      expect(p.finalAmount).toBeLessThanOrEqual(state.totalAmount);
    });
    expect(sumFinal(result)).toBe(3000);
  });

  it("全員に調整があり合計が会計金額を超える場合も、全員0円以上・合計が一致する", () => {
    const g = [group("g1", "普通", 1.0)];
    const state = baseState({
      totalAmount: 1000,
      groups: g,
      participants: [
        participant("p1", "A", "g1", { adjustmentType: "amount", adjustmentValue: 2000 }),
        participant("p2", "B", "g1", { adjustmentType: "amount", adjustmentValue: 2000 }),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);

    result.participants.forEach((p) => expect(p.finalAmount).toBeGreaterThanOrEqual(0));
    expect(sumFinal(result)).toBe(1000);
  });
});

describe("追加の境界値（公開前監査）", () => {
  const g = [group("g1", "普通", 1.0)];

  it.each([0, 1, 99, 101, 999])("合計金額%i円でもクラッシュせず、合計が一致する", (amount) => {
    const state = baseState({
      totalAmount: amount,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g1"), participant("p3", "C", "g1")],
      roundingUnit: 100,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(amount);
    result.participants.forEach((p) => {
      expect(Number.isFinite(p.finalAmount)).toBe(true);
      expect(p.finalAmount).toBeGreaterThanOrEqual(0);
    });
  });

  it("20人でも正しく計算できる", () => {
    const participants = Array.from({ length: 20 }, (_, i) => participant(`p${i}`, `P${i}`, "g1"));
    const state = baseState({ totalAmount: 87650, groups: g, participants, roundingUnit: 100 });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(87650);
    expect(result.participants).toHaveLength(20);
  });

  it("同じ名前の参加者が複数いても金額はそれぞれ独立して計算される", () => {
    const state = baseState({
      totalAmount: 3000,
      groups: g,
      participants: [
        participant("p1", "たろう", "g1", { adjustmentType: "amount", adjustmentValue: -500 }),
        participant("p2", "たろう", "g1"),
        participant("p3", "たろう", "g1"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(3000);
    expect(result.participants[0].finalAmount).not.toBe(result.participants[1].finalAmount);
  });

  it("倍率0のグループ（誕生日会の主役など）は0円になり、他の参加者で合計を負担する", () => {
    const groups = [group("main", "主役", 0), group("guest", "参加者", 1.0)];
    const state = baseState({
      totalAmount: 3000,
      groups,
      participants: [
        participant("p1", "主役", "main"),
        participant("p2", "A", "guest"),
        participant("p3", "B", "guest"),
      ],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(result.participants[0].finalAmount).toBe(0);
    expect(sumFinal(result)).toBe(3000);
  });

  it("全員の倍率が0（極端なケース）でもcrashせず均等割りにフォールバックする", () => {
    const groups = [group("g0", "全員0倍", 0)];
    const state = baseState({
      totalAmount: 3000,
      groups,
      participants: [participant("p1", "A", "g0"), participant("p2", "B", "g0"), participant("p3", "C", "g0")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(3000);
    result.participants.forEach((p) => expect(Number.isFinite(p.finalAmount)).toBe(true));
  });

  it("極端に大きい倍率と極端に小さい倍率が混在してもクラッシュしない", () => {
    const groups = [group("high", "極端に多め", 1000), group("low", "極端に少なめ", 0.01)];
    const state = baseState({
      totalAmount: 10000,
      groups,
      participants: [participant("p1", "A", "high"), participant("p2", "B", "low")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(10000);
    result.participants.forEach((p) => {
      expect(Number.isFinite(p.finalAmount)).toBe(true);
      expect(p.finalAmount).toBeGreaterThanOrEqual(0);
    });
  });

  it("全員が同じグループでも正しく均等割りになる", () => {
    const state = baseState({
      totalAmount: 9999,
      groups: g,
      participants: [participant("p1", "A", "g1"), participant("p2", "B", "g1"), participant("p3", "C", "g1")],
      roundingUnit: 1,
    });
    const result = calculate(state);
    expect(sumFinal(result)).toBe(9999);
  });

  it("参加者が1人だけでも正しく計算できる（合計をその1人が全額負担）", () => {
    const state = baseState({
      totalAmount: 5000,
      groups: g,
      participants: [participant("p1", "A", "g1")],
      roundingUnit: 100,
    });
    const result = calculate(state);
    expect(result.participants[0].finalAmount).toBe(5000);
  });
});
