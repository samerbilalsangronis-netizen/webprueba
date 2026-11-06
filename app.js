import {getClient,loadPublicProducts} from './backend.js';
import {escapeHTML as e,formatPrice,cleanBag} from './catalog-utils.mjs';
const $ = selector=>document.querySelector(selector);
let products=[],category='Todo',bag=[],demo=false,client,loading=false,catalogFailed=false,toastTimer;
const imageUrl=(product,width=700)=>product.images?.[0]||`https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=${width}&q=80`;
const priceText=product=>product.demo?'Precio por confirmar':formatPrice(product.price);
const normalize=value=>String(value).toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
try {const saved=JSON.parse(localStorage.getItem('aracnes-selection-v1')||localStorage.getItem('alto-selection-v1')||'[]');if(Array.isArray(saved))bag=saved;} catch {}

function renderProducts() {
  const query=normalize($('#search').value.trim());
  const visible=products.filter(product=>(category==='Todo'||category===product.category)&&normalize(`${product.name} ${product.category}`).includes(query));
  const order=$('#sort').value;
  if(order!=='featured')visible.sort((a,b)=>order==='az'?a.name.localeCompare(b.name,'es'):b.name.localeCompare(a.name,'es'));
  $('#products').innerHTML=visible.map(product=>`<article class="product"><div class="product-photo"><button class="product-photo-link" data-product="${e(product.id)}" aria-label="Ver ${e(product.name)}"><img src="${e(imageUrl(product))}" alt="${e(product.alt)}" loading="lazy"></button><span class="product-tag">${e(product.tag)}</span><button class="product-add" data-product="${e(product.id)}" aria-label="Ver detalles de ${e(product.name)}">+</button></div><div class="product-meta"><div><h3>${e(product.name)}</h3><p class="product-category">${e(product.category)}${product.in_stock===false?' · Agotado':''}</p>${product.demo?`<div class="swatches" aria-label="Paleta de referencia">${product.colors.filter(color=>/^#[\da-f]{6}$/i.test(color)).map(color=>`<span class="swatch" style="background:${color}"></span>`).join('')}</div>`:`<p class="product-category">${product.colors.map(e).join(' · ')}</p>`}</div><span class="price-label">${e(priceText(product))}</span></div></article>`).join('');
  $('#empty-results').hidden=visible.length>0||loading||catalogFailed;
  $('#empty-results').textContent=products.length?'No encontramos prendas con esa búsqueda. Prueba con otra palabra.':'La nueva colección estará disponible pronto. Escríbenos por WhatsApp para consultar.';
  $('#results').textContent=loading?'Cargando colección…':`${visible.length} de ${products.length} prendas${demo?' de muestra':''}`;
}
function openProduct(id) {
  const product=products.find(item=>item.id===id); if(!product)return;
  const images=product.images?.length?product.images:[imageUrl(product,1000)];
  $('#product-detail').innerHTML=`<div class="detail-layout"><div class="detail-gallery"><img id="detail-main-image" src="${e(images[0])}" alt="${e(product.alt)}">${images.length>1?`<div class="gallery-thumbs">${images.map((url,index)=>`<button type="button" data-gallery="${e(url)}" aria-label="Ver foto ${index+1} de ${e(product.name)}"><img src="${e(url)}" alt="Foto ${index+1}"></button>`).join('')}</div>`:''}</div><div class="detail-copy"><p class="eyebrow">${e(product.category)} / ${product.demo?'COLECCIÓN DE MUESTRA':'ARACNES'}</p><h2>${e(product.name)}</h2><p class="detail-price">${e(priceText(product))}</p><p class="product-description">${e(product.description)}</p>${product.demo?'<p>Imagen ilustrativa. Precio, material, colores y disponibilidad por confirmar con la tienda.</p>':`<p>${product.colors.length?`Colores: ${product.colors.map(e).join(', ')}.`:''} Confirma disponibilidad por WhatsApp.</p>`}<label for="product-size">${product.demo?'Elige una talla de referencia':'Elige tu talla'}</label><select id="product-size">${product.sizes.map(size=>`<option>${e(size)}</option>`).join('')}</select><button class="button dark" id="add-to-bag" ${product.in_stock===false?'disabled':''}>${product.in_stock===false?'Prenda agotada':'Añadir a mi selección'} <svg><use href="#i-arrow"/></svg></button><p>Sin pagos ni reservas. Consulta tu selección por WhatsApp.</p></div></div>`;
  $('#add-to-bag').addEventListener('click',()=>{
    if(product.in_stock===false)return;
    const size=$('#product-size').value;
    if(bag.some(item=>item.id===id && item.size===size)){toast('Esta prenda y talla ya están en tu bolsa.');return;}
    bag.push({id,size});persistBag();$('#product-dialog').close();toast('Prenda añadida a tu selección.');
  });
  $('#product-dialog').showModal();
}
function persistBag() {
  bag=cleanBag(bag,products);
  try{localStorage.setItem('aracnes-selection-v1',JSON.stringify(bag));}catch{toast('La selección se guardará solo durante esta visita.');}
  renderBag();
}
function selectionLines(){return bag.map((item,index)=>{const product=products.find(product=>product.id===item.id);return `${index+1}. ${product.name} — Talla ${item.size} — ${priceText(product)}`;});}
function renderBag() {
  bag=cleanBag(bag,products);
  $('#bag-count').textContent=String(bag.length);
  $('#bag-open').setAttribute('aria-label',`Abrir mi bolsa: ${bag.length} prendas`);
  $('#bag-items').innerHTML=bag.length?bag.map((item,index)=>{
    const product=products.find(product=>product.id===item.id);
    return `<div class="bag-item"><img src="${e(imageUrl(product,200))}" alt="${e(product.alt)}"><div><h3>${e(product.name)}</h3><p>Talla: ${e(item.size)}<br>${e(priceText(product))}</p></div><button data-remove="${index}" aria-label="Quitar ${e(product.name)}, talla ${e(item.size)}">Quitar</button></div>`;
  }).join(''):'<p class="bag-note">Tu bolsa está esperando tus favoritos. Explora la colección y añade alguna prenda.</p><button class="text-link" data-close="bag-dialog">Seguir explorando →</button>';
  $('#download-selection').disabled=!bag.length;
  const message=[`Hola, ARACNES. Quisiera consultar estas prendas de su catálogo${demo?' de muestra':''}:`,'',...selectionLines(),'','¿Podrían confirmarme los precios y la disponibilidad?'].join('\n');
  $('#whatsapp-selection').href=`https://wa.me/584126024425?text=${encodeURIComponent(message)}`;
  $('#whatsapp-selection').hidden=!bag.length;
}
function toast(message){$('#toast').textContent=message;$('#toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('#toast').classList.remove('show'),3500);}
async function loadCatalog() {
  if(loading)return;loading=true;catalogFailed=false;
  $('#catalog-retry').hidden=true;
  $('#catalog-note').textContent='Cargando colección…';
  try {
    client=await getClient();
    if(client){demo=false;products=await loadPublicProducts(client);}
    else{demo=true;const {demoProducts}=await import('./demo-products.js');products=demoProducts.map(product=>({...product,demo:true,in_stock:true}));}
    $('#catalog-note').textContent=demo?'Catálogo de muestra · Las prendas, fotos y tallas son ilustrativas. Disponibilidad y precios por confirmar.':'Colección ARACNES · Consulta precios y disponibilidad por WhatsApp.';
    $('#collection-label').textContent=demo?'COLECCIÓN DE MUESTRA':'MODA EN LA GRITA';
    $('#footer-catalog-label').textContent=demo?'Catálogo de muestra':'Ropa con estilo propio';
    persistBag();
  } catch {
    catalogFailed=true;products=[];
    $('#catalog-note').textContent='No se pudo actualizar la colección. Vuelve a intentarlo o consulta por WhatsApp.';
    $('#catalog-retry').hidden=false;
    // No sustituir el catálogo real por productos ficticios durante un fallo.
    $('#bag-count').textContent='0';$('#bag-items').replaceChildren();$('#whatsapp-selection').hidden=true;$('#download-selection').disabled=true;
  } finally{loading=false;renderProducts();}
}
document.addEventListener('click',event=>{
  const product=event.target.closest('[data-product]');if(product)openProduct(product.dataset.product);
  const gallery=event.target.closest('[data-gallery]');if(gallery)$('#detail-main-image').src=gallery.dataset.gallery;
  const closer=event.target.closest('[data-close]');if(closer)document.getElementById(closer.dataset.close).close();
  const remove=event.target.closest('[data-remove]');if(remove){bag.splice(Number(remove.dataset.remove),1);persistBag();}
});
document.querySelectorAll('[data-category]').forEach(button=>button.addEventListener('click',()=>{category=button.dataset.category;document.querySelectorAll('[data-category]').forEach(item=>{const active=item===button;item.classList.toggle('active',active);item.setAttribute('aria-pressed',String(active));});renderProducts();}));
$('#search-open').addEventListener('click',()=>{$('#search-form').hidden=false;$('#catalogo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});$('#search').focus({preventScroll:true});});
$('#search').addEventListener('input',renderProducts);
$('#search-clear').addEventListener('click',()=>{$('#search').value='';renderProducts();$('#search').focus();});
$('#search-form').addEventListener('submit',event=>event.preventDefault());
$('#sort').addEventListener('change',renderProducts);
$('#bag-open').addEventListener('click',()=>{if(loading){toast('Espera mientras carga la colección.');return;}renderBag();$('#bag-dialog').showModal();});
document.querySelectorAll('dialog').forEach(dialog=>dialog.addEventListener('click',event=>{if(event.target===dialog){const rect=dialog.getBoundingClientRect();if(event.clientX<rect.left||event.clientX>rect.right||event.clientY<rect.top||event.clientY>rect.bottom)dialog.close();}}));
$('#download-selection').addEventListener('click',()=>{
  if(!bag.length)return;
  const text=[`ARACNES · Mi selección${demo?' de muestra':''}`,'La Grita, Táchira','',...selectionLines(),'','Precios y disponibilidad por confirmar.','Este documento no es un pedido, una reserva ni un comprobante de pago.'].join('\n');
  const url=URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const anchor=document.createElement('a');anchor.href=url;anchor.download='aracnes-mi-seleccion.txt';document.body.append(anchor);anchor.click();anchor.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('Tu selección se ha descargado.');
});
$('#catalog-retry').addEventListener('click',()=>location.reload());
$('#year').textContent=String(new Date().getFullYear());
await loadCatalog();
// Al volver de WhatsApp u otra pestaña, recoger cambios publicados por la dueña.
window.addEventListener('focus',()=>{if(client&&!document.querySelector('dialog[open]'))loadCatalog();});
