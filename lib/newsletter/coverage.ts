function pad2(n: number) {
  return String(n).padStart(2, "0");
}

/** Coverage = previous calendar month; issueMonth = current month (PDF on the 1st). */
export function defaultCoverageRange(now = new Date()) {
  const firstThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastPrev = new Date(firstThisMonth.getTime() - 86400000);
  const firstPrev = new Date(lastPrev.getFullYear(), lastPrev.getMonth(), 1);
  const iso = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const issueMonth = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`;
  return {
    takenOnFrom: iso(firstPrev),
    takenOnTo: iso(lastPrev),
    issueMonth,
  };
}
