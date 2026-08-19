import { createId } from "../../lib/warikan/names";
import { getTemplate, groupsFromPresets } from "../../lib/warikan/templates";
import type {
  AdjustmentReason,
  AdjustmentType,
  PaymentGroup,
  RoundingMode,
  RoundingUnit,
  WarikanState,
} from "../../lib/warikan/types";

export type Action =
  | { type: "SET_TOTAL_AMOUNT"; amount: number }
  | { type: "APPLY_TEMPLATE"; templateId: string }
  | { type: "ADD_GROUP" }
  | { type: "REMOVE_GROUP"; groupId: string }
  | { type: "RENAME_GROUP"; groupId: string; name: string }
  | { type: "SET_GROUP_RATIO"; groupId: string; ratio: number }
  | { type: "ADD_PARTICIPANT" }
  | { type: "REMOVE_PARTICIPANT"; participantId: string }
  | { type: "SET_PARTICIPANT_NAME"; participantId: string; name: string }
  | { type: "SET_PARTICIPANT_GROUP"; participantId: string; groupId: string }
  | {
      type: "SET_PARTICIPANT_ADJUSTMENT";
      participantId: string;
      adjustmentType: AdjustmentType;
      adjustmentValue: number;
      adjustmentReason?: AdjustmentReason;
      adjustmentReasonCustom?: string;
    }
  | { type: "SET_ROUNDING_UNIT"; unit: RoundingUnit }
  | { type: "SET_ROUNDING_MODE"; mode: RoundingMode }
  | { type: "SET_ASSIGNED_PARTICIPANT"; participantId: string | null };

function makeGroupId() {
  return createId("group");
}
function makeParticipantId() {
  return createId("participant");
}

/**
 * 支払いグループの並び順は「倍率」から完全に独立させている。
 * - 並び順が決まるのはテンプレート選択時（テンプレート定義の順序＝学年・役職として自然な上位→下位）のみ
 * - グループ追加は常に末尾（＝追加した位置）
 * - 比率変更・名前変更では並び順を一切変更しない
 * こうすることで「倍率を変更するとカードが勝手に上下移動する」という、
 * スマホ実機テストで指摘されたUX上の問題を解消している。
 */
export function initialWarikanState(): WarikanState {
  const template = getTemplate("friends")!;
  const groups = groupsFromPresets(template.groups, () => makeGroupId());
  const normalGroup = groups.find((g) => g.name === "普通") ?? groups[0];
  return {
    totalAmount: 0,
    groups,
    participants: [
      { id: makeParticipantId(), name: "", groupId: normalGroup.id, adjustmentType: "none", adjustmentValue: 0 },
      { id: makeParticipantId(), name: "", groupId: normalGroup.id, adjustmentType: "none", adjustmentValue: 0 },
    ],
    roundingUnit: 100,
    roundingMode: "smart",
    assignedParticipantId: null,
  };
}

export function warikanReducer(state: WarikanState, action: Action): WarikanState {
  switch (action.type) {
    case "SET_TOTAL_AMOUNT":
      return { ...state, totalAmount: Math.max(0, Math.round(action.amount)) };

    case "APPLY_TEMPLATE": {
      const template = getTemplate(action.templateId);
      if (!template) return state;
      const groups = groupsFromPresets(template.groups, () => makeGroupId());
      const fallbackGroupId = groups[0]?.id ?? "";
      const groupIds = new Set(groups.map((g) => g.id));
      const participants = state.participants.map((p) =>
        groupIds.has(p.groupId) ? p : { ...p, groupId: fallbackGroupId },
      );
      return {
        ...state,
        groups,
        participants,
        assignedParticipantId:
          state.assignedParticipantId && participants.some((p) => p.id === state.assignedParticipantId)
            ? state.assignedParticipantId
            : null,
      };
    }

    case "ADD_GROUP": {
      const newGroup: PaymentGroup = { id: makeGroupId(), name: `グループ${state.groups.length + 1}`, ratio: 1.0 };
      return { ...state, groups: [...state.groups, newGroup] };
    }

    case "REMOVE_GROUP": {
      if (state.groups.length <= 1) return state; // 最低1グループは残す
      const remaining = state.groups.filter((g) => g.id !== action.groupId);
      const fallbackId = remaining[0].id;
      const participants = state.participants.map((p) =>
        p.groupId === action.groupId ? { ...p, groupId: fallbackId } : p,
      );
      return { ...state, groups: remaining, participants };
    }

    case "RENAME_GROUP":
      return {
        ...state,
        groups: state.groups.map((g) => (g.id === action.groupId ? { ...g, name: action.name } : g)),
      };

    case "SET_GROUP_RATIO":
      // 比率を変更しても並び順（配列の順序）はそのまま維持する
      return {
        ...state,
        groups: state.groups.map((g) =>
          g.id === action.groupId ? { ...g, ratio: Number.isFinite(action.ratio) ? action.ratio : g.ratio } : g,
        ),
      };

    case "ADD_PARTICIPANT": {
      const defaultGroupId = state.groups[0]?.id ?? "";
      return {
        ...state,
        participants: [
          ...state.participants,
          {
            id: makeParticipantId(),
            name: "",
            groupId: defaultGroupId,
            adjustmentType: "none",
            adjustmentValue: 0,
          },
        ],
      };
    }

    case "REMOVE_PARTICIPANT":
      return {
        ...state,
        participants: state.participants.filter((p) => p.id !== action.participantId),
        assignedParticipantId:
          state.assignedParticipantId === action.participantId ? null : state.assignedParticipantId,
      };

    case "SET_PARTICIPANT_NAME":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId ? { ...p, name: action.name } : p,
        ),
      };

    case "SET_PARTICIPANT_GROUP":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId ? { ...p, groupId: action.groupId } : p,
        ),
      };

    case "SET_PARTICIPANT_ADJUSTMENT":
      return {
        ...state,
        participants: state.participants.map((p) =>
          p.id === action.participantId
            ? {
                ...p,
                adjustmentType: action.adjustmentType,
                adjustmentValue: action.adjustmentValue,
                adjustmentReason: action.adjustmentReason,
                adjustmentReasonCustom: action.adjustmentReasonCustom,
              }
            : p,
        ),
      };

    case "SET_ROUNDING_UNIT":
      return { ...state, roundingUnit: action.unit };

    case "SET_ROUNDING_MODE":
      return { ...state, roundingMode: action.mode };

    case "SET_ASSIGNED_PARTICIPANT":
      return { ...state, assignedParticipantId: action.participantId };

    default:
      return state;
  }
}
