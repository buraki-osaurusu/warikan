import { describe, expect, it } from "vitest";
import { initialWarikanState, warikanReducer } from "./state";

describe("支払いグループの並び順", () => {
  it("SET_GROUP_RATIOで比率を変更しても並び順は一切変わらない（かんたん設定・細かく設定共通）", () => {
    let state = initialWarikanState();
    // 初期は友人テンプレート: 多め1.2, 普通1.0, 少なめ0.8
    const idsBefore = state.groups.map((g) => g.id);

    // 一番下の「少なめ(0.8)」を一番上より大きい1.9に変更しても、位置は動かない
    const last = state.groups[state.groups.length - 1];
    state = warikanReducer(state, { type: "SET_GROUP_RATIO", groupId: last.id, ratio: 1.9 });
    expect(state.groups.map((g) => g.id)).toEqual(idsBefore);
    expect(state.groups[state.groups.length - 1].ratio).toBe(1.9);

    // 一番上の「多め」を一番下より小さい0.1に変更しても、位置は動かない
    const first = state.groups[0];
    state = warikanReducer(state, { type: "SET_GROUP_RATIO", groupId: first.id, ratio: 0.1 });
    expect(state.groups.map((g) => g.id)).toEqual(idsBefore);
    expect(state.groups[0].ratio).toBe(0.1);
  });

  it("ADD_GROUPは常に末尾に追加され、既存グループの順序は変わらない", () => {
    let state = initialWarikanState();
    const idsBefore = state.groups.map((g) => g.id);
    state = warikanReducer(state, { type: "ADD_GROUP" });
    expect(state.groups.map((g) => g.id).slice(0, idsBefore.length)).toEqual(idsBefore);
    expect(state.groups[state.groups.length - 1].name).toContain("グループ");
  });

  it("ユーザーが追加したグループ（5年生・OBなど）は比率を変更しても追加した位置のまま", () => {
    let state = initialWarikanState();
    state = warikanReducer(state, { type: "ADD_GROUP" });
    state = warikanReducer(state, { type: "ADD_GROUP" });
    const [g5, gOB] = state.groups.slice(-2);
    state = warikanReducer(state, { type: "RENAME_GROUP", groupId: g5.id, name: "5年生" });
    state = warikanReducer(state, { type: "RENAME_GROUP", groupId: gOB.id, name: "OB" });

    // OBの比率を大きく上げても、5年生より前には来ない（追加順を維持）
    state = warikanReducer(state, { type: "SET_GROUP_RATIO", groupId: gOB.id, ratio: 10 });
    const names = state.groups.map((g) => g.name);
    expect(names.indexOf("5年生")).toBeLessThan(names.indexOf("OB"));
    expect(names.slice(-2)).toEqual(["5年生", "OB"]);
  });

  it("APPLY_TEMPLATEはテンプレート定義どおりの順序になる（学年・役職として自然な上位→下位の順を維持）", () => {
    let state = initialWarikanState();

    state = warikanReducer(state, { type: "APPLY_TEMPLATE", templateId: "university" });
    expect(state.groups.map((g) => g.name)).toEqual(["4年生", "3年生", "2年生", "1年生"]);

    state = warikanReducer(state, { type: "APPLY_TEMPLATE", templateId: "company" });
    expect(state.groups.map((g) => g.name)).toEqual(["部長", "課長", "係長", "一般", "新人"]);

    // 誕生日テンプレートも「主役→参加者」の定義順のまま（倍率0の主役が後ろに移動したりしない）
    state = warikanReducer(state, { type: "APPLY_TEMPLATE", templateId: "birthday" });
    expect(state.groups.map((g) => g.name)).toEqual(["主役", "参加者"]);
  });

  it("MOVE_GROUPアクションは廃止済み（未知のアクションとして無視される）", () => {
    const state = initialWarikanState();
    // @ts-expect-error MOVE_GROUPは型定義から削除済み
    const next = warikanReducer(state, { type: "MOVE_GROUP", groupId: state.groups[0].id, direction: "up" });
    expect(next).toBe(state);
  });
});
