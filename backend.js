let clientPromise;
export function getClient() {
  if (!clientPromise) clientPromise = initialize();
  return clientPromise;
}
async function initialize() {
  const response = await fetch('/api/config', {cache:'no-store'});
  // El servidor de previsualización estático no ejecuta funciones de Vercel.
  if (response.status === 404) return null;
  if (!response.ok) throw new Error('No se pudo cargar la configuración de la tienda.');
  const config = await response.json();
  if (!config.configured) return null;
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2.49.8');
  return createClient(config.url, config.key, {auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true,storageKey:'aracnes-auth'}});
}
export async function loadPublicProducts(client) {
  const {data,error} = await client.from('aracnes_products').select('id,name,description,category,price,sizes,colors,image_paths,in_stock,updated_at').eq('status','published').order('created_at',{ascending:false}).range(0,999);
  if (error) throw error;
  return data.map(product=>({...product,images:product.image_paths.map(path=>client.storage.from('aracnes-products').getPublicUrl(path).data.publicUrl),alt:product.name,tag:product.in_stock?'COLECCIÓN ARACNES':'AGOTADO',demo:false}));
}
