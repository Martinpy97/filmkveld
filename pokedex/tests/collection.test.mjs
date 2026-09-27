import {test} from 'node:test';
import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {mkdtemp,rm,readFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createServer} from 'node:net';
import {request} from 'node:http';

test('Local Docker collection, cards, HTTP boundaries and durable restart',async t=>{
 const data=await mkdtemp(join(tmpdir(),'pokedex-test-'));
 let base=process.env.POKEDEX_TEST_URL,child;
 if(!base){const socket=createServer();socket.listen(0,'127.0.0.1');await once(socket,'listening');base=`http://127.0.0.1:${socket.address().port}`;await new Promise(r=>socket.close(r));}
 const start=async()=>{
  child=spawn(process.execPath,['dist/server.mjs'],{env:{...process.env,HOST:'127.0.0.1',PORT:new URL(base).port,POKEDEX_DATA_DIR:data,POKEDEX_ALLOWED_ORIGINS:'http://192.0.2.20:8784'},stdio:['ignore','pipe','pipe']});
  await new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('Startup timeout')),10000);child.stdout.on('data',d=>{if(String(d).includes('Pokédex er klar')){clearTimeout(timer);resolve();}});child.once('exit',c=>{clearTimeout(timer);reject(Error(`Server exited ${c}`));});child.stderr.on('data',()=>{});});
 };
 const stop=async()=>{if(child&&child.exitCode===null){const exit=once(child,'exit');child.kill('SIGTERM');await exit;}};
 const call=(path,{method='GET',body,headers={}}={})=>new Promise((resolve,reject)=>{
  const r=request(base+path,{method,headers:{'Content-Type':'application/json',...headers}},res=>{let text='';res.setEncoding('utf8');res.on('data',p=>text+=p);res.on('end',()=>{let json;try{json=JSON.parse(text);}catch{}resolve({status:res.statusCode,headers:res.headers,json,text});});});r.on('error',reject);r.end(body===undefined?undefined:typeof body==='string'?body:JSON.stringify(body));
 });
 const change=async(path,body)=>{const r=await call(path,{method:'PUT',body});assert.equal(r.status,200,r.text);return r.json;};
 try{
  if(!process.env.POKEDEX_TEST_URL)await start();
  await t.test('root, species and set deep links work on HTTP',async()=>{for(const p of ['/','/pokemon/1','/mastersett','/mastersett/sv03.5']){const r=await call(p);assert.equal(r.status,200);assert.match(r.text,/assets\/index-/);}});
  await t.test('unknown page and private paths do not become the SPA',async()=>{for(const p of ['/pokemon/1026','/mastersett/unknown','/.env','/migrations/0000_cool_goblin_queen.sql'])assert.equal((await call(p)).status,404);});
  await t.test('all 1025 species images exist in delivery',async()=>{const c=JSON.parse(await readFile('lib/catalog.json'));assert.equal(c.length,1025);for(let i=0;i<c.length;i++){assert.equal(c[i].id,i+1);assert.ok((await readFile('public'+c[i].image)).length>100);}});
  await t.test('fresh collections are empty',async()=>{assert.deepEqual((await call('/api/collection')).json,{owned:{},wanted:{}});assert.deepEqual((await call('/api/tcg/collection')).json,{owned:{},sets:{},progress:{}});});
  await t.test('personal responses are never cached',async()=>assert.match((await call('/api/collection')).headers['cache-control'],/no-store/));
  await t.test('wishlist becomes owned and cannot reappear while owned',async()=>{assert.ok((await change('/api/collection',{pokemonId:25,field:'wanted',value:true})).wanted[25]);const c=await change('/api/collection',{pokemonId:25,field:'owned',value:true});assert.ok(c.owned[25]);assert.equal(c.wanted[25],undefined);assert.equal((await change('/api/collection',{pokemonId:25,field:'wanted',value:true})).wanted[25],undefined);});
  const ownedAt=(await call('/api/collection')).json.owned[25];
  await t.test('repeated check preserves ownership date',async()=>assert.equal((await change('/api/collection',{pokemonId:25,field:'owned',value:true})).owned[25],ownedAt));
  await t.test('client identity headers cannot select another collection',async()=>assert.equal((await call('/api/collection',{headers:{'oai-authenticated-user-id':'other'}})).json.owned[25],ownedAt));
  const catalog=(await call('/api/tcg/catalog?setId=sv03.5')).json;
  const card=catalog.cards.find(c=>c.id==='sv03.5-001');const normal=card.variants.find(v=>v.label==='Normal')||card.variants[0],reverse=card.variants.find(v=>/reverse/i.test(v.label));assert.ok(reverse);
  const mutation={kind:'card',id:card.id,variantId:normal.id,value:true};
  await t.test('151 includes 207 cards in collector order, Trainers and Energy',async()=>{assert.equal(catalog.sets.length,201);assert.equal(catalog.cards.length,207);assert.equal(catalog.cards[0].number,'001');assert.equal(catalog.cards.at(-1).number,'207');assert.ok(catalog.cards.some(c=>c.category==='Trainer'));assert.ok(catalog.cards.some(c=>c.category==='Energy'));});
  await t.test('species and set use the same card and variant identities',async()=>{const c=(await call('/api/tcg/catalog?pokemonId=1')).json.cards;assert.deepEqual(c.find(c=>c.id===card.id),card);assert.ok(c.every(c=>c.dexIds.includes(1)));});
  await t.test('masterset tracks standard variants and shared ownership',async()=>{await change('/api/tcg/collection',{kind:'set',id:'sv03.5',scope:'standard',value:true});const c=await change('/api/tcg/collection',mutation);assert.deepEqual(c.progress['sv03.5'],{owned:1,total:360});});
  await t.test('normal and reverse are counted separately',async()=>{const c=await change('/api/tcg/collection',{...mutation,variantId:reverse.id});assert.equal(c.progress['sv03.5'].owned,2);assert.ok(c.owned[`${card.id}:${normal.id}`]);assert.ok(c.owned[`${card.id}:${reverse.id}`]);});
  await t.test('all variants change denominator without losing cards',async()=>{const c=await change('/api/tcg/collection',{kind:'set',id:'sv03.5',scope:'all',value:true});assert.deepEqual(c.progress['sv03.5'],{owned:2,total:382});});
  await t.test('untracking set preserves cards',async()=>{const c=await change('/api/tcg/collection',{kind:'set',id:'sv03.5',scope:'all',value:false});assert.equal(c.sets['sv03.5'],undefined);assert.equal(Object.keys(c.owned).length,2);});
  await change('/api/tcg/collection',{kind:'set',id:'sv03.5',scope:'standard',value:true});
  const before={species:(await call('/api/collection')).json,tcg:(await call('/api/tcg/collection')).json};
  const invalid=[null,[],{},'{broken',{...mutation,variantId:'unknown'},{...mutation,id:'unknown'},{...mutation,value:'true'},{...mutation,userId:'other'},{kind:'set',id:'sv03.5',scope:'bad',value:true}];
  for(const body of invalid)await t.test(`reject invalid card mutation ${JSON.stringify(body)}`,async()=>assert.equal((await call('/api/tcg/collection',{method:'PUT',body:body===null?'null':body})).status,400));
  await t.test('reject invalid species data',async()=>{for(const body of [{pokemonId:1026,field:'owned',value:true},{pokemonId:'25',field:'owned',value:true},{pokemonId:25,field:'owned',value:'true'}])assert.equal((await call('/api/collection',{method:'PUT',body})).status,400);});
  await t.test('reject invalid catalog queries',async()=>{for(const q of ['setId=unknown','pokemonId=1026','pokemonId=1&setId=sv03.5'])assert.equal((await call('/api/tcg/catalog?'+q)).status,400);});
  await t.test('reject unsupported method, media type and oversized body',async()=>{assert.equal((await call('/api/collection',{method:'DELETE'})).status,405);assert.equal((await call('/api/tcg/collection',{method:'PUT',body:mutation,headers:{'Content-Type':'text/plain'}})).status,415);assert.equal((await call('/api/tcg/collection',{method:'PUT',body:'x'.repeat(5000)})).status,413);});
  for(const headers of [{Origin:'https://evil.example'},{'Sec-Fetch-Site':'cross-site'},{Host:'evil.example'},{Host:'evil.example','X-Forwarded-Host':new URL(base).host}])await t.test(`reject foreign request ${JSON.stringify(headers)}`,async()=>assert.equal((await call('/api/tcg/collection',{method:'PUT',body:{...mutation,value:false},headers})).status,403));
  await t.test('explicit NAS HTTP origin works',async()=>assert.equal((await call('/api/collection',{headers:{Host:'192.0.2.20:8784',Origin:'http://192.0.2.20:8784'}})).status,200));
  await t.test('rejected writes did not change collection',async()=>assert.deepEqual((await call('/api/tcg/collection')).json,before.tcg));
  if(!process.env.POKEDEX_TEST_URL)await t.test('both collections and migrations survive process replacement',async()=>{await stop();await start();assert.deepEqual((await call('/api/collection')).json,before.species);assert.deepEqual((await call('/api/tcg/collection')).json,before.tcg);});
  await t.test('uncheck changes only selected variant',async()=>{const c=await change('/api/tcg/collection',{...mutation,value:false});assert.equal(c.owned[`${card.id}:${normal.id}`],undefined);assert.ok(c.owned[`${card.id}:${reverse.id}`]);});
 }finally{await stop();await rm(data,{recursive:true,force:true});}
});
