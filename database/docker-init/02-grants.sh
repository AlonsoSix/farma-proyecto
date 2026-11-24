#!/bin/sh
# =====================================================================
#  Permisos para el primer arranque de MySQL en Docker.
#
#  farma_db_completo.sql hace DROP DATABASE + CREATE DATABASE, lo que
#  elimina los GRANT que el entrypoint de MySQL dio a MYSQL_USER.
#  Este script se ejecuta JUSTO DESPUÉS y restaura el acceso del backend.
#  Solo corre la primera vez (cuando el volumen db_data está vacío).
# =====================================================================

set -e

mysql -uroot -p"$MYSQL_ROOT_PASSWORD" <<SQL
GRANT ALL PRIVILEGES ON \`${MYSQL_DATABASE}\`.* TO '${MYSQL_USER}'@'%';
FLUSH PRIVILEGES;
SQL
