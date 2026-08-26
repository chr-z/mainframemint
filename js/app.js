/* MainframeMint — UI glue (ES module). All money math goes through
 * ./mmcore.mjs, the JS mirror of the GnuCOBOL core (same rounding,
 * same status codes). */
import { runCase } from "./mmcore.mjs";

const $ = (id) => document.getElementById(id);

const MODES = ["MFCOMPD", "MFAMORT", "MFSAVING"];
const state = {
  mode: "MFCOMPD",
  lang: localStorage.getItem("mm_lang") || "en",
  cur: localStorage.getItem("mm_cur") || "USD",
  hist: []
};
try { state.hist = JSON.parse(localStorage.getItem("mm_hist_v1") || "[]"); } catch { state.hist = []; }

function tr(key) {
  const pack = window.MM_I18N[state.lang] || window.MM_I18N.en;
  return pack[key] || window.MM_I18N.en[key] || key;
}

function esc(s) {
  return String(s).replace(/[&<>"']/g, (ch) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[ch]));
}

function fmtMoney(cents) {
  try {
    return new Intl.NumberFormat(state.lang, { style: "currency", currency: state.cur }).format(cents / 100);
  } catch {
    return (cents / 100).toFixed(2);
  }
}

/* ---------- i18n ---------- */
function applyLang() {
  document.documentElement.lang = state.lang;
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = tr(el.getAttribute("data-i18n"));
  });
  $("lbl-mcent").textContent = state.mode === "MFAMORT" ? tr("lblPayment") : tr("lblDeposit");
  $("lang").value = state.lang;
  $("currency").value = state.cur;
}

/* ---------- tabs ---------- */
function setMode(mode) {
  state.mode = mode;
  MODES.forEach((m) => {
    const btn = $("tab-" + m.slice(2).toLowerCase());
    if (btn) btn.classList.toggle("active", m === mode);
  });
  $("field-mcent").classList.toggle("hidden", mode === "MFCOMPD");
  applyLang();
}

/* ---------- results ---------- */
function showResult(pgm, inp, out) {
  const rows = [];
  const row = (key, val, note) => rows.push(
    '<div class="result-row"><span class="result-key">' + esc(tr(key)) +
    '</span><span class="result-val">' + esc(val) +
    (note ? ' <span class="result-note">' + esc(note) + "</span>" : "") + "</span></div>");
  if (pgm === "MFCOMPD") {
    row("rFinal", fmtMoney(out.a));
    row("rGrowth", fmtMoney(out.a - inp.cents));
  } else if (pgm === "MFAMORT") {
    row("rInterestPaid", fmtMoney(out.a));
    row("rLastMonth", out.b + "/" + inp.months);
    if (out.c > 0) row("rBalloon", fmtMoney(out.c));
  } else {
    row("rFinal", fmtMoney(out.a));
    row("rInterestEarned", fmtMoney(out.b));
    row("rDeposits", fmtMoney(inp.cents + inp.mcent * inp.months));
  }
  $("results").innerHTML = rows.join("");
  $("result-panel").classList.remove("hidden");
}

/* ---------- console log ---------- */
function logLine(text, cls) {
  const pre = $("log");
  const line = document.createElement("span");
  line.className = cls ? "l-" + cls : "";
  line.textContent = text;
  pre.appendChild(line);
  pre.appendChild(document.createTextNode("\n"));
  pre.scrollTop = pre.scrollHeight;
}

/* ---------- history ---------- */
function renderHist() {
  const box = $("history");
  box.innerHTML = "";
  state.hist.slice(0, 12).forEach((h) => {
    const div = document.createElement("div");
    div.className = "hist-item";
    div.innerHTML = '<span><span class="hist-pgm">' + esc(h.pgm) + "</span> " +
      esc(h.label) + "</span><span>" + esc(h.val) + "</span>";
    div.addEventListener("click", () => restore(h));
    box.appendChild(div);
  });
}

function restore(h) {
  $("in-months").value = h.months;
  $("in-cents").value = (h.cents / 100).toFixed(2);
  $("in-rate").value = (h.bps / 100).toFixed(2);
  $("in-mcent").value = (h.mcent / 100).toFixed(2);
  setMode(h.pgm);
}

/* ---------- submit ---------- */
function submit(e) {
  if (e) e.preventDefault();
  const months = parseInt($("in-months").value, 10);
  const cents = Math.round(parseFloat($("in-cents").value || "0") * 100);
  const bps = Math.round(parseFloat($("in-rate").value || "0") * 100);
  const mcent = Math.round(parseFloat($("in-mcent").value || "0") * 100);

  logLine("// JOB " + new Date().toISOString().replace("T", " ").slice(0, 19) + "  PGM=" + state.mode, null);
  logLine("CALL '" + state.mode + "' USING " + months + " " + cents + " " + bps + " " + mcent, "in");

  if (!(months >= 1 && months <= 1200)) {
    logLine("RC = -1", "bad");
    $("err").textContent = tr("errMonths");
    $("err").classList.remove("hidden");
    return;
  }
  if (cents < 0 || bps < 0 || mcent < 0) {
    logLine("RC < 0", "bad");
    $("err").textContent = tr("errNeg");
    $("err").classList.remove("hidden");
    return;
  }
  $("err").classList.add("hidden");

  const btn = $("run");
  btn.disabled = true;
  // small delay on purpose: sells the batch-job feel, keeps UI responsive
  setTimeout(() => {
    const out = runCase(state.mode, months, cents, bps, mcent);
    logLine("RC = " + out.s, out.s === 0 ? "ok" : "bad");
    if (out.s !== 0) {
      $("err").textContent = out.s === -1 ? tr("errMonths") : out.s === -4 ? tr("errPay") : tr("errGeneric");
      $("err").classList.remove("hidden");
    } else {
      $("err").classList.add("hidden");
      showResult(state.mode, { months, cents, bps, mcent }, out);
      const label = months + "m @ " + (bps / 100).toFixed(2) + "%";
      state.hist.unshift({ pgm: state.mode, months, cents, bps, mcent, label, val: fmtMoney(out.a) });
      state.hist = state.hist.slice(0, 24);
      localStorage.setItem("mm_hist_v1", JSON.stringify(state.hist));
      renderHist();
    }
    btn.disabled = false;
  }, 260);
}

/* ---------- boot ---------- */
function boot() {
  $("lang").addEventListener("change", () => {
    state.lang = $("lang").value;
    localStorage.setItem("mm_lang", state.lang);
    applyLang();
  });
  $("currency").addEventListener("change", () => {
    state.cur = $("currency").value;
    localStorage.setItem("mm_cur", state.cur);
    if (!$("result-panel").classList.contains("hidden")) $("run").click();
  });
  MODES.forEach((m) => {
    const btn = $("tab-" + m.slice(2).toLowerCase());
    if (btn) btn.addEventListener("click", () => setMode(m));
  });
  $("form").addEventListener("submit", submit);
  $("clear-hist").addEventListener("click", () => {
    state.hist = [];
    localStorage.removeItem("mm_hist_v1");
    renderHist();
  });

  setMode(state.hist[0] ? state.hist[0].pgm : "MFCOMPD");
  renderHist();
  logLine("MAINFRAMEMINT BATCH SUBSYSTEM ONLINE", "ok");
  logLine("ENGINE: MFCOMPD / MFAMORT / MFSAVING (integer cents)", null);

  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  }
}

boot();
