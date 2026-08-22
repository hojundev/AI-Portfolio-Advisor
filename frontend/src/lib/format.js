export function fmtMoney(x, digits = 0) {
  return x.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

export function fmtPct(x, { sign = false, digits = 1 } = {}) {
  const v = (x * 100).toFixed(digits);
  return `${sign && x > 0 ? "+" : ""}${v}%`;
}

export function fmtWeight(w) {
  return `${Number.isInteger(w) ? w : w.toFixed(1)}%`;
}

export function clamp(x, lo, hi) {
  return Math.max(lo, Math.min(hi, x));
}
