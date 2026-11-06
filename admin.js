import {getClient} from './backend.js';
import {escapeHTML as e,formatPrice,validateProduct} from './catalog-utils.mjs';
const $ = selector=>document.querySelector(selector);
let client, rows=[], editing=null, photos=[], busy=false, processing=false, recovery=location.hash.includes('type=recovery'), authRevision=0;
const states=['setup','login','recovery','dashboard'];
function show(view) { states.forEach(state=>$(`#${state}-view`).hidden=state!==view); }
function notice(message,error=false,editor=false) { const box=$(editor?'#editor-message':'#admin-status'); box.textContent=message; box.classList.toggle('error',error); box.hidden=!message; }
function friendly(error) {
  if (error?.code==='invalid_credentials') return 'Correo o contraseña incorrectos.';
  if (error?.status===429) return 'Hay muchos intentos. Espera unos minutos y vuelve a probar.';
  if (error?.code==='42501' || error?.status===403) return 'Tu cuenta no tiene permiso para realizar esta acción. Consulta con quien configuró la tienda.';
  if (error?.code==='23514') return 'Revisa los datos: algún campo no cumple los límites de la tienda.';
  return 'No se pudo completar la operación. Revisa tu conexión y vuelve a intentarlo. Si continúa, consulta con quien configuró la tienda.';
}
function clearPhotos() { photos.forEach(photo=>{if(photo.blob) URL.revokeObjectURL(photo.url);}); photos=[]; }
async function gate() {
  const revision=++authRevision;
  const {data,error}=await client.auth.getUser();
  if (revision!==authRevision) return;
  if (error || !data.user) { show('login'); notice(''); return; }
  const permission=await client.rpc('is_aracnes_admin');
  if (revision!==authRevision) return;
  if(permission.error || permission.data!==true) { show('login'); notice('Esta cuenta no tiene acceso a la administración de ARACNES.',true); return; }
  $('#session-email').textContent=data.user.email;
  show(recovery?'recovery':'dashboard');
  notice('');
  if(!recovery) await refreshProducts();
}
async function refreshProducts() {
  const {data,error}=await client.from('aracnes_products').select('*').order('created_at',{ascending:false}).range(0,999);
  if(error) { notice(friendly(error),true); return; }
  rows=data;
  $('#stat-total').textContent=rows.filter(row=>row.status!=='archived').length;
  $('#stat-published').textContent=rows.filter(row=>row.status==='published').length;
  $('#stat-stock').textContent=rows.filter(row=>row.status==='published' && !row.in_stock).length;
  renderRows();
}
function photoUrl(path) { return client.storage.from('aracnes-products').getPublicUrl(path).data.publicUrl; }
function renderRows() {
  const query=$('#admin-search').value.trim().toLocaleLowerCase('es');
  const state=$('#status-filter').value;
  const filtered=rows.filter(row=>(state==='all'||row.status===state) && `${row.name} ${row.category}`.toLocaleLowerCase('es').includes(query));
  const labels={published:'Publicada',draft:'Borrador',archived:'Archivada'};
  $('#products-empty').hidden=filtered.length>0;
  $('#products-empty').textContent=rows.length?'No hay prendas que coincidan con tu búsqueda.':'Tu colección empieza aquí. Añade tu primera prenda con sus fotos y publícala cuando esté lista.';
  $('#admin-products').innerHTML=filtered.map(row=>`<article class="admin-product">${row.image_paths[0]?`<img src="${e(photoUrl(row.image_paths[0]))}" alt="${e(row.name)}" loading="lazy">`:'<span>Sin foto</span>'}<div><h2>${e(row.name)}</h2><p>${e(row.category)} · ${e(formatPrice(row.price))} · ${row.in_stock?'Disponible':'Agotada'}</p><p>Tallas: ${row.sizes.map(e).join(', ')}</p><span class="status-chip ${e(row.status)}">${labels[row.status]}</span></div><button data-edit="${e(row.id)}">Editar prenda</button></article>`).join('');
}
function openEditor(id) {
  editing=id?rows.find(row=>row.id===id):null;
  clearPhotos();
  $('#product-form').reset();
  notice('',false,true);
  $('#editor-title').textContent=editing?'Editar prenda':'Nueva prenda';
  $('#product-name').value=editing?.name||'';
  $('#product-description').value=editing?.description||'';
  $('#product-category').value=editing?.category||'Mujer';
  $('#product-price').value=editing?.price??'';
  $('#product-sizes').value=editing?.sizes.join(', ')||'';
  $('#product-colors').value=editing?.colors.join(', ')||'';
  $('#product-status').value=editing?.status||'draft';
  $('#product-stock').checked=editing?.in_stock??true;
  photos=(editing?.image_paths||[]).map(path=>({path,url:photoUrl(path)}));
  renderPhotos();
  $('#editor-dialog').showModal();
}
function renderPhotos() {
  $('#photo-previews').innerHTML=photos.map((photo,index)=>`<div class="photo-preview"><img src="${e(photo.url)}" alt="Foto ${index+1}"><span>${index===0?'PORTADA':`FOTO ${index+1}`}</span><div>${index>0?`<button type="button" data-cover="${index}">Usar de portada</button>`:''}<button type="button" data-remove-photo="${index}" aria-label="Quitar foto ${index+1}">Quitar</button></div></div>`).join('');
}
function closeEditor() { if(busy||processing) return; $('#editor-dialog').close(); clearPhotos(); }
function setBusy(value) { busy=value; $('#editor-dialog').setAttribute('aria-busy',String(value)); $('#product-form').querySelectorAll('button,input,textarea,select').forEach(control=>control.disabled=value); }
async function prepareImage(file) {
  if(!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Elige fotos JPG, PNG o WebP. Para fotos HEIC, expórtalas primero como JPG.');
  if(file.size>5*1024*1024) throw new Error('Cada foto debe pesar 5 MB o menos.');
  let bitmap;
  try { bitmap=await createImageBitmap(file,{imageOrientation:'from-image'}); } catch { throw new Error('No se pudo leer una foto. Comprueba que sea una imagen válida.'); }
  try {
    if(bitmap.width*bitmap.height>40000000) throw new Error('La foto tiene demasiada resolución. Reduce su tamaño antes de subirla.');
    const scale=Math.min(1,1800/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas'); canvas.width=Math.max(1,Math.round(bitmap.width*scale)); canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',.85));
    if(!blob || blob.type!=='image/webp') throw new Error('Este navegador no pudo preparar la foto. Prueba con un navegador actualizado.');
    return {blob,url:URL.createObjectURL(blob)};
  } finally { bitmap.close(); }
}
// Antes de borrar un archivo, confirmar que ninguna prenda lo está utilizando.
async function cleanUnused(paths) {
  for(const path of paths) {
    const check=await client.from('aracnes_products').select('id').contains('image_paths',[path]).limit(1);
    if(!check.error && check.data.length===0) await client.storage.from('aracnes-products').remove([path]);
  }
}
$('#product-photos').addEventListener('change',async event=>{
  if(busy||processing) return;
  const files=[...event.target.files];
  if(photos.length+files.length>6) {notice('Puedes guardar hasta 6 fotos por prenda.',true,true);event.target.value='';return;}
  processing=true;
  $('#save-product').disabled=true;
  notice('Preparando las fotos…',false,true);
  const prepared=[];
  try {
    for(const file of files) prepared.push(await prepareImage(file));
    photos.push(...prepared); renderPhotos(); notice('',false,true);
  } catch(error) { prepared.forEach(photo=>URL.revokeObjectURL(photo.url)); notice(error.message,true,true); }
  finally { processing=false;$('#save-product').disabled=false;event.target.value=''; }
});
$('#photo-previews').addEventListener('click',event=>{
  if(busy||processing) return;
  const remove=event.target.closest('[data-remove-photo]'),cover=event.target.closest('[data-cover]');
  if(remove) {const [photo]=photos.splice(Number(remove.dataset.removePhoto),1);if(photo.blob)URL.revokeObjectURL(photo.url);}
  if(cover) photos.unshift(photos.splice(Number(cover.dataset.cover),1)[0]);
  renderPhotos();
});
$('#product-form').addEventListener('submit',async event=>{
  event.preventDefault(); if(busy||processing) return;
  let payload;
  try {
    payload=validateProduct({name:$('#product-name').value,description:$('#product-description').value,category:$('#product-category').value,price:$('#product-price').value,sizes:$('#product-sizes').value,colors:$('#product-colors').value,status:$('#product-status').value,in_stock:$('#product-stock').checked});
    if(!photos.length) throw new Error('Añade al menos una foto de la prenda.');
  } catch(error) {notice(error.message,true,true);return;}
  setBusy(true); notice('Guardando tu prenda y sus fotos…',false,true);
  const uploaded=[];
  try {
    const {data,error}=await client.auth.getUser(); if(error||!data.user) throw error||new Error('No session');
    const paths=[];
    for(const photo of photos) {
      if(photo.path) {paths.push(photo.path);continue;}
      const path=`${data.user.id}/${crypto.randomUUID()}.webp`;
      const upload=await client.storage.from('aracnes-products').upload(path,photo.blob,{contentType:'image/webp',cacheControl:'3600',upsert:false});
      if(upload.error) throw upload.error;
      uploaded.push(path); paths.push(path);
    }
    payload.image_paths=paths;
    let request;
    if(editing) request=client.from('aracnes_products').update(payload).eq('id',editing.id).eq('updated_at',editing.updated_at).select('id');
    else request=client.from('aracnes_products').insert(payload).select('id');
    const saved=await request;
    if(saved.error) throw saved.error;
    if(!saved.data?.length) throw new Error('concurrent_edit');
    const removed=(editing?.image_paths||[]).filter(path=>!paths.includes(path));
    setBusy(false); closeEditor();
    notice(payload.status==='published'?'Prenda guardada y publicada. Ya puedes verla al actualizar la tienda.':'Prenda guardada. Puedes cambiar su visibilidad cuando quieras.');
    await refreshProducts();
    await cleanUnused(removed);
  } catch(error) {
    notice(error.message==='concurrent_edit'?'Esta prenda cambió en otra sesión. Cierra el editor, actualiza la lista y vuelve a editarla.':friendly(error),true,true);
    // Una respuesta de red perdida no prueba que el INSERT fallara. Consultar referencias antes de limpiar.
    await cleanUnused(uploaded);
  } finally {setBusy(false);}
});
$('#new-product').addEventListener('click',()=>openEditor());
$('#admin-products').addEventListener('click',event=>{const button=event.target.closest('[data-edit]');if(button)openEditor(button.dataset.edit);});
$('#close-editor').addEventListener('click',closeEditor); $('#cancel-editor').addEventListener('click',closeEditor);
$('#editor-dialog').addEventListener('cancel',event=>{event.preventDefault();closeEditor();});
$('#admin-search').addEventListener('input',renderRows); $('#status-filter').addEventListener('change',renderRows);
$('#refresh-products').addEventListener('click',refreshProducts);
$('#login-form').addEventListener('submit',async event=>{
  event.preventDefault();const button=event.submitter;button.disabled=true;notice('Comprobando tu acceso…');
  try {const {error}=await client.auth.signInWithPassword({email:$('#email').value.trim(),password:$('#password').value});if(error)throw error;$('#password').value='';await gate();} catch(error){notice(friendly(error),true);} finally{button.disabled=false;}
});
$('#sign-out').addEventListener('click',async()=>{
  const {error}=await client.auth.signOut();if(error){notice(friendly(error),true);return;}
  rows=[];renderRows();closeEditor();show('login');notice('Sesión cerrada.');
});
$('#forgot-password').addEventListener('click',async()=>{
  if(!$('#email').reportValidity() || !$('#email').value.trim()){$('#email').focus();return;}
  const button=$('#forgot-password');button.disabled=true;
  try {const {error}=await client.auth.resetPasswordForEmail($('#email').value.trim(),{redirectTo:`${location.origin}/admin`});if(error)throw error;notice('Si el correo corresponde a una cuenta, recibirás un enlace para cambiar tu contraseña.');}catch(error){notice(friendly(error),true);}finally{button.disabled=false;}
});
$('#recovery-form').addEventListener('submit',async event=>{
  event.preventDefault();if($('#new-password').value!==$('#confirm-password').value){notice('Las contraseñas no coinciden.',true);return;}
  event.submitter.disabled=true;
  try {const {error}=await client.auth.updateUser({password:$('#new-password').value});if(error)throw error;recovery=false;$('#recovery-form').reset();history.replaceState(null,'','/admin');await gate();notice('Contraseña actualizada.');}catch(error){notice(friendly(error),true);}finally{event.submitter.disabled=false;}
});
try {
  client=await getClient();
  if(!client){show('setup');notice('La conexión está pendiente de configuración.');}
  else {
    client.auth.onAuthStateChange((event)=>{
      if(event==='PASSWORD_RECOVERY'){recovery=true;setTimeout(()=>gate(),0);}
      if(event==='SIGNED_OUT'){++authRevision;recovery=false;rows=[];$('#admin-products').replaceChildren();$('#editor-dialog').close();clearPhotos();show('login');}
    });
    await gate();
  }
}catch{show('setup');notice('No se pudo conectar con el servicio de la tienda. Comprueba la conexión y la configuración de Supabase.',true);}
