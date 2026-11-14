/* ===== David · OGE vocabulary engine. Expects const L = {...} defined before. ===== */
(function () {
const W = L.words, byId = Object.fromEntries(W.map(w => [w.id, w]));
const $ = (t, c, x) => { const e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };
const norm = s => (s || "").toLowerCase().replace(/[’‘`]/g, "'").replace(/[.!?,;:]+/g, " ").replace(/\s+/g, " ").trim();

/* seeded random, so the page looks the same after reload */
let seed = [...L.id].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
const shuffle = a => { a = [...a]; for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const pick = (pool, n, not) => shuffle(pool.filter(x => !not.includes(x))).slice(0, n);

/* saved state */
const KEY = "david-oge-" + L.id;
let S = {}; try { S = JSON.parse(localStorage.getItem(KEY) || "{}") || {}; } catch (e) { S = {}; }
const save = () => { try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) {} };
let TOTAL = 0;
const reg = () => { TOTAL++; };
function mark(key, wid, ok, v) { if (S[key]) return; S[key] = { w: wid, ok: ok, v: v }; save(); upd(); }

/* speech */
let voice = null;
function pickVoice() { const vs = speechSynthesis.getVoices(); voice = vs.find(v => /en[-_]GB/i.test(v.lang)) || vs.find(v => /^en/i.test(v.lang)) || null; }
if ("speechSynthesis" in window) { pickVoice(); speechSynthesis.onvoiceschanged = pickVoice; }
function say(text) { if (!("speechSynthesis" in window)) return; speechSynthesis.cancel(); const u = new SpeechSynthesisUtterance(text); u.lang = "en-GB"; if (voice) u.voice = voice; u.rate = .85; speechSynthesis.speak(u); }
const sayBtn = text => { const b = $("button", "say", "🔊"); b.type = "button"; b.setAttribute("aria-label", "Послушать"); b.onclick = e => { e.stopPropagation(); say(text); }; return b; };

/* layout */
const main = document.getElementById("main");
const sections = [];
let secN = 0;
function section(title, instr) {
  const s = $("section", "ex"); const h = $("div", "ex-head"); const h2 = $("h2");
  const n = $("span", "n", ++secN); h2.append(n, title); const pill = $("span", "pill"); h.append(h2, pill); s.append(h);
  if (instr) s.append($("p", "instr", instr));
  main.append(s); const rec = { s, pill, keys: [] }; sections.push(rec); return rec;
}
const keyOf = (rec, i) => "s" + secN + "-" + i;

/* MCQ item */
function mcq(rec, i, wid, qNode, options, answer) {
  const key = keyOf(rec, i); rec.keys.push(key); reg();
  const it = $("div", "it"); it.append(qNode); const box = $("div", "opts"); it.append(box);
  const btns = options.map(o => { const b = $("button", "opt", o); b.type = "button"; box.append(b); return b; });
  const lock = (chosen) => { box.classList.add("locked"); btns.forEach(b => { b.disabled = true; if (b.textContent === answer) b.classList.add("ok"); else if (b.textContent === chosen) b.classList.add("bad"); }); fillGap(qNode, answer); };
  btns.forEach(b => b.onclick = () => { const ok = b.textContent === answer; mark(key, wid, ok, b.textContent); lock(b.textContent); if (ok && rec.speak) say(answer); });
  if (S[key]) lock(S[key].v);
  return it;
}
function fillGap(q, ans) { const g = q.querySelector(".gap"); if (g) g.textContent = ans; }
function qLine(k, html) { const p = $("p", "q"); p.append($("span", "k", k + ".")); const t = $("span"); t.innerHTML = html; p.append(t); return p; }
const esc = s => s.replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const gapHtml = s => esc(s).replace("___", '<span class="gap">&nbsp;</span>');

/* typing item */
function typing(rec, i, wid, qNode, answers, opts = {}) {
  const key = keyOf(rec, i); rec.keys.push(key); reg();
  const it = $("div", "it"); it.append(qNode);
  const row = $("div", "row"); const inp = $("input", "inp"); inp.type = "text"; inp.autocomplete = "off"; inp.autocapitalize = "off"; inp.spellcheck = false; inp.setAttribute("autocorrect", "off");
  if (opts.ph) inp.placeholder = opts.ph;
  const b = $("button", "btn", "OK"); b.type = "button"; row.append(inp, b); it.append(row);
  const fb = $("div", "fb"); it.append(fb);
  const lock = (v, ok) => { inp.value = v; inp.disabled = true; b.disabled = true; b.style.display = "none"; inp.classList.add(ok ? "ok" : "bad");
    fb.className = "fb " + (ok ? "ok" : "bad"); fb.innerHTML = ok ? "Верно! " : 'Правильно: <span class="right">' + esc(answers[0]) + "</span>"; if (!ok) fb.append(sayBtn(answers[0])); };
  const check = () => { const v = inp.value.trim(); if (!v) return; const ok = answers.some(a => norm(a) === norm(v)); mark(key, wid, ok, v); lock(v, ok); say(answers[0]); };
  b.onclick = check; inp.onkeydown = e => { if (e.key === "Enter") check(); };
  if (S[key]) lock(S[key].v, S[key].ok);
  return it;
}
const hint = en => en.split(" ").map(p => p[0] + "_".repeat(Math.max(0, p.length - 1))).join("  ");

/* ===== 1. Flashcards ===== */
{
  const r = section("Новые слова", "Нажми на карточку — увидишь перевод. 🔊 — послушай, как звучит. Прочитай и проговори каждое слово вслух.");
  const g = $("div", "cards");
  W.forEach(w => { const c = $("button", "fc"); c.type = "button"; const inn = $("div", "fc-in"); const f = $("div", "fc-f"); f.append($("b", null, w.en)); if (w.note) f.append($("small", null, w.note));
    const bk = $("div", "fc-b", w.ru); inn.append(f, bk); c.append(inn, sayBtn(w.en)); c.onclick = () => { c.classList.toggle("flip"); if (c.classList.contains("flip")) say(w.en); }; g.append(c); });
  r.s.append(g); r.pill.textContent = W.length + " слов"; r.static = true;
}

/* ===== 2. Match ===== */
{
  const r = section("Соедини пары", "Нажми на английское слово, потом на его перевод.");
  const sh = shuffle(W); const groups = []; for (let i = 0; i < sh.length; i += 6) groups.push(sh.slice(i, i + 6));
  if (groups.length > 1 && groups[groups.length - 1].length < 3) { groups[groups.length - 2].push(...groups.pop()); }
  let idx = 0;
  groups.forEach(gr => {
    const box = $("div", "mgroup"); const L1 = $("div", "items"), R1 = $("div", "items"); L1.style.gap = R1.style.gap = "8px"; box.append(L1, R1);
    let sel = null; const miss = {};
    const items = gr.map(w => { const key = keyOf(r, idx++); r.keys.push(key); reg(); return { w, key }; });
    const lb = {}, rb = {};
    items.forEach(({ w, key }) => { const b = $("button", "opt", w.en); b.type = "button"; lb[w.id] = b; b.onclick = () => { if (b.classList.contains("gone")) return; Object.values(lb).forEach(x => x.classList.remove("sel")); b.classList.add("sel"); sel = { w, key }; say(w.en); }; L1.append(b); });
    shuffle(items).forEach(({ w }) => { const b = $("button", "opt", w.ru); b.type = "button"; rb[w.id] = b; R1.append(b);
      b.onclick = () => { if (!sel || b.classList.contains("gone")) return;
        if (sel.w.id === w.id) { lb[w.id].classList.remove("sel"); lb[w.id].classList.add("gone"); b.classList.add("gone"); mark(sel.key, w.id, !miss[w.id], w.ru); sel = null; }
        else { miss[sel.w.id] = true; b.classList.add("shake"); setTimeout(() => b.classList.remove("shake"), 400); } }; });
    items.forEach(({ w, key }) => { if (S[key]) { lb[w.id].classList.add("gone"); rb[w.id].classList.add("gone"); } });
    r.s.append(box);
  });
}

/* ===== 3. EN → RU ===== */
{
  const r = section("Выбери перевод", "Что значит это слово? Выбери правильный перевод.");
  const box = $("div", "items"); const ru = W.map(w => w.ru);
  shuffle(W).forEach((w, i) => { const q = qLine(i + 1, "<b>" + esc(w.en) + "</b>"); q.append(sayBtn(w.en)); box.append(mcq(r, i, w.id, q, shuffle([w.ru, ...pick(ru, 3, [w.ru])]), w.ru)); });
  r.s.append(box);
}

/* ===== 4. RU → EN ===== */
{
  const r = section("Как это по-английски?", "Выбери английское слово.");
  r.speak = true; const box = $("div", "items"); const en = W.map(w => w.en);
  shuffle(W).forEach((w, i) => { box.append(mcq(r, i, w.id, qLine(i + 1, esc(w.ru)), shuffle([w.en, ...pick(en, 3, [w.en])]), w.en)); });
  r.s.append(box);
}

/* ===== 5. Gap from the text ===== */
{
  const r = section("Вставь слово", "Это предложения из текста ОГЭ. Выбери слово, которое подходит по смыслу.");
  r.speak = true; const box = $("div", "items");
  shuffle(W.filter(w => w.gap)).forEach((w, i) => {
    const same = W.filter(x => x.pos === w.pos && x.id !== w.id).map(x => x.ans);
    const pool = same.length >= 3 ? same : W.filter(x => x.id !== w.id).map(x => x.ans);
    box.append(mcq(r, i, w.id, qLine(i + 1, gapHtml(w.gap)), shuffle([w.ans, ...pick(pool, 3, [w.ans])]), w.ans));
  });
  r.s.append(box);
}

/* ===== 6. Forms ===== */
if (L.forms && L.forms.length) {
  const r = section("Выбери правильную форму", "Посмотри на предложение: какое время, какое слово нужно — глагол, существительное или прилагательное?");
  r.speak = true; const box = $("div", "items");
  L.forms.forEach((f, i) => { const q = qLine(i + 1, gapHtml(f.s)); if (f.ru) { const s = $("div", "note", f.ru); s.style.margin = "2px 0 0"; q.append(s); } box.append(mcq(r, i, f.id, q, shuffle(f.o), f.a)); });
  r.s.append(box);
}

/* ===== 7. Scramble ===== */
{
  const r = section("Собери слово", "Нажимай на буквы по порядку. Ошибся — нажми на букву в ответе, она вернётся.");
  const box = $("div", "items");
  const list = shuffle(W.filter(w => /^[a-z]+$/i.test(w.en) && w.en.length >= 4)).slice(0, 15);
  list.forEach((w, i) => {
    const key = keyOf(r, i); r.keys.push(key); reg();
    const it = $("div", "it"); it.append(qLine(i + 1, esc(w.ru)));
    const slots = $("div", "slots"); const pool = $("div", "opts"); pool.style.gap = "5px"; it.append(slots, pool); const fb = $("div", "fb"); it.append(fb);
    let letters = shuffle([...w.en.toLowerCase()]); if (letters.join("") === w.en.toLowerCase()) letters = letters.reverse();
    let wrong = false; const chosen = [];
    const done = ok => { slots.innerHTML = ""; [...w.en].forEach(ch => { const t = $("span", "tile", ch); t.style.display = "inline-flex"; t.style.alignItems = "center"; t.style.justifyContent = "center"; slots.append(t); }); pool.remove(); fb.className = "fb " + (ok ? "ok" : "bad"); fb.textContent = ok ? "Верно! " : "Получилось со второй попытки "; fb.append(sayBtn(w.en)); slots.style.borderColor = ok ? "var(--ok)" : "var(--bad)"; };
    const tiles = letters.map(ch => { const t = $("button", "tile", ch); t.type = "button"; pool.append(t);
      t.onclick = () => { if (t.classList.contains("used")) return; t.classList.add("used"); const s = $("button", "tile", ch); s.type = "button"; slots.append(s); chosen.push({ t, s });
        s.onclick = () => { t.classList.remove("used"); s.remove(); chosen.splice(chosen.findIndex(c => c.s === s), 1); };
        if (chosen.length === letters.length) { const v = chosen.map(c => c.s.textContent).join("");
          if (v === w.en.toLowerCase()) { mark(key, w.id, !wrong, v); done(!wrong); say(w.en); }
          else { wrong = true; fb.className = "fb bad"; fb.textContent = "Не так. Нажми на буквы в ответе и попробуй ещё раз."; } } }; return t; });
    if (S[key]) done(S[key].ok);
    box.append(it);
  });
  r.s.append(box);
}

/* ===== 8. Type RU → EN ===== */
{
  const r = section("Напиши по-английски", "Подсказка показывает первую букву и сколько всего букв. Нажми OK или Enter.");
  const box = $("div", "items");
  shuffle(W).forEach((w, i) => box.append(typing(r, i, w.id, qLine(i + 1, esc(w.ru) + ' &nbsp;<span style="color:var(--muted);font-family:monospace;letter-spacing:2px">' + esc(hint(w.en)) + "</span>"), [w.en, ...(w.alt || [])])));
  r.s.append(box);
}

/* ===== 9. Listen & type ===== */
{
  const r = section("Послушай и напиши", "Нажми 🔊, послушай слово (можно несколько раз) и напиши его.");
  const box = $("div", "items");
  shuffle(W).slice(0, 15).forEach((w, i) => { const q = $("p", "q"); q.append($("span", "k", (i + 1) + ".")); const b = $("button", "btn ghost", "🔊 Слушать"); b.type = "button"; b.onclick = () => say(w.en); q.append(b); box.append(typing(r, i, w.id, q, [w.en, ...(w.alt || [])], { ph: "напиши, что услышал" })); });
  r.s.append(box);
}

/* ===== 10. Text with highlighted words ===== */
const forms = []; W.forEach(w => { [w.en, w.ans, ...(w.hl || [])].filter(Boolean).forEach(f => forms.push([f.toLowerCase(), w])); });
forms.sort((a, b) => b[0].length - a[0].length);
const re = new RegExp("\\b(" + forms.map(f => f[0].replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/'/g, "['’]")).join("|") + ")\\b", "gi");
const fmap = Object.fromEntries(forms.map(f => [f[0].replace(/’/g, "'"), f[1]]));
function hl(text) { return esc(text).replace(re, m => { const w = fmap[m.toLowerCase().replace(/’/g, "'")]; return w ? '<span class="w" data-ru="' + esc(w.ru) + '" data-en="' + esc(w.en) + '">' + m + "</span>" : m; }); }
const tip = $("div", "tip"); tip.style.display = "none"; document.body.append(tip);
document.addEventListener("click", e => { const t = e.target.closest(".w"); if (!t) { tip.style.display = "none"; return; } say(t.dataset.en); tip.textContent = t.dataset.ru; tip.style.display = "block"; const rc = t.getBoundingClientRect(); tip.style.left = Math.max(8, Math.min(innerWidth - 270, rc.left)) + "px"; tip.style.top = (rc.bottom + 6) + "px"; });
addEventListener("scroll", () => tip.style.display = "none", { passive: true });

{
  const r = section("Прочитай текст", "Это настоящий текст из ОГЭ. Новые слова выделены — нажми на слово, если забыл перевод. Теперь ты их знаешь!");
  r.static = true; r.pill.textContent = "📖";
  const t = $("div", "text");
  if (L.task.title) { const h = $("h3", null, L.task.title); h.style.margin = "0 0 10px"; h.style.textAlign = "center"; t.append(h); }
  if (L.task.parts) L.task.parts.forEach(p => { const el = $("p"); el.innerHTML = '<span class="lbl">' + p.l + "</span>" + hl(p.t); t.append(el); });
  else L.task.paras.forEach(p => { const el = $("p"); el.innerHTML = hl(p); t.append(el); });
  r.s.append(t);
}

/* ===== 11. OGE task ===== */
{
  const T = L.task;
  if (T.type === "headings") {
    const r = section("Задание ОГЭ", "Определи, в каком тексте A–F есть ответ на каждый вопрос 1–7. Один вопрос лишний. Можешь листать вверх и перечитывать текст.");
    const ol = $("ol", "qs"); T.questions.forEach(q => ol.append($("li", null, q))); r.s.append(ol);
    const sels = {};
    T.parts.forEach((p, i) => { const key = keyOf(r, i); r.keys.push(key); reg(); const row = $("div", "task-row"); row.append($("span", "lbl", p.l));
      const s = $("select"); s.append(new Option("— выбери вопрос —", "")); T.questions.forEach((q, j) => s.append(new Option((j + 1) + ". " + q, j + 1))); row.append(s); r.s.append(row); sels[p.l] = { s, key }; });
    const b = $("button", "btn teal", "Проверить"); b.type = "button"; const fb = $("div", "fb"); r.s.append(b, fb);
    const show = () => { let n = 0; T.parts.forEach(p => { const { s, key } = sels[p.l]; const v = S[key] ? S[key].v : s.value; s.value = v; const ok = +v === T.key[p.l]; if (ok) n++; s.className = ok ? "ok" : "bad"; s.disabled = true; }); b.style.display = "none"; fb.className = "fb " + (n === T.parts.length ? "ok" : "bad"); fb.innerHTML = "Правильно " + n + " из " + T.parts.length + ". " + (n < T.parts.length ? "Ответы: " + T.parts.map(p => p.l + "–" + T.key[p.l]).join(", ") + ". Лишний вопрос — " + T.extra + "." : "Отлично!"); };
    b.onclick = () => { if (T.parts.some(p => !sels[p.l].s.value)) { fb.className = "fb bad"; fb.textContent = "Выбери вопрос для каждого текста."; return; } T.parts.forEach(p => { const { s, key } = sels[p.l]; mark(key, null, +s.value === T.key[p.l], s.value); }); show(); };
    if (T.parts.every(p => S[sels[p.l].key])) show();
  } else {
    const r = section("Задание ОГЭ", "True — это сказано в тексте. False — в тексте сказано обратное. Not stated — в тексте об этом ничего нет.");
    const box = $("div", "items"); const lab = ["True", "False", "Not stated"];
    T.st.forEach((st, i) => box.append(mcq(r, i, null, qLine(i + 1, esc(st.s)), lab, lab[st.a - 1])));
    r.s.append(box);
  }
}

/* ===== 12. Mistakes ===== */
const errSec = section("Работа над ошибками", "Здесь собираются слова, в которых ты ошибся. Повтори их ещё раз, пока не получится без ошибок.");
errSec.static = true; errSec.pill.textContent = "🔁";
const errBox = $("div"); errSec.s.append(errBox);
function hardWords() { const h = {}; Object.values(S).forEach(x => { if (x.w && !x.ok) h[x.w] = 1; }); return Object.keys(h).filter(id => byId[id]).map(id => byId[id]); }
function renderErr() {
  errBox.innerHTML = ""; const hw = hardWords();
  if (!hw.length) { errBox.append($("p", "note", "Пока ошибок нет. Так держать! 💪")); return; }
  const chips = $("div", "hard"); hw.forEach(w => chips.append($("span", null, w.en + " — " + w.ru))); errBox.append(chips);
  const b = $("button", "btn", "Повторить трудные слова"); b.type = "button"; errBox.append(b);
  b.onclick = () => { b.remove(); const box = $("div", "items"); box.style.marginTop = "12px";
    shuffle(hw).forEach((w, i) => { const it = $("div", "it"); it.append(qLine(i + 1, esc(w.ru) + ' &nbsp;<span style="color:var(--muted);font-family:monospace;letter-spacing:2px">' + esc(hint(w.en)) + "</span>"));
      const row = $("div", "row"); const inp = $("input", "inp"); inp.autocapitalize = "off"; inp.autocomplete = "off"; inp.spellcheck = false; const ok = $("button", "btn", "OK"); ok.type = "button"; row.append(inp, ok); const fb = $("div", "fb"); it.append(row, fb);
      const chk = () => { const good = [w.en, ...(w.alt || [])].some(a => norm(a) === norm(inp.value)); say(w.en); if (good) { inp.className = "inp ok"; inp.disabled = true; ok.remove(); fb.className = "fb ok"; fb.textContent = "Верно!"; } else { inp.className = "inp bad"; fb.className = "fb bad"; fb.innerHTML = 'Правильно: <span class="right">' + esc(w.en) + "</span> — напиши ещё раз"; inp.value = ""; inp.focus(); } };
      ok.onclick = chk; inp.onkeydown = e => { if (e.key === "Enter") chk(); }; box.append(it); });
    errBox.append(box); };
}

/* ===== 13. Result ===== */
const fin = section("Мой результат", null); fin.static = true; fin.pill.textContent = "🏁";
const finBox = $("div"); fin.s.append(finBox);
function renderFin() {
  const done = Object.keys(S).length, ok = Object.values(S).filter(x => x.ok).length; const pct = done ? Math.round(ok / done * 100) : 0;
  finBox.innerHTML = "";
  finBox.append($("div", "big", ok + " / " + TOTAL));
  finBox.append($("p", "note", "Выполнено заданий: " + done + " из " + TOTAL + (done ? " · без ошибок: " + pct + "%" : "")));
  const a = $("div", "actions");
  const send = $("button", "btn teal", "Отправить результат учителю"); send.type = "button";
  send.onclick = async () => { const hw = hardWords(); const txt = "Давид · " + L.short + "\nСделано: " + done + " из " + TOTAL + ", правильно: " + ok + " (" + pct + "%)\n" + (hw.length ? "Трудные слова: " + hw.map(w => w.en).join(", ") : "Ошибок нет!");
    try { if (navigator.share) { await navigator.share({ text: txt }); return; } } catch (e) { if (e && e.name === "AbortError") return; }
    try { await navigator.clipboard.writeText(txt); send.textContent = "Скопировано — вставь в сообщение ✓"; } catch (e) { prompt("Скопируй и отправь:", txt); } };
  const reset = $("button", "btn ghost", "Начать заново"); reset.type = "button";
  reset.onclick = () => { if (confirm("Стереть все ответы и начать урок заново?")) { S = {}; save(); location.reload(); } };
  a.append(send, reset); finBox.append(a);
}

/* progress */
function upd() {
  const done = Object.keys(S).length;
  document.getElementById("cnt").innerHTML = done + " <small>/ " + TOTAL + "</small>";
  document.getElementById("fill").style.width = (TOTAL ? done / TOTAL * 100 : 0) + "%";
  sections.forEach(r => { if (r.static) return; const d = r.keys.filter(k => S[k]).length; r.pill.textContent = d + " / " + r.keys.length; r.pill.classList.toggle("done", d === r.keys.length); });
  renderErr(); renderFin();
}
upd();
})();
