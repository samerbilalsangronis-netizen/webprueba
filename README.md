# ARACNES · Ropa en La Grita

Primera versión de una web de ropa para La Grita, Táchira.

## Incluye

- Diseño adaptable a teléfonos, tabletas y escritorio.
- Catálogo conectado a Supabase con categorías, búsqueda y orden alfabético; mantiene muestras solo mientras no haya conexión configurada.
- Detalle con galería de hasta seis fotos, precio, tallas, colores y disponibilidad.
- Panel privado `/admin`: acceso por correo y contraseña, recuperación, creación y edición de prendas, borradores y archivo recuperable.
- Bolsa guardada en el navegador, descarga como texto y consulta de la selección por WhatsApp al +58 412 602 4425.
- Navegación accesible con teclado, diálogos y soporte para movimiento reducido.

## Publicar en Vercel

Importar este repositorio, seleccionar la rama `main` y desplegar. La interfaz es estática, con una función de Vercel en `api/config.js` que expone únicamente la configuración pública. No requiere instalación ni compilación. Para activar productos reales y el panel, seguir [CONFIGURAR_SUPABASE.md](CONFIGURAR_SUPABASE.md): ejecutar el SQL, habilitar la cuenta de la dueña y agregar las dos variables públicas de Supabase en Vercel. Sin esa configuración el panel no permite guardar y la tienda conserva las muestras. Si el proyecto ya está conectado a Vercel, el push a la rama de producción activa su despliegue.

## Personalizar antes de abrir ventas

1. Personalizar los textos y sustituir el monograma por el logo oficial si se dispone de él.
2. Activar Supabase y cargar las prendas reales desde `/admin`. No hay que editar código para cada producto.
3. Agregar redes, dirección y horarios confirmados. WhatsApp ya está configurado: +58 412 602 4425.
4. Confirmar pedidos por WhatsApp. La disponibilidad es por prenda; no incluye unidades por combinación de talla/color ni pagos en línea.

Las fotos de ambientación y de demostración se cargan desde Unsplash. Las fotos reales se guardan en Supabase Storage. Las fuentes se cargan desde Google Fonts, con fuentes locales de respaldo. El SDK de Supabase se carga desde esm.sh con versión fijada. El sitio no cobra, no reserva productos y solo prepara un mensaje de WhatsApp; el visitante debe enviarlo para compartir su selección con la tienda. No contiene claves privadas.

## Archivos

`index.html`, `styles.css`, `app.js`: tienda pública. `admin.html`, `admin.css`, `admin.js`: panel. `backend.js`: cliente y catálogo de Supabase. `catalog-utils.mjs`: validación y protección de contenido. `api/config.js`: configuración pública segura. `supabase/`: SQL de tablas, permisos y cuenta de administradora. `demo-products.js`: muestras previas a la configuración.

## Verificación

`node --test tests/catalog.test.mjs` comprueba validación de productos, escape de contenido, depuración de la bolsa, rechazo de claves privadas y consulta de productos publicados. La verificación de acceso, RLS, carga de fotos y persistencia en Supabase real requiere activar el proyecto; la guía enumera las comprobaciones.
