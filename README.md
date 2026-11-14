# Farma · "Boticas Por tu Salud"

Sistema web para una farmacia: catálogo de productos con búsqueda y filtros, carrito,
inicio de sesión obligatorio, panel de administración con CRUD de productos, reportes,
pago en línea con **Culqi sandbox** (tarjeta y Yape) y boleta descargable en **PDF**.

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
4. Al final debe mostrar **20 productos** y **1 usuario (el administrador)**.

> Si ya tenías la base creada con una versión anterior del proyecto, ejecuta
> **`database/migracion_pagos_culqi.sql`**. Agrega las columnas de pago que exige
> `spring.jpa.hibernate.ddl-auto=validate` (estado, pasarela, referencia y tarjeta).

---

## ⚙️ 3. Configurar el backend

1. Ve a `farma-backend/src/main/resources/`.
2. Copia **`application.properties.example`** y renómbralo a **`application.properties`**.
3. Cambia la contraseña de MySQL por la tuya:

   ```properties
   spring.datasource.password=TU_CONTRASEÑA_DE_MYSQL
   ```

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

O edita tu `application.properties` local (está en `.gitignore`):

```properties
culqi.public-key=pk_test_xxxxxxxxxxxxxxxx
culqi.secret-key=sk_test_xxxxxxxxxxxxxxxx
culqi.api-url=https://api.culqi.com/v2
```

> **Sin llaves**, la tienda funciona en **modo simulado**: tarjeta y Yape se aprueban
> sin cobrar dinero. Esto permite probar el flujo completo en cualquier computadora.
> El endpoint `GET /api/pagos/config` indica si la pasarela está en modo `CULQI` o `SIMULADO`.

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

---

## 📁 Estructura del proyecto

```
farma-proyecto/
├── database/
│   ├── farma_db_completo.sql        # Base completa (incluye columnas de pago)
│   ├── migracion_pagos_culqi.sql    # Migración para bases ya creadas
│   └── cambiar_contrasena_admin.sql
├── farma-backend/                   # API REST con Spring Boot (puerto 8081)
│   └── src/main/java/com/farma/backend/
│       ├── config/CulqiProperties.java
│       ├── controller/PagoController.java
│       ├── service/PasarelaPago.java
│       └── service/CulqiPasarelaPago.java
└── farma-frontend/                  # Tienda y panel admin (HTML, CSS, JS)
    ├── login.html                   # Entrada obligatoria
    ├── css/login.css
    └── js/auth-guard.js
```

---

## 📝 Notas

- `application.properties` y las llaves de Culqi **no se suben a GitHub**.
- Orden correcto: **base de datos → backend → frontend**.
- La autenticación de la tienda es **del lado del cliente** (localStorage) para este
  proyecto académico. En producción se recomienda sesión/JWT validado en el servidor
  y protección de todos los endpoints.
- El cargo se crea antes de guardar la venta. Si la venta no se puede guardar, el
  backend intenta un reembolso automático del cargo en Culqi.
- Culqi Checkout v4 sigue funcionando, pero Culqi anunció su migración a
  **Checkout Custom**; la capa `PasarelaPago` deja preparado ese cambio.
