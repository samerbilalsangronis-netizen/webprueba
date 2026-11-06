# ALTO · Ropa en La Grita

Primera versión de una web de ropa para La Grita, Táchira. **ALTO es un nombre provisional.**

## Incluye

- Diseño adaptable a teléfonos, tabletas y escritorio.
- Catálogo ilustrativo con categorías, búsqueda y orden alfabético.
- Detalle de prendas con selección de talla de referencia.
- Bolsa guardada en el navegador y descarga de la selección como texto.
- Navegación accesible con teclado, diálogos y soporte para movimiento reducido.

## Publicar en Vercel

Importar este repositorio, seleccionar la rama `main` y desplegar. Es un sitio estático: no necesita instalación, comando de compilación, variables de entorno ni Supabase. `vercel.json` contiene la configuración. Si el proyecto ya está conectado a Vercel, el push a la rama de producción debe activar el despliegue correspondiente.

## Personalizar antes de abrir ventas

1. Sustituir el nombre provisional y textos en `index.html`, `favicon.svg` y `app.js`.
2. Reemplazar el arreglo `products` de `app.js` por prendas, tallas, fotografías y precios reales.
3. Agregar teléfono/WhatsApp, redes, dirección y horarios confirmados.
4. Configurar un canal real de pedidos o un backend si se necesitan inventario, pagos o administración.

Las fotos se cargan desde Unsplash y las fuentes desde Google Fonts; se requiere conexión para esos recursos, con fuentes de respaldo locales. Son imágenes de referencia y pueden no representar exactamente la prenda descrita. La paleta es ilustrativa, no es un selector de inventario. El sitio no cobra, no reserva productos y no transmite la selección a la tienda. No contiene credenciales.

## Archivos

`index.html`: estructura y contenido. `styles.css`: diseño y adaptación. `app.js`: catálogo e interacciones. `favicon.svg`: icono. `vercel.json`: despliegue estático.
