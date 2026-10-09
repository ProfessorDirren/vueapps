import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
const page=readFileSync(new URL("../slumpvue.html",import.meta.url),"utf8");
const home=readFileSync(new URL("../index.html",import.meta.url),"utf8");
test("SLUMPVUE exists and is linked from homepage",()=>{assert.match(home,/href="\.\/slumpvue\.html"/);assert.match(page,/SLUMPVUE/);assert.match(home,/SLUMPVUE/);});
test("all seven language choices and readable Chinese/Russian labels retained",()=>{for(const [id,label] of Object.entries({en:"English",es:"Español",sv:"Svenska",hi:"हिन्दी","zh-CN":"简体中文 (Chinese)",ru:"Русский (Russian)",ar:"العربية"})){assert.ok(page.includes('<option value="'+id+'">'+label+'</option>'));assert.ok(home.includes('<option value="'+id+'">'+label+'</option>'));}assert.match(page,/<html lang="en">/);assert.match(page,/lang==="ar"\?"rtl":"ltr"/);assert.match(page,/vueapps-language-v2/);});
test("no provider calls, user input submission or analytics in the surprise app",()=>{assert.doesNotMatch(page,/fetch\s*\(|XMLHttpRequest|sendBeacon|<form|<input|api\/|OPENAI_API_KEY/);});
test("seven categories and curated content",()=>{assert.match(page,/const seeds=\[/);assert.match(page,/const extra=/);assert.match(page,/const labels=/);assert.match(page,/getRandomValues/);assert.match(page,/aria-live="polite"/);assert.match(page,/navigator.clipboard.writeText/);});

test("SLUMPVUE opens in English regardless of a saved portal language",()=>{assert.match(page,/let lang="en"/);assert.match(page,/picker\.value="en";render\(\)/);assert.doesNotMatch(page,/localStorage\.getItem\("vueapps-language-v2"\)/);assert.match(page,/picker\.addEventListener\("change"/);});
