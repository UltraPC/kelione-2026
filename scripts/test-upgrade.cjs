const {chromium}=require(process.env.PLAYWRIGHT_PATH||'playwright');
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),cp=require('node:child_process');
(async()=>{
 let legacy=true,newIndexFetched=false;const root=path.resolve(__dirname,'..'),old={};
 for(const file of ['index.html','sw.js','app-v5.js','app-v5.css','manifest.webmanifest','icon.svg'])old[file]=cp.execFileSync('git',['show','c194138f8bf9f37438ba39396c5e20c10e5b8ca4:'+file],{cwd:root,maxBuffer:10000000});
 old['sw.js']=Buffer.from(old['sw.js'].toString().replace(/const EXTERNAL=\[[^;]+;/,'const EXTERNAL=[];').replace('await client.navigate(client.url)','void client.url')); // Baseline setup: disable optional CDN and automatic activation navigation; cached fetch/transform logic remains the original v5.
 const server=http.createServer((req,res)=>{const rel=new URL(req.url,'http://localhost').pathname.replace(/^\/kelione-2026\//,'')||'index.html';if(!legacy&&rel==='index.html')newIndexFetched=true;const file=path.resolve(root,rel);if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return}let data;try{data=legacy?old[rel]:fs.readFileSync(file);if(!data)throw Error()}catch{res.writeHead(404);res.end();return}res.setHeader('Content-Type',({'.js':'application/javascript','.json':'application/json','.html':'text/html','.css':'text/css'})[path.extname(file)]||'application/octet-stream');res.end(data)});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));server.unref();
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH,headless:true,args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});const context=await browser.newContext();
 await context.route('https://**/*',route=>route.abort());const page=await context.newPage();const base=`http://127.0.0.1:${server.address().port}/kelione-2026/`;
 await page.goto(base,{waitUntil:'domcontentloaded'});await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await page.locator('script[src="./app-v5.js"]').waitFor({state:'attached',timeout:5000});await page.locator('.visit-btn').first().waitFor();
 await page.evaluate(()=>localStorage.setItem('kelione2026.visited.v1','["d1-s1","d2-s1"]'));
 legacy=false;await page.evaluate(async()=>{const r=await navigator.serviceWorker.getRegistration();await r.update()});
 await page.reload();await new Promise((resolve,reject)=>{const timer=setInterval(()=>{if(newIndexFetched){clearInterval(timer);resolve()}},50);setTimeout(()=>{clearInterval(timer);reject(Error('new shell not fetched'))},15000).unref()});
 await page.reload();await page.getByRole('button',{name:'Įjungti naują versiją',exact:true}).click();await page.locator('#tripSelect').waitFor();await page.waitForFunction(()=>!!window.TRIP_CONFIG);
 await page.locator('.visit-btn').first().waitFor();assert.equal(await page.locator('.step.visited').count(),2);assert.equal(await page.locator('.visit-btn').count(),65);assert.equal(await page.locator('#activeDayBar').count(),1);
 assert.equal(await page.evaluate(()=>localStorage.getItem('kelione2026.visited.v1')),'["d1-s1","d2-s1"]');
 console.log('PASS v5 → stage4: old cached shell transition, explicit update, 65 single buttons, migrated 2 visited stops and intact original.');await browser.close();server.close();
})().catch(e=>{console.error(e);process.exit(1)});
