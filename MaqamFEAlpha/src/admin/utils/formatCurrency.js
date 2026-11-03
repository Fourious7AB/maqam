
function formatCurrency(value, currency = "INR") {
  const numericValue = Number(value);

  const safeValue = Number.isFinite(numericValue)
    ? numericValue
    : 0;

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(safeValue);
}

export default formatCurrency;

