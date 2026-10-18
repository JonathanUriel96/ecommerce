# E-Commerce API

Tecnologías —Java/Spring Boot, MySQL y React/Vite—

API REST de productos con Spring Boot, Spring Data JPA y MySQL.

## Ejecutar en desarrollo

Configura las variables en PowerShell antes de iniciar la aplicación. Sustituye los valores de ejemplo por los de tu entorno:

```powershell
$env:SPRING_PROFILES_ACTIVE = "dev"
$env:DB_URL = "jdbc:mysql://127.0.0.1:3306/ecommerce_db"
$env:DB_USERNAME = '<usuario-mysql>'
$env:DB_PASSWORD = '<password-mysql>'
$env:ADMIN_USERNAME = '<usuario-admin>'
$env:ADMIN_PASSWORD = '<password-admin>'
.\mvnw.cmd spring-boot:run
```

Para subir fotos desde el panel local, agrega `CLOUDINARY_URL` a **Run/Debug Configuration → Environment variables** en IntelliJ. El valor tiene el formato `cloudinary://<api_key>:<api_secret>@<cloud_name>` y se obtiene en la consola de Cloudinary. No lo guardes en el repositorio.

El perfil `dev` actualiza el esquema automáticamente y muestra las consultas SQL. El perfil `prod` aplica las migraciones Flyway, valida el esquema con Hibernate y no imprime SQL. Configura `SPRING_PROFILES_ACTIVE=prod` al desplegar. Al adoptar Flyway sobre una base existente, se crea una línea base; Hibernate valida que la tabla coincida con el modelo.

## Roles y acceso

Al iniciar la aplicación, si no existe una cuenta con el nombre indicado en `ADMIN_USERNAME`, se crea el administrador inicial usando `ADMIN_USERNAME` y `ADMIN_PASSWORD`. IntelliJ debe tener ambas variables configuradas en la configuración de ejecución de Spring Boot; usa exactamente esos nombres. La contraseña se guarda codificada con BCrypt. Si las variables están vacías, el log indica que no se creó el administrador.

Los clientes se registran en la tienda. El formulario público no permite elegir rol: siempre crea una cuenta `CUSTOMER`. Solo un administrador autenticado puede crear cuentas `EMPLOYEE` o `ADMIN` desde su panel.

### Inicio de sesión con Google para clientes

Google es opcional y queda desactivado hasta configurar credenciales propias. En Google Cloud Console crea un cliente OAuth de tipo **Aplicación web** y registra como URI de redirección autorizada exactamente:

```text
http://localhost:8080/login/oauth2/code/google
```

En **Run/Debug Configuration → Environment variables** de IntelliJ agrega `GOOGLE_OAUTH_ENABLED=true`, `GOOGLE_CLIENT_ID=<tu-client-id>` y `GOOGLE_CLIENT_SECRET=<tu-client-secret>`. Para el frontend local que corre en el puerto 5174 agrega también `FRONTEND_URL=http://localhost:5174`; si cambias el puerto o host del backend, configura `GOOGLE_AUTHORIZATION_URL` con la dirección completa de `/oauth2/authorization/google`. No compartas ni guardes el secreto en el repositorio.

Reinicia Spring Boot después de cambiar las variables. El botón **Continuar con Google** aparecerá en los formularios de inicio de sesión y registro cuando el backend confirme que OAuth está habilitado. Google solo inicia o crea cuentas `CUSTOMER`; valida el correo verificado y vincula la cuenta mediante el identificador estable `sub`. Las cuentas de empleado y administrador deben seguir usando sus credenciales de trabajo.

El inicio de sesión devuelve un token Bearer que el frontend mantiene en la sesión del navegador. Los tokens duran 12 horas y se invalidan cuando se reinicia el backend; en ese caso el usuario debe iniciar sesión de nuevo. HTTP Basic se conserva para solicitudes manuales desde Postman.

## Endpoints principales

- `POST /api/auth/register`: registro público de cliente. JSON: `{"name":"Nombre","email":"correo@ejemplo.com","password":"una-clave-de-10-caracteres"}`. La contraseña debe tener al menos 10 caracteres.
- `POST /api/auth/login`: inicio de sesión. JSON: `{"identifier":"correo@ejemplo.com","password":"..."}`. `identifier` acepta correo o nombre de usuario.
- `GET /api/auth/me` y `POST /api/auth/logout`: consultar o cerrar la sesión autenticada.
- `POST /api/auth/users`: crear empleado o administrador; requiere rol `ADMIN`.
- `GET /api/products?page=0&size=20` y `GET /api/products/{id}`: catálogo público. El tamaño máximo de página es 100.
- `POST /api/products`: agregar productos; requiere rol `EMPLOYEE` o `ADMIN`. La tienda envía `multipart/form-data` con la parte `product` (JSON) y la parte `image` (archivo). La variante JSON existente sigue aceptando `imageUrl` para integraciones.
- `PATCH /api/products/{id}/image`: reemplazar la foto de un producto; requiere rol `EMPLOYEE` o `ADMIN` y recibe `multipart/form-data` con la parte `image`.
- `PUT /api/products/{id}` y `DELETE /api/products/{id}` requieren rol `ADMIN`. `DELETE` desactiva el producto.
- Al crear o actualizar productos, `category` acepta `MOUSE`, `KEYBOARD`, `HEADPHONES`, `MONITOR` u `OTHER`. Los productos previos a la migración V6 se clasifican como `OTHER` hasta que se actualicen.
- Las fotos se guardan en Cloudinary y la respuesta del producto conserva la URL HTTPS en `imageUrl`. La migración V7 agrega `image_url`.
- `POST /api/orders`: crear pedido; requiere rol `CUSTOMER`.
- `GET /api/orders/mine`: ver los pedidos propios; requiere rol `CUSTOMER`.
- `GET /api/orders` y `PATCH /api/orders/{id}/status`: consultar y actualizar pedidos; requieren rol `EMPLOYEE` o `ADMIN`.

Para Postman, selecciona **Authorization → Bearer Token** y pega el campo `token` de la respuesta de `/api/auth/login`. Para productos se puede seguir usando **Basic Auth** con las credenciales del administrador configuradas en IntelliJ.

La API pagina productos y pedidos y devuelve DTOs, no entidades JPA. Configura HTTPS al publicar la API en Internet.

### Fotos de productos

En el panel, los empleados y administradores pueden elegir un archivo al crear un producto o cambiar la foto de uno existente. Se aceptan archivos JPG, PNG y WEBP de hasta 5 MB. El backend los carga de forma autenticada a Cloudinary y guarda en MySQL solamente la URL devuelta; el catálogo y el carrusel muestran esa foto.

Para habilitar la carga, crea una cuenta y un producto de medios en Cloudinary. Copia el valor `CLOUDINARY_URL` de su consola y configúralo como variable secreta del servicio del backend en Railway. Para desarrollo local, agrega la misma variable a la configuración de ejecución de Spring Boot en IntelliJ. La API secret nunca debe estar en Vercel, en React ni en Git. Cloudinary requiere `cloud_name`, `api_key` y `api_secret` para las llamadas seguras de subida; el backend usa el SDK Java oficial.

Los productos que ya estaban en el catálogo pueden recibir su foto desde **Actualizar imágenes del catálogo** en el mismo panel, sin ejecutar SQL ni abrir Workbench.

## Pruebas

```powershell
.\mvnw.cmd clean verify
```

Las pruebas usan H2 en memoria y no requieren MySQL ni credenciales locales.
