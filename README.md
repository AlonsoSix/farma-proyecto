# Farma · "Boticas Por tu Salud"

Sistema web para una farmacia: catálogo de productos con búsqueda y filtros, carrito,
inicio de sesión obligatorio, panel de administración con CRUD de productos, reportes,
opiniones de clientes con calificación, pago en línea con **Culqi sandbox**
(tarjeta y Yape) y boleta descargable en **PDF**.

Proyecto académico — **Avance de Proyecto Final (I - II - III) - Proyecto Final**.

---

## 🧰 Tecnologías

- **Backend:** Java 21 + Spring Boot (Maven)
- **Base de datos:** MySQL 8
- **Frontend:** HTML, CSS y JavaScript con Bootstrap 5
- **Pagos:** Culqi Checkout v4 + API de cargos v2 (sandbox)
- **PDF:** jsPDF en el navegador

---

## ✅ Requisitos previos

1. **JDK 21** (Java). Comprueba con: `java -version`
2. **MySQL 8** y **MySQL Workbench**
3. **Git** — https://git-scm.com
4. **Visual Studio Code** (recomendado), con la extensión **Live Server**

---

## 📥 1. Clonar el proyecto

```bash
git clone https://github.com/AlonsoSix/farma-proyecto.git
cd farma-proyecto
```

---

## 🗄️ 2. Crear la base de datos

1. Abre **MySQL Workbench** y conéctate a tu servidor local.
2. Abre **`database/farma_db_completo.sql`** (File → Open SQL Script).
3. Ejecútalo completo con el **rayo ⚡** (o Ctrl+Shift+Enter), sin seleccionar nada.
4. Al final debe mostrar **500 productos**, **1 usuario (el administrador)** y
   **6 opiniones de ejemplo**.

> Si ya tenías la base creada con una versión anterior del proyecto, ejecuta
> **`database/migracion_pagos_culqi.sql`** (columnas de pago) y
> **`database/migracion_comentarios.sql`** (tabla de opiniones). La segunda es
> necesaria porque `spring.jpa.hibernate.ddl-auto=validate` exige que la tabla
> `comentarios` exista antes de iniciar el backend.

---

## ⚙️ 3. Configurar el backend

Hay **un solo archivo** de configuración:
`farma-backend/src/main/resources/application.properties`. Ya no existe
`application.properties.example`.

Todos los valores sensibles se leen de variables de entorno. Para trabajo local,
copia `.env.example` a `.env` en la raíz y ajusta tu contraseña:

```bash
cp .env.example .env
# edita DB_PASSWORD en .env
```

`.env` está ignorado por Git y Spring Boot lo carga automáticamente. En Docker,
Render o cualquier plataforma, esas mismas variables se inyectan desde fuera.

### Configurar Culqi sandbox (opcional, pero recomendado)

La integración lee las llaves de variables de entorno. **Nunca** escribas la llave
secreta en el código ni la subas al repositorio.

En Linux/macOS:

```bash
export CULQI_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxx"
export CULQI_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxx"
```

En Windows PowerShell:

```powershell
$env:CULQI_PUBLIC_KEY="pk_test_xxxxxxxxxxxxxxxx"
$env:CULQI_SECRET_KEY="sk_test_xxxxxxxxxxxxxxxx"
```

O agrégalas a tu `.env` local:

```dotenv
CULQI_PUBLIC_KEY=pk_test_xxxxxxxxxxxxxxxx
CULQI_SECRET_KEY=sk_test_xxxxxxxxxxxxxxxx
```

> **Sin llaves**, la tienda funciona en **modo simulado**: tarjeta y Yape se aprueban
> sin cobrar dinero. Esto permite probar el flujo completo en cualquier computadora.
> El endpoint `GET /api/pagos/config` indica si la pasarela está en modo `CULQI` o `SIMULADO`.

### Correo de confirmación (sin configuración)

La sección compacta de **Contacto** envía el correo con solo digitar la dirección:
no hay que crear cuentas ni configurar `MAIL_USERNAME`, `MAIL_PASSWORD` ni `MAIL_FROM`.

El backend resuelve los servidores MX del dominio del destinatario y entrega el mensaje
directamente por SMTP, así que funciona con Gmail, Hotmail, Outlook o cualquier proveedor.

> Si la red bloquea el puerto 25 o el proveedor rechaza la entrega, la web abre
> automáticamente la aplicación de correo del visitante con el mensaje ya redactado
> (`mailto:`). En ese caso el visitante solo tiene que pulsar «Enviar».
> Según el proveedor y la reputación IP del servidor, el correo puede llegar a spam.

### Datos de prueba de Culqi sandbox

| Método | Datos |
|---|---|
| Tarjeta | `4111 1111 1111 1111` · vencimiento `09/30` · CVV `123` |
| Yape | Celular `900 000 001` · cualquier código de 6 dígitos |

> Yape tiene un límite de **S/ 2,000** por operación. La validación se hace en el
> frontend y también en el backend.

---

## ▶️ 4. Ejecutar el backend

Desde la carpeta `farma-backend`:

```bash
cd farma-backend
./mvnw spring-boot:run
```

En Windows: `mvnw spring-boot:run`

El backend queda en **http://localhost:8081**. Para comprobar, abre
`http://localhost:8081/api/productos` y deberías ver el catálogo en JSON.

---

## 🌐 5. Abrir el frontend

1. Abre la carpeta `farma-frontend` en VS Code.
2. Haz clic derecho en **`login.html`** → **"Open with Live Server"**.
   También puedes abrir `index.html`: si no hay sesión, redirige a `login.html`.
3. La tienda completa queda detrás del login. Al ingresar, vuelve a la página que
   querías ver (`?next=...`).

> El backend (paso 4) debe estar corriendo para que funcionen el catálogo, el login
> y los pagos.

---

## 🐳 6. Ejecutar todo con Docker (un solo comando)

No necesitas MySQL Workbench ni Live Server si usas Docker Desktop:

```bash
cp .env.example .env     # solo la primera vez; ajusta DB_PASSWORD y MYSQL_ROOT_PASSWORD
docker compose up --build
```

- **Tienda:** http://localhost:8080
- **API directa:** http://localhost:8081/api/productos
- MySQL corre solo dentro de la red de Docker; los datos se guardan en el volumen `db_data`.

El primer arranque siembra `database/farma_db_completo.sql` (500 productos, admin y
opiniones). Si el volumen `db_data` ya existe, **no se vuelve a ejecutar** el script:
para reiniciar los datos usa `docker compose down -v` (¡borra la base!).

Para apagar: `docker compose down`. Para ver logs: `docker compose logs -f`.

> Nginx sirve el frontend y reenvía `/api` al backend, así que la web usa URL
> relativas y no hay CORS. Con Live Server (puerto 55xx) se mantiene el modo
> anterior: el navegador llama directo a `http://<host>:8081/api`.

---

## 💳 Flujo de pago y boleta

1. El cliente elige **Efectivo**, **Tarjeta** o **Yape**.
2. Con tarjeta/Yape, Culqi Checkout v4 tokeniza los datos **en el navegador**.
3. El backend recibe solo el token y crea el cargo con la llave secreta
   (`POST https://api.culqi.com/v2/charges`).
4. Si el cobro se aprueba, recién ahí se descuenta el stock y se guarda la venta
   con su número de boleta (`B001-00000001`).
5. La boleta muestra el estado del pago, la referencia del cargo y los últimos
   4 dígitos de la tarjeta. Se puede **descargar en PDF** o imprimir.

La pasarela está aislada en la interfaz `PasarelaPago` y la implementación
`CulqiPasarelaPago`, dentro de Spring Boot. Así la venta, el stock y la boleta
siguen siendo una sola transacción y se puede cambiar de proveedor sin tocar
el resto del sistema.

---

## 👤 Usuario administrador

Inicia sesión en `login.html` con:

- **Correo:** `admin@farma.com`
- **Contraseña:** `admin12345`

Los clientes se crean desde la pestaña **"Crear cuenta"** de la pantalla de acceso.
Solo el rol **ADMIN** puede entrar a `admin.html` y `reportes.html`; la validación
se hace al inicio de cada página (`js/auth-guard.js`) y se refuerza en el backend
para los reportes.

> ¿Olvidaste la contraseña del admin? Ejecuta `database/cambiar_contrasena_admin.sql`
> en Workbench y vuelve a dejarla en `admin12345`.

---

## 🔌 Endpoints principales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/auth/login` | Inicia sesión y devuelve id, nombre, correo y rol |
| POST | `/api/auth/registro` | Crea una cuenta de cliente |
| GET | `/api/productos` | Catálogo |
| GET | `/api/pagos/config` | Modo de la pasarela y llave **pública** de Culqi |
| POST | `/api/ventas` | Cobra (si aplica), descuenta stock y genera la boleta |
| GET | `/api/ventas/{numero}` | Consulta una boleta por su número |
| GET | `/api/reportes` | Reportes (requiere cabecera `X-Usuario-Id` de un ADMIN) |
| GET | `/api/comentarios` | Opiniones publicadas, de la más reciente a la más antigua |
| POST | `/api/comentarios` | Registra una opinión con nombre, 1-5 estrellas y comentario |
| POST | `/api/correos/confirmacion` | Envía el correo de confirmación; responde con `mailto` si no puede entregarlo |

---

## 📁 Estructura del proyecto

```
farma-proyecto/
├── .env.example                     # Plantilla de variables (copiar a .env)
├── docker-compose.yml               # web + backend + MySQL en un solo comando
├── database/
│   ├── farma_db_completo.sql        # Base completa (incluye pagos y opiniones)
│   ├── docker-init/02-grants.sh     # Restaura permisos tras el script completo
│   ├── migracion_pagos_culqi.sql    # Migración para bases ya creadas
│   ├── migracion_imagenes.sql       # Migración de imágenes de productos
│   ├── migracion_comentarios.sql    # Tabla de opiniones para bases ya creadas
│   └── cambiar_contrasena_admin.sql
├── farma-backend/                   # API REST con Spring Boot (puerto 8081)
│   ├── Dockerfile                   # Build multi-etapa (Maven -> JRE)
│   ├── .dockerignore
│   └── src/main/
│       ├── resources/application.properties  # ÚNICO archivo de configuración
│       └── java/com/farma/backend/
│           ├── config/CulqiProperties.java
│           ├── config/CorreoConfig.java          # MX + SMTP directo, sin credenciales
│           ├── controller/PagoController.java
│           ├── controller/CorreoController.java
│           ├── service/CulqiPasarelaPago.java
│           ├── service/CorreoService.java
│           ├── service/ResolutorMx.java
│           └── service/EnviadorSmtp.java
└── farma-frontend/                  # Tienda y panel admin (HTML, CSS, JS)
    ├── Dockerfile                   # Nginx con proxy /api -> backend
    ├── nginx.conf
    ├── login.html                   # Entrada obligatoria
    ├── contacto.html                # Incluye la sección de confirmación por correo
    ├── css/login.css
    ├── js/auth-guard.js             # Fuerza login al abrir la app en una pestaña nueva
    └── js/correo.js                 # Envía el correo de confirmación
```

---

## 🚀 Ideas de deploy (propuesta, aún no implementado)

| Opción | Ventajas | Limitaciones |
|---|---|---|
| **Vercel / Netlify / GitHub Pages** para el frontend | URL pública rápida, HTTPS y CDN gratis; ideal para HTML/CSS/JS. | No ejecutan el backend Java. GitHub Pages es **solo estático**. |
| **Render Web Service + MySQL administrado** para el backend | Usa el mismo `Dockerfile`; variables de entorno y HTTPS incluidos. Una sola plataforma para API y base. | El plan gratuito "duerme" el servicio (cold starts) y MySQL suele ser de pago; revisa precios vigentes. |
| **Railway / Fly.io** | Despliegan contenedores Docker y bases administradas con poca configuración. | Modelo de cobro por uso; requiere tarjeta en muchos casos. |
| **VPS con Docker Compose** (Hetzner, Contabo, etc.) | Levanta exactamente lo mismo de este repo con `docker compose up -d`; control total. | Hay que administrar servidor, certificados TLS y backups. |

**Recomendación para este proyecto:** frontend en **Vercel** (o Netlify) y
backend + MySQL en **Render**, usando el `Dockerfile` y las variables de
`.env.example`. En Vercel se agregaría una rewrite de `/api` hacia la URL de
Render para mantener el frontend con rutas relativas. Alternativa más simple
para demo: un VPS pequeño con este `docker-compose.yml` y un proxy inverso con
Let's Encrypt.

> Antes de exponerlo públicamente hay que reforzar la autenticación: hoy la
> sesión vive en `localStorage` y algunos endpoints confían en `X-Usuario-Id`.
> Para producción debe validarse el usuario en el servidor (JWT o sesión) y
> restringir CORS a orígenes explícitos.

---

## 📝 Notas

- `application.properties` **sí se sube**, pero solo con marcadores de entorno;
  `.env` y las llaves de Culqi **nunca** se suben a GitHub.
- Orden correcto sin Docker: **base de datos → backend → frontend**. Con Docker,
  basta `docker compose up --build`.
- La autenticación de la tienda es **del lado del cliente** (localStorage) para este
  proyecto académico. En producción se recomienda sesión/JWT validado en el servidor
  y protección de todos los endpoints.
- El cargo se crea antes de guardar la venta. Si la venta no se puede guardar, el
  backend intenta un reembolso automático del cargo en Culqi.
- La web usa **Culqi Checkout v4**; si en el futuro se migra a otro checkout,
  solo cambia `CulqiPasarelaPago` gracias a la interfaz `PasarelaPago`.
