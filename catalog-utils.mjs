export const escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export const formatPrice = price => price === null || price === undefined ? 'Consultar precio' : new Intl.NumberFormat('es-VE', {style:'currency',currency:'USD'}).format(Number(price));
export const splitList = value => [...new Set(String(value).split(',').map(v=>v.trim()).filter(Boolean))];
export function validateProduct(input) {
  const name = String(input.name || '').trim();
  const description = String(input.description || '').trim();
  const category = String(input.category || '');
  const sizes = splitList(input.sizes);
  const colors = splitList(input.colors);
  const rawPrice = String(input.price ?? '').trim().replace(',','.');
  const price = rawPrice === '' ? null : Number(rawPrice);
  if (!name || name.length > 120) throw new Error('Escribe un nombre de hasta 120 caracteres.');
  if (description.length > 2000) throw new Error('La descripción debe tener hasta 2000 caracteres.');
  if (!['Mujer','Hombre','Accesorios'].includes(category)) throw new Error('Selecciona una categoría válida.');
  if (price !== null && (!Number.isFinite(price) || price < 0 || price > 999999.99 || !/^\d+(\.\d{1,2})?$/.test(rawPrice))) throw new Error('Escribe un precio válido en dólares, con hasta dos decimales.');
  if (!sizes.length || sizes.length > 30 || sizes.some(s=>s.length>30)) throw new Error('Añade entre 1 y 30 tallas, separadas por comas (o escribe Única).');
  if (colors.length > 20 || colors.some(c=>c.length>40)) throw new Error('Añade hasta 20 colores, de hasta 40 caracteres cada uno.');
  if (!['draft','published','archived'].includes(input.status)) throw new Error('Estado inválido.');
  return {name,description,category,price,sizes,colors,status:input.status,in_stock:Boolean(input.in_stock)};
}

export function cleanBag(items, products) {
  if (!Array.isArray(items)) return [];
  return items.filter(item => item && products.some(p=>p.id === item.id && p.in_stock !== false && p.sizes.includes(item.size)))
    .map(({id,size})=>({id,size})).filter((item,index,array)=>array.findIndex(other=>other.id===item.id && other.size===item.size)===index);
}
