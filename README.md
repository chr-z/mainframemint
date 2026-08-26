# MainframeMint

**Mainframe-style money math whose engine is real, compiled GnuCOBOL.**

[![CI](https://github.com/chr-z/mainframemint/actions/workflows/ci.yml/badge.svg)](https://github.com/chr-z/mainframemint/actions/workflows/ci.yml)
[![Deploy](https://github.com/chr-z/mainframemint/actions/workflows/pages.yml/badge.svg)](https://github.com/chr-z/mainframemint/actions/workflows/pages.yml)
[![engine](https://img.shields.io/badge/engine-GnuCOBOL%203.1.2-23884a)](https://gnucobol.sourceforge.io/)
[![demo](https://img.shields.io/badge/demo-chr--z.github.io%2Fmainframemint-3dff7c)](https://chr-z.github.io/mainframemint/)

> Compound growth, loan amortization and savings plans computed with
> mainframe discipline: integer cents, monthly posting,
> round-half-away-from-zero. The COBOL source in `engine/` IS the spec.

**▶ Live demo: <https://chr-z.github.io/mainframemint/>**

---

## Why COBOL?

Because money is not floats.

COBOL still moves trillions of dollars every day, and it does that on a
deceptively simple idea: **fixed-point decimal arithmetic and integer-cents
ledgers**. No `0.1 + 0.2 !== 0.3` drift has ever touched a bank balance.
This project exists to show that discipline end to end:

- the **engine is COBOL** (`MFCOMPD`, `MFAMORT`, `MFSAVING`) written in
  fixed-format source like it's 1985;
- the **same math is mirrored 1:1** in JS so the browser demo runs offline;
- the **two are proven equivalent by CI**: goldens generated from an exact
  `decimal.Decimal` oracle are diffed against the *actual compiled binary*
  (GnuCOBOL 3.1.2 on ubuntu-latest) and against the JS mirror, byte for byte.
- rounding is **half away from zero at the cent level**, exactly how batch
  systems post interest — never banker's rounding, never float.

If you can read the amortization paragraph in `engine/mfamort.cob`, you can
read what your bank runs at 2 AM.

## What it computes

| Program    | What it does | Outputs |
|------------|--------------|---------|
| `MFCOMPD`  | compound growth of a lump sum | final balance |
| `MFAMORT`  | fixed-payment loan schedule   | total interest · last-payment month · residual balloon |
| `MFSAVING` | recurring deposits, posted at start of month | final balance · interest earned |

Uniform calling convention:

```cobol
CALL "MFCOMPD" USING MONTHS CENTS BPS MCENT STAT A B C.
```

* amounts in **integer cents**, rates in **basis points**
  (nominal annual; monthly share = `bps / 120000`);
* status codes: `0` ok · `-1` bad term (1..1200) · `-2` negative principal
  · `-3` negative rate · `-4` payment cannot cover interest (loan) /
  negative deposit (savings).

## Architecture

```
┌─────────────────────────────┐      ┌──────────────────────────────┐
│ engine/*.cob                │      │ js/mmcore.mjs                │
│ MFCOMPD / MFAMORT / MFSAVING│ ←──→ │ JS mirror, same semantics    │
│ (GnuCOBOL 3.1.2, compiled)  │ CI   │ (browser demo runs this)     │
└──────────────┬──────────────┘ parity └──────────────┬───────────────┘
               │         tests/goldens.txt            │
               │        (decimal oracle)              │
        drivers/mfrun.cob                      index.html + app.js
        batch runner over stdin                3270-styled PWA UI
```

* `tests/gen_goldens.py` generates 30 vectors with an exact
  `decimal.Decimal` oracle mirroring the COBOL semantics.
* CI compiles the COBOL with `cobc -x -O2` and diffs the binary output
  against `goldens.txt` — the shipped JS must match the same bytes.
* The site is an offline-first PWA (service worker precache stamped with
  the deploy SHA), i18n EN/pt-BR with live switching, USD/BRL/EUR display.

## Run locally

```bash
# engine golden check (needs GnuCOBOL)
cobc -x -O2 -o bin/mfrun drivers/mfrun.cob engine/mfmcompd.cob \
     engine/mfamort.cob engine/mfsaving.cob
./bin/mfrun < tests/cases.txt | diff tests/goldens.txt -

# JS suite + static site
npm install && npm test && npx serve .
```

## Roadmap

- [ ] WASM build path for the COBOL core (GnuCOBOL → C → wasm32) so the
      browser runs the actual COBOL object code;
- [ ] printable amortization schedule (SYSOUT style);
- [ ] CSV export of job history.

## Built by @chr-z

Part of a polyglot portfolio where every app ships in a different language:
TypeScript · Svelte 5 · Elm · Rust/WASM · ClojureScript · SolidJS · Gleam ·
Python/WASM · Go/WASM · Zig/WASM · Nim · Prolog/WASM · Lua/WASM ·
PureScript · PHP/WASM · **COBOL**.

MIT licensed.
