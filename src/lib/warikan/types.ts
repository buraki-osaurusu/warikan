// 傾斜あり割り勘ツール - 型定義

export type RoundingUnit = 1 | 10 | 100 | 500 | 1000;

export type RoundingMode =
  | "smart" // おまかせ：傾斜を考慮して自動調整
  | "highPayer" // 支払額が多い人から負担
  | "assigned" // 指定した人が負担
  | "distribute" // みんなで分散して負担
  | "leaveRemainder"; // 端数として残す（誰にも割り当てない）

export type AdjustmentType = "none" | "amount" | "percent";

export type AdjustmentReason =
  | "driver"
  | "car"
  | "noAlcohol"
  | "lateArrival"
  | "earlyLeave"
  | "organizer"
  | "birthday"
  | "other";

export interface PaymentGroup {
  id: string;
  name: string;
  /** 傾斜比率。1.0が基準。大きいほど多く払う。 */
  ratio: number;
}

export interface Participant {
  id: string;
  /** 空文字の場合は自動命名（Aさん、Bさんなど）を使う */
  name: string;
  groupId: string;
  adjustmentType: AdjustmentType;
  /**
   * adjustmentType === "amount" のとき：円単位の加減算（例: -1000）
   * adjustmentType === "percent" のとき：パーセントポイント（例: -20 は -20%）
   */
  adjustmentValue: number;
  adjustmentReason?: AdjustmentReason;
  adjustmentReasonCustom?: string;
}

export interface WarikanState {
  totalAmount: number;
  groups: PaymentGroup[];
  participants: Participant[];
  roundingUnit: RoundingUnit;
  roundingMode: RoundingMode;
  /** roundingMode === "assigned" のとき、端数を負担する参加者ID */
  assignedParticipantId: string | null;
}

export interface ParticipantResult {
  participantId: string;
  displayName: string;
  groupName: string;
  /** 丸め前の理論値（円、小数あり） */
  exactAmount: number;
  /** 最終支払額（円、整数） */
  finalAmount: number;
  /** 表示用の調整ラベル（例: "運転してくれた -1,000円"） */
  adjustmentLabel: string | null;
  /** 端数処理の負担者としてマークされたか */
  isRoundingBearer: boolean;
}

export interface CalculationResult {
  totalAmount: number;
  participants: ParticipantResult[];
  /** 参加者への配分合計（円） */
  roundedSum: number;
  /** 誰にも割り当てられなかった端数（円）。leaveRemainderモード等で使用 */
  leftoverAmount: number;
  /** roundedSum + leftoverAmount === totalAmount であるか */
  isBalanced: boolean;
  warnings: string[];
}
