/* MainframeMint — production E2E over raw CDP (no puppeteer). */
const PORT = process.argv[2];
const BASE = "https://chr-z.github.io/mainframemint/";
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

let page = null;
for (let i = 0; i < 40 && !page; i++) {
  try {
    const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json();
    page = list.find((t) => t.type === "page");
  } catch {}
  if (!page) await sleep(400);
}
if (!page) { console.error("E2E_FAIL: no debug target"); process.exit(1); }

const ws = new WebSocket(page.webSocketDebuggerUrl);
let id = 0;
const pend = new Map();
ws.onmessage = (ev) => {
  const m = JSON.parse(ev.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
};
await new Promise((r) => (ws.onopen = r));
const send = (method, params = {}) =>
  new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });

await send("Page.enable");
await send("Page.navigate", { url: BASE });
await sleep(7000);

const evaljs = async (expression) => {
  const m = await send("Runtime.evaluate", { expression, returnByValue: true });
  if (m.result && m.result.exceptionDetails) throw new Error("eval failed: " + JSON.stringify(m.result.exceptionDetails).slice(0, 200));
  return m.result ? m.result.result : null;
};

let pass = 0, fail = 0;
const check = (name, cond, extra) => {
  if (cond) { pass++; console.log("PASS", name); }
  else { fail++; console.log("FAIL", name, extra === undefined ? "" : String(extra).slice(0, 160)); }
};

// 1. boot banner
const log = (await evaljs(`document.querySelector('#log').textContent`)).value || "";
check("boot banner", /BATCH SUBSYSTEM ONLINE/.test(log), log);

// 2. compound job through the real form: 12m, 1000.00 @ 6% => 106169 cents ($1,061.69)
await evaljs(`
  (function(){
    document.getElementById('tab-compd').click();
    document.getElementById('in-months').value = '12';
    document.getElementById('in-cents').value = '1000';
    document.getElementById('in-rate').value = '6';
    document.getElementById('form').dispatchEvent(new Event('submit', {cancelable:true}));
    return true;
  })()
`);
await sleep(900);
const resTxt = (await evaljs(`document.querySelector('#results').innerText`)).value || "";
check("compound result row", /Final balance/i.test(resTxt), resTxt);
check("compound exact value $1,061.69", resTxt.includes("1,061.69"), resTxt);

// 3. history persisted
const hist = (await evaljs(`localStorage.getItem('mm_hist_v1')`)).value || "";
check("history persisted", hist.includes("MFCOMPD"), hist);

// 4. loan tab: payment below interest must surface RC -4 error text
await evaljs(`
  (function(){
    document.getElementById('tab-amort').click();
    document.getElementById('in-cents').value = '1000';
    document.getElementById('in-rate').value = '12';
    document.getElementById('in-mcent').value = '1';
    document.getElementById('form').dispatchEvent(new Event('submit', {cancelable:true}));
    return true;
  })()
`);
await sleep(900);
const errTxt = (await evaljs(`document.getElementById('err').textContent`)).value || "";
const errShown = (await evaljs(`document.getElementById('err').classList.contains('hidden')`)).value === false;
check("amort -4 surfaces error", errShown && errTxt.length > 3, errTxt);

// 5. live i18n switch to pt-BR
await evaljs(`
  (function(){
    var s = document.getElementById('lang');
    s.value = 'pt-BR';
    s.dispatchEvent(new Event('change'));
    return true;
  })()
`);
await sleep(300);
const hero = (await evaljs(`document.querySelector('[data-i18n="heroTitle"]').textContent`)).value || "";
check("live pt-BR switch", /Matem.tica/.test(hero), hero);

console.log(`E2E ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
