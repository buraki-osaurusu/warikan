import { describe, expect, it } from "vitest";
import { SERVICE_NAME } from "./branding";
import { buildShareText } from "./share";
import type { CalculationResult } from "./types";

function participant(overrides: Partial<CalculationResult["participants"][number]>) {
  return {
    participantId: "p",
    displayName: "Aさん",
    groupName: "普通",
    exactAmount: 0,
    finalAmount: 0,
    adjustmentLabel: null,
    isRoundingBearer: false,
    ...overrides,
  };
}

function baseResult(overrides: Partial<CalculationResult>): CalculationResult {
  return {
    totalAmount: 0,
    participants: [],
    roundedSum: 0,
    leftoverAmount: 0,
    isBalanced: true,
    warnings: [],
    ...overrides,
  };
}

describe("buildShareText", () => {
  it("参加者は必ず1人1行で、合計だけを添えたシンプルな形式になる", () => {
    const result = baseResult({
      totalAmount: 42000,
      roundedSum: 42000,
      participants: [
        participant({ displayName: "Aさん", finalAmount: 16500 }),
        participant({ displayName: "Bさん", finalAmount: 14600 }),
        participant({ displayName: "Cさん", finalAmount: 10900 }),
      ],
    });

    const text = buildShareText(result);

    expect(text).toBe(
      [
        `${SERVICE_NAME}の結果`,
        "",
        "Aさん　16,500円",
        "Bさん　14,600円",
        "Cさん　10,900円",
        "",
        "合計　42,000円",
      ].join("\n"),
    );
  });

  it("参加者数だけ改行される（10人なら10行）", () => {
    const participants = Array.from({ length: 10 }, (_, i) =>
      participant({ displayName: `P${i}さん`, finalAmount: 1000 * (i + 1) }),
    );
    const result = baseResult({ totalAmount: 55000, participants });

    const text = buildShareText(result);
    const bodyLines = text.split("\n").filter((l) => l.includes("さん"));
    expect(bodyLines).toHaveLength(10);
  });

  it("個別調整がある場合は金額の直後に理由を括弧書きで添える（説明文の段落は作らない）", () => {
    const result = baseResult({
      totalAmount: 5000,
      participants: [
        participant({ displayName: "Dさん", finalAmount: 1500, adjustmentLabel: "運転してくれた -1,000円" }),
      ],
    });

    const text = buildShareText(result);
    expect(text).toContain("Dさん　1,500円（運転してくれた -1,000円）");
    // 「〜にしています」のような説明文の段落は生成しない
    expect(text).not.toContain("にしています");
  });

  it("未割当の端数がある場合のみ端数の行を追加する", () => {
    const withLeftover = buildShareText(
      baseResult({
        totalAmount: 1000,
        leftoverAmount: 28,
        participants: [participant({ displayName: "Aさん", finalAmount: 972 })],
      }),
    );
    expect(withLeftover).toContain("端数　28円（未割当）");

    const withoutLeftover = buildShareText(
      baseResult({
        totalAmount: 1000,
        leftoverAmount: 0,
        participants: [participant({ displayName: "Aさん", finalAmount: 1000 })],
      }),
    );
    expect(withoutLeftover).not.toContain("端数");
  });
});
