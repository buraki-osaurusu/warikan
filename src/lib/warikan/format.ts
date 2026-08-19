export function formatYen(n: number): string {
  return `${Math.round(n).toLocaleString("ja-JP")}円`;
}

export function formatNumber(n: number): string {
  return n.toLocaleString("ja-JP");
}
