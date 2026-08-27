type TrendWindow = { context: string | null };

/** Returns prose only when both comparison windows have enough moments. */
export function buildNarrativeTrend(current: TrendWindow[], previous: TrendWindow[]) {
  if (current.length < 4 || previous.length < 3) return null;

  const count = (rows: TrendWindow[]) => {
    const counts = new Map<string, number>();
    for (const row of rows) {
      if (!row.context) continue;
      counts.set(row.context, (counts.get(row.context) ?? 0) + 1);
    }
    return counts;
  };

  const rank = (rows: TrendWindow[]) =>
    [...count(rows).entries()].sort(
      (a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "ko"),
    );

  const currentTop = rank(current)[0];
  const previousTop = rank(previous)[0];
  if (!currentTop) return null;

  if (previousTop && currentTop[0] !== previousTop[0]) {
    return `최근에는 ${currentTop[0]}에 머무는 순간이 보이고, 지난달에는 ${previousTop[0]}에 관한 이야기가 조금 더 많았어요.`;
  }

  return `최근에도 ${currentTop[0]}에 관한 순간이 자주 보이지만, 그 안에서 바라보는 방식은 조금씩 달라지고 있어요.`;
}
