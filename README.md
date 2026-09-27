════════════════════════════
PASO 0: PROGRAMAS NECESARIOS
════════════════════════════
Instalen esto (si ya lo tienen, pasen al paso 1):
- Git: git-scm.com
- Java 21 (JDK): para comprobar, abran una terminal y escriban
  java -version   (debe decir 21)
- MySQL Server y MySQL Workbench (deben estar corriendo)

Solo la primera vez, configuren Git con su nombre y correo de GitHub:
  git config --global user.name "SuNombre"
  git config --global user.email "sucorreo@ejemplo.com"

═══════════════════
PASO 1: CLONAR
═══════════════════
En una terminal, ubíquense en la carpeta donde quieran guardar el proyecto
(por ejemplo el Escritorio) y ejecuten:
  git clone https://github.com/AlonsoSix/farma-proyecto.git
Se creará la carpeta "farma-proyecto" con 3 carpetas adentro:
database, farma-backend y farma-frontend.

═══════════════════════════════
PASO 2: CREAR LA BASE DE DATOS
═══════════════════════════════
1. Abran MySQL Workbench y conéctense a su servidor local.
2. Menú Server > Data Import.
3. Elijan "Import from Self-Contained File" y busquen:
   farma-proyecto/database/Dump20260921.sql
4. No hace falta elegir nada en "Default Target Schema".
5. Clic en "Start Import" (NO es necesario darle al rayito).
6. Al terminar, en la pestaña "Import Progress" debe decir "Import completed".
7. En el panel izquierdo (Schemas), clic en el botón de refrescar. Debe
   aparecer "farma_db" con las tablas "productos" y "usuarios".

Nota: si ya tenían una base llamada farma_db, se reemplaza por esta.

═══════════════════════════════════════
PASO 3: CREAR SU ARCHIVO DE CONFIGURACIÓN
═══════════════════════════════════════
Cada uno tiene su propia contraseña de MySQL, por eso este archivo no se sube
a GitHub y cada uno debe crear el suyo.

1. Entren a: farma-proyecto/farma-backend/src/main/resources/
2. Ahí hay un archivo "application.properties.example".
   Hagan una COPIA (clic derecho > Copiar, y luego Pegar).
3. Renombren la COPIA para que se llame: application.properties
   (sin el ".example"). Tienen que quedar los DOS archivos.
   NO borren ni modifiquen el archivo ".example".
4. Abran su "application.properties" y cambien esta línea por SU contraseña
   de MySQL:
     spring.datasource.password=TU_CONTRASEÑA_DE_MYSQL
   Si su usuario de MySQL no es "root", cambien también la línea
   spring.datasource.username=root

Si no ven las extensiones de archivo en Windows, activen en el Explorador:
Ver > Mostrar > Extensiones de nombre de archivo.

══════════════════════════
PASO 4: EJECUTAR EL BACKEND
══════════════════════════
En una terminal, dentro de farma-proyecto/farma-backend:
  .\mvnw spring-boot:run
La primera vez tarda porque descarga dependencias. Cuando esté listo, verán en
la terminal un mensaje que dice "Started FarmaBackendApplication".
No cierren esa terminal mientras usen la página.

═══════════════════════════
PASO 5: VER LA PÁGINA
═══════════════════════════
Abran en el navegador el archivo:
  farma-proyecto/farma-frontend/index.html
Si aparecen los productos en "Productos más vendidos", todo funciona.

═══════════════════════════════
SI ALGO FALLA
═══════════════════════════════
- "Access denied for user 'root'": la contraseña de su
  application.properties está mal.
- "Communications link failure" o "Connection refused": MySQL no está
  encendido.
- "Unknown database 'farma_db'": no hicieron bien el paso 2.
- "Port 8081 was already in use": ya tienen otro backend corriendo. Ciérrenlo.
- Error de versión de Java: instalen Java 21.
- En la página sale "No se pudo conectar con el servidor": el backend del
  paso 4 no está corriendo.

═════════════════════════════
PARA TRABAJAR EN EQUIPO
═════════════════════════════
Primero acepten la invitación de colaborador que les llegará al correo de
GitHub (si no, no podrán hacer git push).

- Antes de empezar a trabajar:   git pull
- Al terminar sus cambios:       git add .
                                 git commit -m "lo que cambiaron"
                                 git push
- Repártanse las partes (uno el frontend, otro el backend) para no editar el
  mismo archivo al mismo tiempo.
- Antes de hacer commit, revisen "git status". Si sale
  "application.properties.example" como borrado, no lo suban; recupérenlo con:
  git restore farma-backend/src/main/resources/application.properties.example
