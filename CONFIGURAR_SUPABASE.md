# Activar el panel de ARACNES

El código incluye el panel `/admin`. Para usarlo con fotos y productos compartidos entre dispositivos hay que conectar un proyecto de Supabase. Mientras no esté configurado, el catálogo conserva las prendas de muestra y el panel indica que la conexión está pendiente.

## 1. Preparar el proyecto

1. Crear o elegir el proyecto de Supabase destinado a ARACNES.
2. Abrir **SQL Editor**, pegar el contenido de `supabase/001_aracnes.sql` y ejecutarlo. Crea productos, permisos privados y el bucket de fotos. No carga prendas ficticias en la base de datos.
3. En **Authentication → Providers → Email**, habilitar el acceso con contraseña. En **Authentication → Settings**, desactivar el registro público de usuarios si este proyecto se usará solo para administrar la tienda. Las políticas del SQL bloquean de todos modos a cualquier usuario sin autorización, aunque exista una cuenta.
4. En **Authentication → Users → Add user → Create new user**, crear la cuenta con el correo real de la dueña y una contraseña segura. Usar la opción de correo confirmado. La dueña debe recibir sus credenciales por un canal privado. No poner contraseñas en GitHub ni en este archivo.
5. Editar el correo en `supabase/002_enable_owner.sql` y ejecutarlo en el SQL Editor. Esto autoriza únicamente a esa cuenta. No se usa `user_metadata` como prueba de permisos.

## 2. Configurar Vercel

En el proyecto de Vercel, abrir **Settings → Environment Variables** y agregar, para Production (y Preview si se quiere probar allí):

| Variable | Valor |
| --- | --- |
| `SUPABASE_URL` | La URL del proyecto, por ejemplo `https://proyecto.supabase.co` |
| `SUPABASE_PUBLISHABLE_KEY` | La clave pública `sb_publishable_...` |

Como alternativa a la clave publishable se admite `SUPABASE_ANON_KEY`, con la clave JWT cuyo rol sea `anon`. No configurar `service_role` ni `sb_secret_...`: el endpoint rechaza esas claves para evitar exponerlas al navegador.

Obtener estos valores en la configuración de API del proyecto de Supabase. Después, hacer **Redeploy** en Vercel. No se necesita un comando de compilación ni dependencias instaladas. La función `api/config.js` entrega únicamente la configuración pública; toda escritura está restringida por RLS.

## 3. Recuperación de contraseña

En **Authentication → URL Configuration**:

- Site URL: el dominio real desplegado en Vercel.
- Redirect URLs: agregar `https://DOMINIO-REAL/admin` y, por compatibilidad con el acceso directo, `https://DOMINIO-REAL/admin.html`.

Configurar SMTP si se necesita entrega de correos de recuperación en producción. El botón «Olvidé mi contraseña» envía un enlace y el panel permite elegir una contraseña nueva.

## 4. Comprobar antes de usar

1. Abrir `/admin`, entrar con la cuenta de la dueña y crear un borrador con una foto JPG, PNG o WebP.
2. Verificar en una ventana privada que ese borrador no aparece en el catálogo público.
3. Publicar la prenda y abrir la tienda en otro dispositivo: debe verse la foto, el precio, las tallas y colores.
4. Cambiar el precio, volver a abrir el catálogo y comprobar el cambio.
5. Marcarla como agotada: seguirá visible y no se podrá añadir a la bolsa.
6. Archivar: desaparecerá de la tienda. Para recuperarla, editar desde el filtro Archivadas y elegir Publicada.
7. Probar desde una cuenta distinta sin permisos: no debe acceder al panel ni insertar/actualizar productos o subir/eliminar fotos desde la API. La clave pública por sí sola no permite estas operaciones.
8. Probar recuperación de contraseña y cierre de sesión.

Las comprobaciones con Supabase real quedan pendientes hasta configurar el proyecto y la cuenta. Las pruebas de código se ejecutan con `node --test tests/catalog.test.mjs`; no sustituyen estas comprobaciones.

## Uso diario

La dueña entra por el enlace «Administrar tienda» del pie o por `/admin`. Añade hasta seis fotos por prenda, elige portada, describe la prenda y guarda como borrador o publicada. Los cambios de productos se reflejan al abrir o actualizar el catálogo; no requieren otro despliegue.

El precio se expresa en USD. El indicador de disponibilidad es por prenda, no es un inventario de unidades por talla/color. Los pedidos y la confirmación final de disponibilidad se manejan por WhatsApp al +58 412 602 4425.

Las fotos se reducen a 1800 píxeles y se convierten en WebP antes de subirlas. El bucket contiene fotos públicas de productos, también las de borradores si se conoce su URL; no se debe usar para documentos privados. Las fotos retiradas se eliminan únicamente después de comprobar que no hay otra prenda que las referencie. Un fallo de red puede dejar archivos sin referencias, que se pueden revisar más tarde desde Storage.

El navegador carga el SDK de Supabase desde esm.sh, versión fijada `2.49.8`. Las fotos de la portada y de la sección editorial siguen siendo imágenes de ambientación; las fotos que sube la dueña aparecen en las fichas del catálogo.
