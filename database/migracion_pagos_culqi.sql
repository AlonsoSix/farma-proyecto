-- =====================================================================
-- Migración: campos de pago (Culqi sandbox) para una base de datos YA creada.
--
-- Cuándo usarla:
--   Si ya tenías farma_db creada con una versión anterior del proyecto y no
--   quieres volver a ejecutar todo farma_db_completo.sql.
--
-- Cómo usarla:
--   1) Abre MySQL Workbench y selecciona tu base de datos farma_db.
--   2) Abre este archivo y ejecútalo completo.
--   3) Reinicia el backend (spring.jpa.hibernate.ddl-auto=validate exige
--      que las columnas existan).
--
-- Es idempotente: si una columna ya existe, muestra un mensaje y no falla.
-- =====================================================================

SET @db := DATABASE();
SET @existe := 0;

-- pago_estado
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'pago_estado');
SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN pago_estado varchar(20) NOT NULL DEFAULT ''PENDIENTE'' AFTER metodo_pago',
  'SELECT ''pago_estado ya existe'' AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pago_pasarela
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'pago_pasarela');
SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN pago_pasarela varchar(20) DEFAULT NULL AFTER pago_estado',
  'SELECT ''pago_pasarela ya existe'' AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- pago_referencia
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'pago_referencia');
SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN pago_referencia varchar(64) DEFAULT NULL AFTER pago_pasarela',
  'SELECT ''pago_referencia ya existe'' AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- tarjeta_marca
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'tarjeta_marca');
SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN tarjeta_marca varchar(30) DEFAULT NULL AFTER pago_referencia',
  'SELECT ''tarjeta_marca ya existe'' AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- tarjeta_ultimos4
SET @existe := (SELECT COUNT(*) FROM information_schema.COLUMNS
  WHERE TABLE_SCHEMA = @db AND TABLE_NAME = 'ventas' AND COLUMN_NAME = 'tarjeta_ultimos4');
SET @sql := IF(@existe = 0,
  'ALTER TABLE ventas ADD COLUMN tarjeta_ultimos4 varchar(4) DEFAULT NULL AFTER tarjeta_marca',
  'SELECT ''tarjeta_ultimos4 ya existe'' AS resultado');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

SELECT 'Migración de pagos completada.' AS resultado;
