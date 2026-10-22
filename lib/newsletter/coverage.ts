function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Coverage = current calendar month; issueMonth = current month (YYYY-MM). */
export function defaultCoverageRange(now = new Date()) {
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const issueMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  return {
    takenOnFrom: iso(firstThisMonth),
    takenOnTo: iso(lastThisMonth),
    issueMonth,
  };
}
