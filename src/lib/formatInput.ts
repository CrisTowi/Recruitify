/**
 * Format a raw digit string with thousands commas for display in text inputs.
 * State should always store the raw digit string; only pass through this
 * function for the `value` prop.
 *
 * Usage:
 *   value={fmtCommas(baseSalary)}
 *   onChange={(e) => setBaseSalary(e.target.value.replace(/[^0-9]/g, ''))}
 */
export function fmtCommas(val: string): string {
  const n = parseInt(val.replace(/[^0-9]/g, ''), 10);
  return isNaN(n) ? '' : n.toLocaleString('en-US');
}
