'use strict';

// Sustituir estos datos ilustrativos por el catálogo real antes de abrir ventas.
const products = [
  {id:'camisa-lino',name:'Camisa de lino',category:'Mujer',tag:'ESENCIAL',image:'photo-1598554747436-c9293d6a588f',alt:'Camisa clara de estilo casual',colors:['#e1d6bf','#e8e5dc'],sizes:['S','M','L'],description:'Una silueta relajada para combinar con tus básicos favoritos.'},
  {id:'camiseta-esencial',name:'Camiseta esencial',category:'Hombre',tag:'DE TODOS LOS DÍAS',image:'photo-1521572163474-6864f9cf17ab',alt:'Camiseta blanca básica',colors:['#e7e5dd','#30342b','#acaa9a'],sizes:['S','M','L','XL'],description:'Un básico de líneas sencillas, listo para acompañarte a tu ritmo.'},
  {id:'denim-recto',name:'Denim de siempre',category:'Mujer',tag:'EL FAVORITO',image:'photo-1542272604-787c3835535d',alt:'Pantalones de mezclilla azul',colors:['#728d9b','#34495b'],sizes:['26','28','30','32'],description:'Denim de inspiración clásica para crear combinaciones sin complicaciones.'},
  {id:'bolso-cotidiano',name:'Bolso cotidiano',category:'Accesorios',tag:'EL TOQUE FINAL',image:'photo-1553062407-98eeb64c6a62',alt:'Bolso de uso cotidiano',colors:['#b48652','#34312d'],sizes:['Única'],description:'Un complemento para llevar contigo lo que hace parte de tu día.'},
  {id:'chaqueta-urbana',name:'Chaqueta urbana',category:'Hombre',tag:'EN CAPAS',image:'photo-1551028719-00167b16eac5',alt:'Chaqueta oscura',colors:['#302f2b','#6d705b'],sizes:['S','M','L','XL'],description:'Una capa con carácter para darle un giro a un conjunto sencillo.'},
  {id:'vestido-libre',name:'Vestido libre',category:'Mujer',tag:'A TU AIRE',image:'photo-1515372039744-b8f02a3ae446',alt:'Vestido ligero de mujer',colors:['#d9ba9d','#b67766'],sizes:['S','M','L'],description:'Una propuesta ligera para esos planes que no necesitan mucho más.'},
  {id:'camisa-relajada',name:'Camisa relajada',category:'Hombre',tag:'SIN PRISA',image:'photo-1596755094514-f87e34085b2c',alt:'Camisa de botones',colors:['#cbd6dc','#eee9db'],sizes:['S','M','L','XL'],description:'Una camisa versátil que puedes llevar sola o con tu camiseta favorita.'},
  {id:'gafas-sol',name:'Gafas de sol',category:'Accesorios',tag:'OTRA MIRADA',image:'photo-1511499767150-a48a237f0083',alt:'Gafas de sol con montura oscura',colors:['#33312a','#946c47'],sizes:['Única'],description:'El detalle que completa tu combinación y expresa tu personalidad.'}
];
const $ = selector => document.querySelector(selector);
const imageUrl = (product, width=700) => `https://images.unsplash.com/${product.image}?auto=format&fit=crop&w=${width}&q=80`;
let category = 'Todo';
let bag = [];
try {
  const saved = JSON.parse(localStorage.getItem('aracnes-selection-v1') || localStorage.getItem('alto-selection-v1') || '[]');
  if (Array.isArray(saved)) bag = saved.filter(item => item && products.some(p => p.id === item.id && p.sizes.includes(item.size))).map(item => ({id:item.id,size:item.size})).filter((item,index,items) => items.findIndex(other => other.id === item.id && other.size === item.size) === index);
} catch { /* El catálogo también funciona si el almacenamiento no está disponible. */ }

function renderProducts() {
  const query = $('#search').value.trim().toLocaleLowerCase('es');
  const normalize = value => value.toLocaleLowerCase('es').normalize('NFD').replace(/[\u0300-\u036f]/g,'');
  let visible = products.filter(p => (category === 'Todo' || category === p.category) && normalize(`${p.name} ${p.category}`).includes(normalize(query)));
  const order = $('#sort').value;
  if (order !== 'featured') visible.sort((a,b) => order === 'az' ? a.name.localeCompare(b.name,'es') : b.name.localeCompare(a.name,'es'));
  $('#products').innerHTML = visible.map(p => `<article class="product"><div class="product-photo"><button class="product-photo-link" data-product="${p.id}" aria-label="Ver ${p.name}"><img src="${imageUrl(p)}" alt="${p.alt}" loading="lazy"></button><span class="product-tag">${p.tag}</span><button class="product-add" data-product="${p.id}" aria-label="Elegir talla de ${p.name}">+</button></div><div class="product-meta"><div><h3>${p.name}</h3><p class="product-category">${p.category}</p><div class="swatches" aria-label="Paleta de referencia">${p.colors.map(c=>`<span class="swatch" style="background:${c}"></span>`).join('')}</div></div><span class="price-label">Precio por confirmar</span></div></article>`).join('');
  $('#empty-results').hidden = visible.length > 0;
  $('#results').textContent = `${visible.length} de ${products.length} prendas de muestra`;
}

function openProduct(id) {
  const product = products.find(p => p.id === id);
  if (!product) return;
  $('#product-detail').innerHTML = `<div class="detail-layout"><img src="${imageUrl(product,1000)}" alt="${product.alt}"><div class="detail-copy"><p class="eyebrow">${product.category} / COLECCIÓN DE MUESTRA</p><h2>${product.name}</h2><p>${product.description}</p><p>Imagen ilustrativa. Precio, material, colores y disponibilidad por confirmar con la tienda.</p><label for="product-size">Elige una talla de referencia</label><select id="product-size">${product.sizes.map(size=>`<option>${size}</option>`).join('')}</select><button class="button dark" id="add-to-bag">Añadir a mi selección <svg><use href="#i-arrow"/></svg></button><p>Sin pagos ni reservas. Solo estás creando tu selección.</p></div></div>`;
  $('#add-to-bag').addEventListener('click', () => {
    const size = $('#product-size').value;
    if (bag.some(item => item.id === id && item.size === size)) { toast('Esta prenda y talla ya están en tu bolsa.'); return; }
    bag.push({id,size});
    persistBag();
    $('#product-dialog').close();
    toast('Prenda añadida a tu selección.');
  });
  $('#product-dialog').showModal();
}

function persistBag() {
  try { localStorage.setItem('aracnes-selection-v1', JSON.stringify(bag)); } catch { toast('La selección se guardará solo durante esta visita.'); }
  renderBag();
}

function renderBag() {
  $('#bag-count').textContent = String(bag.length);
  $('#bag-open').setAttribute('aria-label', `Abrir mi bolsa: ${bag.length} prendas`);
  $('#bag-items').innerHTML = bag.length ? bag.map((item,index) => {
    const product = products.find(p => p.id === item.id);
    return `<div class="bag-item"><img src="${imageUrl(product,200)}" alt="${product.alt}"><div><h3>${product.name}</h3><p>Talla: ${item.size}<br>Precio por confirmar</p></div><button data-remove="${index}" aria-label="Quitar ${product.name}, talla ${item.size}">Quitar</button></div>`;
  }).join('') : '<p class="bag-note">Tu bolsa está esperando tus favoritos. Explora la colección y añade alguna prenda.</p><button class="text-link" data-close="bag-dialog">Seguir explorando →</button>';
  $('#download-selection').disabled = !bag.length;
  const message = ['Hola, ARACNES. Quisiera consultar estas prendas de su catálogo de muestra:', '', ...bag.map((item,index) => `${index+1}. ${products.find(p => p.id === item.id).name} — Talla ${item.size}`), '', '¿Podrían confirmarme los precios y la disponibilidad?'].join('\n');
  $('#whatsapp-selection').href = `https://wa.me/584126024425?text=${encodeURIComponent(message)}`;
  $('#whatsapp-selection').hidden = !bag.length;
}

let toastTimer;
function toast(message) { $('#toast').textContent = message; $('#toast').classList.add('show'); clearTimeout(toastTimer); toastTimer = setTimeout(() => $('#toast').classList.remove('show'),3500); }

document.addEventListener('click', event => {
  const product = event.target.closest('[data-product]');
  if (product) openProduct(product.dataset.product);
  const closer = event.target.closest('[data-close]');
  if (closer) document.getElementById(closer.dataset.close).close();
  const remove = event.target.closest('[data-remove]');
  if (remove) { bag.splice(Number(remove.dataset.remove),1); persistBag(); }
});
document.querySelectorAll('[data-category]').forEach(button => button.addEventListener('click', () => {
  category = button.dataset.category;
  document.querySelectorAll('[data-category]').forEach(item => { const active = item === button; item.classList.toggle('active',active); item.setAttribute('aria-pressed',String(active)); });
  renderProducts();
}));
$('#search-open').addEventListener('click', () => { $('#search-form').hidden = false; $('#catalogo').scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth'}); $('#search').focus({preventScroll:true}); });
$('#search').addEventListener('input', renderProducts);
$('#search-clear').addEventListener('click', () => { $('#search').value = ''; renderProducts(); $('#search').focus(); });
$('#search-form').addEventListener('submit', event => event.preventDefault());
$('#sort').addEventListener('change', renderProducts);
$('#bag-open').addEventListener('click', () => { renderBag(); $('#bag-dialog').showModal(); });
document.querySelectorAll('dialog').forEach(dialog => dialog.addEventListener('click', event => { if (event.target === dialog) { const rect = dialog.getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close(); } }));
$('#download-selection').addEventListener('click', () => {
  if (!bag.length) return;
  const text = ['ARACNES · Mi selección de muestra','La Grita, Táchira','',...bag.map((item,index) => `${index+1}. ${products.find(p => p.id === item.id).name} — Talla ${item.size}`),'','Precios y disponibilidad por confirmar.','Este documento no es un pedido, una reserva ni un comprobante de pago.'].join('\n');
  const url = URL.createObjectURL(new Blob([text],{type:'text/plain;charset=utf-8'}));
  const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'aracnes-mi-seleccion.txt'; document.body.append(anchor); anchor.click(); anchor.remove(); setTimeout(() => URL.revokeObjectURL(url),1000);
  toast('Tu selección se ha descargado.');
});
$('#year').textContent = String(new Date().getFullYear());
renderProducts();
renderBag();
