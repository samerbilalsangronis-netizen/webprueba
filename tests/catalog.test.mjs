import test from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {escapeHTML,validateProduct,cleanBag} from '../catalog-utils.mjs';
import {loadPublicProducts} from '../backend.js';
const require=createRequire(import.meta.url);
const {publicConfig}=require('../api/config.js');
const valid={name:'Blusa',description:'Lino',category:'Mujer',price:'25.50',sizes:'S, M, S',colors:'Beige, Negro',status:'published',in_stock:true};
test('validar producto real sin alterar tallas y precio',()=>{
  assert.deepEqual(validateProduct(valid),{name:'Blusa',description:'Lino',category:'Mujer',price:25.5,sizes:['S','M'],colors:['Beige','Negro'],status:'published',in_stock:true});
  assert.equal(validateProduct({...valid,price:''}).price,null);
  assert.equal(validateProduct({...valid,price:'12,50'}).price,12.5);
  assert.equal(validateProduct({...valid,price:'0'}).price,0);
});
test('rechazar valores inválidos antes de subir fotos',()=>{
  for(const patch of [{name:''},{name:'a'.repeat(121)},{price:'-1'},{price:'Infinity'},{price:'1.001'},{price:'1e3'},{price:'1000000'},{sizes:''},{status:'public'},{category:'Otra'}]) assert.throws(()=>validateProduct({...valid,...patch}));
});
test('escapar contenido de la administradora en atributos y texto',()=>{
  assert.equal(escapeHTML('<img src=x onerror="alert(1)"> & \'x\''),'&lt;img src=x onerror=&quot;alert(1)&quot;&gt; &amp; &#39;x&#39;');
});
test('quitar de la bolsa prendas borradas, agotadas, tallas retiradas y duplicados',()=>{
  const products=[{id:'1',sizes:['S'],in_stock:true},{id:'2',sizes:['M'],in_stock:false}];
  assert.deepEqual(cleanBag([null,{id:'1',size:'S'},{id:'1',size:'S'},{id:'1',size:'L'},{id:'2',size:'M'},{id:'deleted',size:'S'}],products),[{id:'1',size:'S'}]);
});
test('configuración publica solo claves de cliente y rechaza credenciales privilegiadas',()=>{
  assert.deepEqual(publicConfig({}),{configured:false});
  assert.equal(publicConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}).configured,true);
  const key=role=>`header.${Buffer.from(JSON.stringify({role})).toString('base64url')}.signature`;
  assert.equal(publicConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_ANON_KEY:key('anon')}).key,key('anon'));
  for(const value of ['sb_secret_test',key('service_role'),'']) assert.throws(()=>publicConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:value}));
  assert.throws(()=>publicConfig({SUPABASE_URL:'http://example.com',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test'}));
  const config=publicConfig({SUPABASE_URL:'https://example.supabase.co',SUPABASE_PUBLISHABLE_KEY:'sb_publishable_test',SUPABASE_SERVICE_ROLE_KEY:'private'});
  assert.equal(JSON.stringify(config).includes('private'),false);
});
test('el catálogo pide solo productos publicados y genera URLs del bucket correcto',async()=>{
  const calls=[];
  const query={select(fields){calls.push(['select',fields]);return this;},eq(...args){calls.push(['eq',...args]);return this;},order(){return this;},async range(){return {data:[{id:'1',name:'Blusa',image_paths:['owner/a.webp'],in_stock:true}],error:null};}};
  const client={from(table){assert.equal(table,'aracnes_products');return query;},storage:{from(bucket){assert.equal(bucket,'aracnes-products');return {getPublicUrl:path=>({data:{publicUrl:`https://test.supabase.co/${path}`}})};}}};
  const products=await loadPublicProducts(client);
  assert.ok(calls.some(call=>call[0]==='eq'&&call[1]==='status'&&call[2]==='published'));
  assert.deepEqual(products[0].images,['https://test.supabase.co/owner/a.webp']);
  assert.equal(products[0].demo,false);
});
