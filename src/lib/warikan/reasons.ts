import type { AdjustmentReason } from "./types";

export const ADJUSTMENT_REASON_LABELS: Record<AdjustmentReason, string> = {
  driver: "運転してくれた",
  car: "車を出してくれた",
  noAlcohol: "お酒を飲んでいない",
  lateArrival: "途中参加",
  earlyLeave: "途中退出",
  organizer: "幹事",
  birthday: "誕生日",
  other: "その他",
};

export const ADJUSTMENT_REASON_ORDER: AdjustmentReason[] = [
  "driver",
  "car",
  "noAlcohol",
  "lateArrival",
  "earlyLeave",
  "organizer",
  "birthday",
  "other",
];

export function reasonLabel(
  reason: AdjustmentReason | undefined,
  customText: string | undefined,
): string | null {
  if (!reason) return null;
  if (reason === "other") {
    const t = customText?.trim();
    return t ? t : "その他";
  }
  return ADJUSTMENT_REASON_LABELS[reason];
}
