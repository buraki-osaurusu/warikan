import { useMemo, useReducer, useState } from "preact/hooks";
import { calculate } from "../../lib/warikan/calculator";
import AmountInput from "./AmountInput";
import GroupEditor from "./GroupEditor";
import ParticipantEditor from "./ParticipantEditor";
import ResultView from "./ResultView";
import RoundingSettings from "./RoundingSettings";
import ShareCard from "./ShareCard";
import { initialWarikanState, warikanReducer } from "./state";
import TemplatePicker from "./TemplatePicker";

const INITIAL_TEMPLATE_ID = "friends";

export default function WarikanApp() {
  const [state, dispatch] = useReducer(warikanReducer, undefined, initialWarikanState);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(INITIAL_TEMPLATE_ID);
  // このツールならではの差別化要素（グループごとの傾斜調整）を最初から見せるため、初期状態はOPEN
  const [groupSectionOpen, setGroupSectionOpen] = useState(true);
  const [roundingOpen, setRoundingOpen] = useState(false);

  const result = useMemo(() => calculate(state), [state]);

  function handleSelectTemplate(templateId: string) {
    dispatch({ type: "APPLY_TEMPLATE", templateId });
    setSelectedTemplateId(templateId);
    // シチュエーションを変えたら、新しいグループ構成をすぐ確認できるように開き直す
    setGroupSectionOpen(true);
  }

  return (
    <div class="mx-auto flex max-w-md flex-col gap-2.5 px-3 pb-16 pt-3 sm:max-w-lg">
      {/* ① 合計金額 */}
      <AmountInput value={state.totalAmount} onChange={(amount) => dispatch({ type: "SET_TOTAL_AMOUNT", amount })} />

      {/* ② 誰との割り勘？（シチュエーション選択） */}
      <TemplatePicker selectedId={selectedTemplateId} onSelect={handleSelectTemplate} />

      {/* 必要な人だけ：グループの追加・比率調整（初期状態は閉じておく＝Progressive Disclosure） */}
      <button
        type="button"
        onClick={() => setGroupSectionOpen((v) => !v)}
        aria-expanded={groupSectionOpen}
        class="min-h-11 touch-manipulation select-none rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500 active:bg-slate-200"
      >
        {groupSectionOpen ? "グループの調整を閉じる ▲" : "グループを調整する（OB・5年生・役職などを追加） ▼"}
      </button>

      {groupSectionOpen && (
        <GroupEditor
          groups={state.groups}
          onRename={(groupId, name) => dispatch({ type: "RENAME_GROUP", groupId, name })}
          onRatioChange={(groupId, ratio) => dispatch({ type: "SET_GROUP_RATIO", groupId, ratio })}
          onRemove={(groupId) => dispatch({ type: "REMOVE_GROUP", groupId })}
          onAdd={() => dispatch({ type: "ADD_GROUP" })}
        />
      )}

      {/* ③ 参加者（人数）とグループ割り当て。個別調整は各行の「詳細」から必要な人だけ開く */}
      <ParticipantEditor
        participants={state.participants}
        groups={state.groups}
        onNameChange={(participantId, name) => dispatch({ type: "SET_PARTICIPANT_NAME", participantId, name })}
        onGroupChange={(participantId, groupId) =>
          dispatch({ type: "SET_PARTICIPANT_GROUP", participantId, groupId })
        }
        onAdjustmentChange={(participantId, adjustmentType, adjustmentValue, adjustmentReason, adjustmentReasonCustom) =>
          dispatch({
            type: "SET_PARTICIPANT_ADJUSTMENT",
            participantId,
            adjustmentType,
            adjustmentValue,
            adjustmentReason,
            adjustmentReasonCustom,
          })
        }
        onRemove={(participantId) => dispatch({ type: "REMOVE_PARTICIPANT", participantId })}
        onAdd={() => dispatch({ type: "ADD_PARTICIPANT" })}
      />

      {/* ④ 結果（入力するたびに即時反映） */}
      <ResultView result={result} />

      {/* 必要な人だけ：端数処理の詳細設定（初期値：100円単位・おまかせ） */}
      <button
        type="button"
        onClick={() => setRoundingOpen((v) => !v)}
        aria-expanded={roundingOpen}
        class="min-h-11 touch-manipulation select-none rounded-xl bg-slate-100 py-2.5 text-sm font-semibold text-slate-500 active:bg-slate-200"
      >
        {roundingOpen ? "端数処理の詳細設定を閉じる ▲" : "端数処理の詳細設定（初期値：100円単位・おまかせ） ▼"}
      </button>

      {roundingOpen && (
        <RoundingSettings
          unit={state.roundingUnit}
          mode={state.roundingMode}
          assignedParticipantId={state.assignedParticipantId}
          participants={state.participants}
          onUnitChange={(unit) => dispatch({ type: "SET_ROUNDING_UNIT", unit })}
          onModeChange={(mode) => dispatch({ type: "SET_ROUNDING_MODE", mode })}
          onAssignedChange={(participantId) => dispatch({ type: "SET_ASSIGNED_PARTICIPANT", participantId })}
        />
      )}

      {/* 結果を共有 */}
      <ShareCard result={result} />
    </div>
  );
}
