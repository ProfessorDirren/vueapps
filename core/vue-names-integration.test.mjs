import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');

test('portal and router share the VUECORE display-name renderer',()=>{
 const portal=read('../index.html');
 const router=read('../apps/router.js');
 assert.match(portal,/import \{renderVueNames\} from '\.\/core\/vue-names\.js'/);
 assert.match(portal,/renderVueNames\(document,lang\)/);
 assert.match(router,/localizedVueName\(id,document\.documentElement\.lang\)\+' \('\+vueBrandName\(id\)/);
 assert.match(router,/vueTitle\(active\.domain\)/);
});
test('shared standalone planner names update on each render and language change',()=>{
 const tools=read('../apps/tools.js');
 assert.match(tools,/localizedVueName\(domain,language\)/);
 assert.match(tools,/document\.title=displayName/);
 assert.match(tools,/picker\.addEventListener\('change'/);
});
test('first visit remains English; existing explicit session selection is preserved',()=>{
 const portal=read('../index.html');
 assert.match(portal,/let initialLanguage="en"/);
 assert.match(portal,/sessionStorage\.getItem\(VUE_LANGUAGE_KEY\)/);
});

test('non-English ANYVUE standalone sessions use central VUECORE instead of English-only UI',()=>{
 const html=read('../anyvue.html');
 assert.match(html,/sessionStorage\.getItem\('vue-auto-language'\)\|\|sessionStorage\.getItem\('vue-language'\)/);
 assert.match(html,/language && language!=='en'/);
 assert.match(html,/location\.replace\('\.\/\?vue=anyvue#vue-router'\)/);
});
