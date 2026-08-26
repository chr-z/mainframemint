#!/usr/bin/env python3
"""Golden-case generator for MainframeMint.

Mirrors the COBOL engine's semantics EXACTLY using decimal.Decimal:
  * money as integer cents; balances carry 6 extra fraction digits
    (COMP-3 S9(15)V9(6));
  * monthly interest = round_half_away_from_zero(bal * bps / 120000);
  * compound: interest posts on the lump sum every month;
  * amort: fixed payment; principal part = payment - interest;
    loan closes when principal part >= balance (final short month);
    -4 when the payment cannot cover the interest;
  * saving: deposit lands at the START of the month, interest right after.

Outputs: cases.txt (driver stdin) and goldens.txt ("a b c s" per line).
"""
from decimal import Decimal, ROUND_HALF_UP
import pathlib

ROOT = pathlib.Path(__file__).resolve().parent


def rha(x: Decimal) -> Decimal:
    """Round half away from zero (COBOL ROUNDED default)."""
    q = x.copy_abs().quantize(Decimal("1"), rounding=ROUND_HALF_UP)
    return -q if x < 0 else q


def monthly_int(bal: Decimal, bps: int) -> Decimal:
    """Whole-cent interest, round half away from zero — batch-style."""
    return rha(bal * Decimal(bps) / Decimal(120000))


def compound(months: int, cents: int, bps: int, _mc: int):
    if not 1 <= months <= 1200:
        return 0, 0, 0, -1
    if cents < 0:
        return 0, 0, 0, -2
    if bps < 0:
        return 0, 0, 0, -3
    bal = Decimal(cents)
    for _ in range(months):
        bal += monthly_int(bal, bps)
    return int(bal), 0, 0, 0


def amort(months: int, cents: int, bps: int, pay: int):
    if not 1 <= months <= 1200:
        return 0, 0, 0, -1
    if cents < 0:
        return 0, 0, 0, -2
    if bps < 0:
        return 0, 0, 0, -3
    if pay <= 0:
        return 0, 0, 0, -4
    bal = Decimal(cents)
    acci = Decimal(0)
    last = 0
    for k in range(1, months + 1):
        i = monthly_int(bal, bps)
        prn = pay - i
        if prn <= 0:
            return 0, 0, 0, -4
        if prn >= bal:
            acci += i
            last = k
            bal = Decimal(0)
            break
        bal -= prn
        acci += i
        last = k
    return int(acci), last, int(bal), 0


def saving(months: int, cents: int, bps: int, dep: int):
    if not 1 <= months <= 1200:
        return 0, 0, 0, -1
    if cents < 0:
        return 0, 0, 0, -2
    if bps < 0:
        return 0, 0, 0, -3
    if dep < 0:
        return 0, 0, 0, -4
    bal = Decimal(cents)
    acci = Decimal(0)
    for _ in range(months):
        bal += dep
        i = monthly_int(bal, bps)
        bal += i
        acci += i
    return int(bal), int(acci), 0, 0


CASES = [
    ("MFCOMPD", 12, 100000, 600, 0),
    ("MFCOMPD", 120, 10000, 700, 0),
    ("MFCOMPD", 1, 100000, 1200, 0),
    ("MFCOMPD", 360, 500000, 450, 0),
    ("MFCOMPD", 240, 123456, 0, 0),
    ("MFCOMPD", 60, 999999, 14900, 0),
    ("MFCOMPD", 1200, 1000000000, 250, 0),
    ("MFCOMPD", 36, 75025, 325, 0),
    ("MFAMORT", 360, 30000000, 450, 152049),
    ("MFAMORT", 24, 100000, 1200, 4672),
    ("MFAMORT", 12, 50000, 0, 4200),
    ("MFAMORT", 6, 20000, 875, 3415),
    ("MFAMORT", 48, 1500000, 99, 35001),
    ("MFAMORT", 10, 100000, 10000, 11200),
    ("MFAMORT", 120, 800000, 15750, 999),
    ("MFAMORT", 1, 100000, 600, 100500),
    ("MFAMORT", 300, 25000000, 550, 141000),
    ("MFAMORT", 18, 77777, 333, 4444),
    ("MFSAVING", 120, 100000, 600, 25000),
    ("MFSAVING", 12, 0, 450, 100000),
    ("MFSAVING", 240, 500000, 275, 12500),
    ("MFSAVING", 36, 10000, 0, 5000),
    ("MFSAVING", 600, 1000000, 900, 33333),
    ("MFSAVING", 6, 0, 12500, 10000),
    ("MFCOMPD", 0, 100, 100, 0),
    ("MFCOMPD", 1201, 100, 100, 0),
    ("MFCOMPD", 12, -5, 100, 0),
    ("MFAMORT", 12, 100000, 1200, 500),
    ("MFSAVING", 12, 100, -100, 0),
    ("MFSAVING", 12, 100, 100, -1),
]

FNS = {"MFCOMPD": compound, "MFAMORT": amort, "MFSAVING": saving}


def main() -> None:
    lines = [str(len(CASES))]
    goldens = []
    for pgm, m, c, r, d in CASES:
        a, b, cc, s = FNS[pgm](m, c, r, d)
        lines.append(f"{pgm} {m} {c} {r} {d}")
        goldens.append(f"{a} {b} {cc} {s}")
    with open(ROOT / "cases.txt", "wb") as f:
        f.write(("\n".join(lines) + "\n").encode("ascii"))
    with open(ROOT / "goldens.txt", "wb") as f:
        f.write(("\n".join(goldens) + "\n").encode("ascii"))
    print(f"wrote {len(CASES)} cases")


if __name__ == "__main__":
    main()
