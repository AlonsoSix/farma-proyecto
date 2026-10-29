
CREATE DATABASE IF NOT EXISTS farma_db
    CHARACTER SET utf8mb4
    COLLATE utf8mb4_unicode_ci;

USE farma_db;

-- =========================================
-- 1. USUARIOS
-- =========================================
 CREATE TABLE usuarios (
    id_usuario INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    apellido VARCHAR(100) NOT NULL,
    correo VARCHAR(150) NOT NULL,
    contrasena VARCHAR(255) NOT NULL,
    telefono VARCHAR(20) NULL,
    rol VARCHAR(20) NOT NULL DEFAULT 'CLIENTE',
    fecha_registro DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_usuario),
    CONSTRAINT uq_usuarios_correo UNIQUE (correo),
    CONSTRAINT chk_usuarios_rol
        CHECK (rol IN ('ADMIN', 'CLIENTE'))
) ENGINE = InnoDB;

-- =========================================
-- 2. CATEGORIAS
-- =========================================
CREATE TABLE categorias (
    id_categoria INT NOT NULL AUTO_INCREMENT,
    nombre VARCHAR(100) NOT NULL,
    descripcion TEXT NULL,
    activo TINYINT(1) NOT NULL DEFAULT 1,

    PRIMARY KEY (id_categoria),
    CONSTRAINT uq_categorias_nombre UNIQUE (nombre),
    CONSTRAINT chk_categorias_activo CHECK (activo IN (0, 1))
) ENGINE = InnoDB;

-- =========================================
-- 3. PRODUCTOS
-- =========================================
CREATE TABLE productos (
    id_producto INT NOT NULL AUTO_INCREMENT,
    id_categoria INT NULL,
    nombre VARCHAR(150) NOT NULL,
    descripcion TEXT NULL,
    precio DECIMAL(10,2) NOT NULL,
    imagen_url VARCHAR(255) NULL,
    stock INT NOT NULL DEFAULT 0,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_producto),
    INDEX idx_productos_categoria (id_categoria),

    CONSTRAINT chk_productos_precio CHECK (precio >= 0),
    CONSTRAINT chk_productos_stock CHECK (stock >= 0),

    CONSTRAINT fk_productos_categorias
        FOREIGN KEY (id_categoria)
        REFERENCES categorias (id_categoria)
        ON UPDATE CASCADE
        ON DELETE SET NULL
) ENGINE = InnoDB;

-- =========================================
-- 4. SERVICIOS
-- =========================================
CREATE TABLE servicios (
    id_servicio INT NOT NULL AUTO_INCREMENT,
    titulo VARCHAR(150) NOT NULL,
    descripcion TEXT NOT NULL,
    icono VARCHAR(80) NOT NULL DEFAULT 'bi-heart-pulse',
    activo TINYINT(1) NOT NULL DEFAULT 1,
    fecha_creacion DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_servicio),
    CONSTRAINT chk_servicios_activo CHECK (activo IN (0, 1))
) ENGINE = InnoDB;

-- =========================================
-- 5. PEDIDOS
-- =========================================
CREATE TABLE pedidos (
    id_pedido BIGINT NOT NULL AUTO_INCREMENT,
    id_usuario INT NOT NULL,
    fecha_pedido DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    total DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    direccion_entrega VARCHAR(255) NOT NULL,

    PRIMARY KEY (id_pedido),
    INDEX idx_pedidos_usuario_fecha (id_usuario, fecha_pedido),

    CONSTRAINT chk_pedidos_estado
        CHECK (estado IN (
            'PENDIENTE', 'CONFIRMADO', 'PREPARACION',
            'ENVIADO', 'ENTREGADO', 'CANCELADO'
        )),
    CONSTRAINT chk_pedidos_total CHECK (total >= 0),

    CONSTRAINT fk_pedidos_usuarios
        FOREIGN KEY (id_usuario)
        REFERENCES usuarios (id_usuario)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- =========================================
-- 6. DETALLE DE PEDIDOS
-- =========================================
CREATE TABLE detalle_pedido (
    id_detalle BIGINT NOT NULL AUTO_INCREMENT,
    id_pedido BIGINT NOT NULL,
    id_producto INT NOT NULL,
    cantidad INT NOT NULL,
    precio_unitario DECIMAL(10,2) NOT NULL,

    PRIMARY KEY (id_detalle),
    CONSTRAINT uq_detalle_pedido_producto
        UNIQUE (id_pedido, id_producto),

    INDEX idx_detalle_producto (id_producto),

    CONSTRAINT chk_detalle_cantidad CHECK (cantidad > 0),
    CONSTRAINT chk_detalle_precio CHECK (precio_unitario >= 0),

    CONSTRAINT fk_detalle_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido)
        ON UPDATE CASCADE
        ON DELETE RESTRICT,

    CONSTRAINT fk_detalle_producto
        FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- =========================================
-- 7. PAGOS
-- =========================================
CREATE TABLE pagos (
    id_pago BIGINT NOT NULL AUTO_INCREMENT,
    id_pedido BIGINT NOT NULL,
    metodo_pago VARCHAR(30) NOT NULL,
    monto DECIMAL(10,2) NOT NULL,
    estado VARCHAR(20) NOT NULL DEFAULT 'PENDIENTE',
    fecha_pago DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    referencia VARCHAR(150) NULL,

    PRIMARY KEY (id_pago),
    INDEX idx_pagos_pedido (id_pedido),

    CONSTRAINT chk_pagos_monto CHECK (monto > 0),
    CONSTRAINT chk_pagos_estado
        CHECK (estado IN (
            'PENDIENTE', 'APROBADO', 'RECHAZADO',
            'ANULADO', 'REEMBOLSADO'
        )),

    CONSTRAINT fk_pagos_pedido
        FOREIGN KEY (id_pedido)
        REFERENCES pedidos (id_pedido)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;

-- =========================================
-- 8. MOVIMIENTOS DE STOCK
-- =========================================
CREATE TABLE movimientos_stock (
    id_movimiento BIGINT NOT NULL AUTO_INCREMENT,
    id_producto INT NOT NULL,
    tipo_movimiento VARCHAR(20) NOT NULL,
    cantidad INT NOT NULL,
    motivo VARCHAR(255) NOT NULL,
    fecha_movimiento DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    PRIMARY KEY (id_movimiento),
    INDEX idx_movimientos_producto_fecha
        (id_producto, fecha_movimiento),

    CONSTRAINT chk_movimiento_tipo
        CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
    CONSTRAINT chk_movimiento_cantidad CHECK (cantidad > 0),

    CONSTRAINT fk_movimientos_producto
        FOREIGN KEY (id_producto)
        REFERENCES productos (id_producto)
        ON UPDATE CASCADE
        ON DELETE RESTRICT
) ENGINE = InnoDB;
