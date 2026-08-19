/**
 * クリップボードへのコピーを1タップで完了させるためのユーティリティ。
 *
 * navigator.clipboard.writeText はHTTPS等のsecure contextでのみ動作する。
 * LAN内のHTTP（例: http://192.168.x.x:xxxx）での実機確認時はsecure contextに
 * ならないため、失敗時は hidden textarea + document.execCommand("copy") の
 * 古典的な方法にフォールバックし、「コピー用テキストを表示するだけの中間画面」を
 * 極力出さずに済むようにしている。
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  if (typeof navigator !== "undefined" && navigator.clipboard && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // secure contextでも権限拒否等で失敗することがあるため、フォールバックへ続行
    }
  }

  if (typeof document === "undefined") return false;
  try {
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.setAttribute("readonly", "");
    textarea.style.position = "fixed";
    textarea.style.top = "0";
    textarea.style.left = "-9999px";
    document.body.appendChild(textarea);
    textarea.focus();
    textarea.select();
    const success = document.execCommand("copy");
    document.body.removeChild(textarea);
    return success;
  } catch {
    return false;
  }
}
