import sys, os, re, html, glob, json, subprocess
base = os.path.dirname(os.path.abspath(__file__)); root = os.path.dirname(base)
css = open(os.path.join(base, 'style.css')).read(); eng = open(os.path.join(base, 'engine.js')).read()
e = html.escape
lessons = []
for f in sorted(glob.glob(os.path.join(base, 'lessons', '*.js'))):
    src = open(f).read()
    meta = json.loads(subprocess.check_output(['node', '-e', src + '\nconsole.log(JSON.stringify({id:L.id,short:L.short,eyebrow:L.eyebrow,title:L.title,sub:L.sub,n:L.words.length}))']))
    lessons.append(meta)
    page = f'''<!DOCTYPE html>
<html lang="ru"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<title>{e(meta["short"])} · Давид · ОГЭ</title>
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap">
<style>{css}</style></head><body>
<header class="hero wrap"><p class="eyebrow">{e(meta["eyebrow"])}</p><h1>{e(meta["title"])}</h1><p class="sub">{e(meta["sub"])}</p></header>
<div class="bar"><div class="wrap"><nav class="tabs" id="tabs"></nav><div class="prog"><div class="track"><div class="fill" id="fill"></div></div><span class="count" id="cnt"></span></div></div></div>
<main class="wrap" id="main"></main>
<footer class="wrap"><a href="./" style="color:inherit">Все уроки</a> · Ответы сохраняются в этом браузере</footer>
<script>
{src}
{eng}
</script></body></html>'''
    open(os.path.join(root, meta['id'] + '.html'), 'w').write(page)
rows = ''.join(f'<a class="ex" style="display:block;text-decoration:none;color:inherit" href="{m["id"]}.html"><p class="eyebrow">{e(m["eyebrow"])}</p><h2>{e(m["title"])}</h2><p class="note">{m["n"]} слов</p></a>' for m in lessons)
idx = f'''<!DOCTYPE html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Давид · Слова ОГЭ</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap"><style>{css}</style></head><body>
<header class="hero wrap"><p class="eyebrow">ОГЭ · Английский</p><h1>Давид · Слова из текстов ОГЭ</h1><p class="sub">Один урок — один текст из ОГЭ и 30 новых слов.</p></header>
<main class="wrap">{rows}</main></body></html>'''
open(os.path.join(root, 'index.html'), 'w').write(idx)
print('built', [m['id'] for m in lessons])
