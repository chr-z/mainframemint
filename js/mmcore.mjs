/* MainframeMint — JS mirror of the GnuCOBOL core (mfmcompd/mfamort/mfsaving).
 * Semantics are IDENTICAL to the COBOL engine and to tests/goldens.txt:
 *   - money as integer cents; interest posts monthly;
 *   - monthly interest = round_half_away_from_zero(bal * bps / 120000);
 *   - compound: lump sum grows month by month;
 *   - amort: fixed payment; principal part = payment - interest; loan closes
 *     when the principal part reaches the balance (final short month);
 *   - saving: deposit lands at the START of the month, interest right after.
 * Status codes: 0 ok / -1 bad months / -2 negative principal /
 *               -3 negative rate / -4 payment never covers interest
 *               (amort) or negative deposit (saving).
 */

export function rha(x) {
  // Round half AWAY FROM ZERO (GnuCOBOL ROUNDED default). x may be a
  // non-integer Number.
  const abs = Math.abs(x);
  const fl = Math.floor(abs);
  const out = abs - fl >= 0.5 ? fl + 1 : fl;
  return x < 0 ? -out : out;
}

export function monthlyInt(bal, bps) {
  return rha((bal * bps) / 120000);
}

export function compound(months, cents, bps, _mc) {
  if (!Number.isInteger(months) || months < 1 || months > 1200) return mk(-1);
  if (cents < 0) return mk(-2);
  if (bps < 0) return mk(-3);
  let bal = cents;
  for (let k = 0; k < months; k++) bal += monthlyInt(bal, bps);
  return { a: bal, b: 0, c: 0, s: 0 };
}

export function amort(months, cents, bps, pay) {
  if (!Number.isInteger(months) || months < 1 || months > 1200) return mk(-1);
  if (cents < 0) return mk(-2);
  if (bps < 0) return mk(-3);
  if (pay <= 0) return mk(-4);
  let bal = cents;
  let acci = 0;
  let last = 0;
  for (let k = 1; k <= months; k++) {
    const i = monthlyInt(bal, bps);
    const prn = pay - i;
    if (prn <= 0) return { a: 0, b: 0, c: 0, s: -4 };
    if (prn >= bal) {
      acci += i;
      last = k;
      bal = 0;
      break;
    }
    bal -= prn;
    acci += i;
    last = k;
  }
  return { a: acci, b: last, c: bal, s: 0 };
}

export function saving(months, cents, bps, dep) {
  if (!Number.isInteger(months) || months < 1 || months > 1200) return mk(-1);
  if (cents < 0) return mk(-2);
  if (bps < 0) return mk(-3);
  if (dep < 0) return mk(-4);
  let bal = cents;
  let acci = 0;
  for (let k = 0; k < months; k++) {
    bal += dep;
    const i = monthlyInt(bal, bps);
    bal += i;
    acci += i;
  }
  return { a: bal, b: acci, c: 0, s: 0 };
}

const FNS = { MFCOMPD: compound, MFAMORT: amort, MFSAVING: saving };

/** Uniform entry point mirroring CALL "<PGM>" USING ... */
export function runCase(pgm, months, cents, bps, mcent) {
  const fn = FNS[pgm];
  if (!fn) return { a: 0, b: 0, c: 0, s: -99 };
  return fn(months, cents, bps, mcent);
}

function mk(s) {
  return { a: 0, b: 0, c: 0, s };
}
