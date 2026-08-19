import type { PaymentGroup } from "./types";

export interface GroupPreset {
  name: string;
  ratio: number;
}

export interface WarikanTemplate {
  id: string;
  label: string;
  shortDescription: string;
  groups: GroupPreset[];
}

/**
 * テンプレートは「初期状態を素早く作るプリセット」であり、固定の選択肢ではない。
 * 選択後もグループの追加・削除・名前変更・比率変更・並び替え・人数変更は自由。
 */
export const WARIKAN_TEMPLATES: WarikanTemplate[] = [
  {
    id: "university",
    label: "大学生・サークル",
    shortDescription: "学年ごとに調整",
    groups: [
      { name: "4年生", ratio: 1.3 },
      { name: "3年生", ratio: 1.15 },
      { name: "2年生", ratio: 1.0 },
      { name: "1年生", ratio: 0.8 },
    ],
  },
  {
    id: "company",
    label: "会社・職場",
    shortDescription: "役職・年次で調整",
    groups: [
      { name: "部長", ratio: 1.5 },
      { name: "課長", ratio: 1.3 },
      { name: "係長", ratio: 1.15 },
      { name: "一般", ratio: 1.0 },
      { name: "新人", ratio: 0.8 },
    ],
  },
  {
    id: "friends",
    label: "友人との飲み会",
    shortDescription: "飲む量などで調整",
    groups: [
      { name: "多め", ratio: 1.2 },
      { name: "普通", ratio: 1.0 },
      { name: "少なめ", ratio: 0.8 },
    ],
  },
  {
    id: "trip",
    label: "ドライブ・旅行",
    shortDescription: "運転・車出しを考慮",
    groups: [
      { name: "通常参加", ratio: 1.0 },
      { name: "運転した人", ratio: 0.8 },
      { name: "車を出した人", ratio: 0.7 },
    ],
  },
  {
    id: "birthday",
    label: "誕生日会",
    shortDescription: "主役を安く／無料に",
    groups: [
      { name: "主役", ratio: 0 },
      { name: "参加者", ratio: 1.0 },
    ],
  },
  {
    id: "custom",
    label: "完全カスタム",
    shortDescription: "自由に設定",
    groups: [{ name: "グループ1", ratio: 1.0 }],
  },
];

export function getTemplate(id: string): WarikanTemplate | undefined {
  return WARIKAN_TEMPLATES.find((t) => t.id === id);
}

/** 傾斜比率のクイック設定プリセット */
export const RATIO_PRESETS: GroupPreset[] = [
  { name: "多め", ratio: 1.4 },
  { name: "やや多め", ratio: 1.2 },
  { name: "普通", ratio: 1.0 },
  { name: "やや少なめ", ratio: 0.8 },
  { name: "少なめ", ratio: 0.6 },
];

export function groupsFromPresets(presets: GroupPreset[], idFactory: (name: string) => string): PaymentGroup[] {
  return presets.map((p) => ({ id: idFactory(p.name), name: p.name, ratio: p.ratio }));
}

/**
 * 任意の比率に最も近いプリセットラベル（多め・やや多め・普通・やや少なめ・少なめ）を返す。
 * 細かい数値を意識させず「人間が理解しやすい表示」を初期表示にするために使う。
 */
export function nearestRatioLabel(ratio: number): string {
  let best = RATIO_PRESETS[0];
  let bestDiff = Math.abs(ratio - best.ratio);
  for (const p of RATIO_PRESETS) {
    const diff = Math.abs(ratio - p.ratio);
    if (diff < bestDiff) {
      best = p;
      bestDiff = diff;
    }
  }
  return best.name;
}
