// ==========================================
// FARMACIA FARMA - CATÁLOGO DE PRODUCTOS
// ==========================================

const API_URL = 'http://localhost:8081/api';
const PRODUCTOS_POR_PAGINA = 9;

const IMG_VACIA = 'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(`
        <svg xmlns="http://www.w3.org/2000/svg" width="300" height="300">
            <rect width="300" height="300" fill="#eef3f8"/>
            <text x="150" y="155" text-anchor="middle"
                  fill="#9fb3c8" font-size="18">Sin imagen</text>
        </svg>
    `);

let productos = [];
let carrito = {};

let paginaActual = 1;
let categoriaActual = '';
let busquedaActual = '';
let precioMinimo = null;
let precioMaximo = null;
let ordenActual = '';


// ==========================================
// INICIALIZACIÓN
// ==========================================

document.addEventListener('DOMContentLoaded', () => {

    cargarCarrito();
    actualizarNavbarUsuario();
    actualizarCarritoUI();
    configurarEventos();
    cargarProductos();

});


// ==========================================
// CONFIGURAR EVENTOS
// ==========================================

function configurarEventos() {

    const buscador = document.getElementById('buscador');
    const formularioBusqueda = document.getElementById('buscadorForm');

    // Buscador del catálogo.
    buscador?.addEventListener('input', () => {
        busquedaActual = buscador.value.trim();
        paginaActual = 1;
        renderCatalogo();
    });

    formularioBusqueda?.addEventListener('submit', evento => {
        evento.preventDefault();

        busquedaActual = buscador?.value.trim() || '';
        paginaActual = 1;

        renderCatalogo();
    });

    // Categorías de la barra lateral.
    document.querySelectorAll('aside .list-group-item a')
        .forEach(enlace => {

            enlace.addEventListener('click', evento => {
                evento.preventDefault();

                const texto = enlace.textContent.trim();

                categoriaActual =
                    texto.toLowerCase() === 'todas' ? '' : texto;

                paginaActual = 1;

                actualizarCategorias();
                renderCatalogo();
            });
        });

    // Filtro por precio.
    const formularioFiltros = document.querySelector('aside');
    const entradasPrecio = formularioFiltros
        ? formularioFiltros.querySelectorAll('input[type="number"]')
        : [];

    const botonFiltro = formularioFiltros
        ?.querySelector('button.btn-outline-primary');

    botonFiltro?.addEventListener('click', () => {

        const minimo = Number(entradasPrecio[0]?.value);
        const maximo = Number(entradasPrecio[1]?.value);

        precioMinimo =
            entradasPrecio[0]?.value !== '' && entradasPrecio[0]?.value != null
                ? minimo
                : null;

        precioMaximo =
            entradasPrecio[1]?.value !== '' && entradasPrecio[1]?.value != null
                ? maximo
                : null;

        if (
            precioMinimo !== null &&
            precioMaximo !== null &&
            precioMinimo > precioMaximo
        ) {
            mostrarAviso('El precio mínimo no puede superar al máximo.');
            return;
        }

        if (
            (precioMinimo !== null && precioMinimo < 0) ||
            (precioMaximo !== null && precioMaximo < 0)
        ) {
            mostrarAviso('Los precios no pueden ser negativos.');
            return;
        }

        paginaActual = 1;
        renderCatalogo();
    });

    // Ordenamiento.
    const selectorOrden = document.querySelector('main select.form-select');

    selectorOrden?.addEventListener('change', () => {
        ordenActual = selectorOrden.value;
        paginaActual = 1;
        renderCatalogo();
    });

    // Botones de las tarjetas de productos.
    document.getElementById('catalogo-productos')
        ?.addEventListener('click', evento => {

            const boton = evento.target.closest('.btn-add-cart');

            if (!boton || boton.disabled) return;

            agregarAlCarrito(Number(boton.dataset.id));
        });

    // Paginación dinámica.
    document.querySelector('main .pagination')
        ?.addEventListener('click', evento => {

            const enlace = evento.target.closest('[data-page]');

            if (!enlace) return;

            evento.preventDefault();

            const pagina = Number(enlace.dataset.page);

            if (!pagina || enlace.closest('.disabled')) return;

            paginaActual = pagina;
            renderCatalogo();

            document.getElementById('catalogo-productos')
                ?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'start'
                });
        });

    // Acciones del carrito lateral.
    document.getElementById('carritoItems')
        ?.addEventListener('click', evento => {

            const boton = evento.target.closest('button[data-accion]');

            if (!boton || boton.disabled) return;

            const id = Number(boton.dataset.id);
            const accion = boton.dataset.accion;

            if (accion === 'eliminar') {
                eliminarDelCarrito(id);

            } else if (accion === 'mas') {
                cambiarCantidad(id, 1);

            } else if (accion === 'menos') {
                cambiarCantidad(id, -1);
            }
        });

    document.getElementById('btnIrCarrito')
        ?.addEventListener('click', () => {
            mostrarAviso(
                'La página de detalle de compra estará disponible próximamente.'
            );
        });

    document.getElementById('btnPagar')
        ?.addEventListener('click', () => {
            mostrarAviso(
                'El pago en línea estará disponible próximamente.'
            );
        });

    // Formularios de cuenta.
    document.getElementById('loginForm')
        ?.addEventListener('submit', manejarLogin);

    document.getElementById('registroForm')
        ?.addEventListener('submit', manejarRegistro);

}


// ==========================================
// UTILIDADES
// ==========================================

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, caracter => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;'
    })[caracter]);
}

function soles(numero) {
    return 'S/ ' + Number(numero ?? 0).toFixed(2);
}

function normalizar(texto) {
    return String(texto ?? '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim();
}

// Las imágenes relativas deben subir un nivel porque esta página
// se encuentra dentro de la carpeta paginas/.
function rutaImagen(url) {

    if (!url) return IMG_VACIA;

    const ruta = String(url).trim();

    if (/^(https?:|data:|blob:)/i.test(ruta)) {
        return ruta;
    }

    const rutaLimpia = ruta.replace(/^\/+/, '');

    if (rutaLimpia.startsWith('../')) {
        return rutaLimpia;
    }

    return '../' + rutaLimpia;
}


// ==========================================
// AVISOS
// ==========================================

function mostrarAviso(texto) {

    const elemento = document.getElementById('toastAviso');
    const mensaje = document.getElementById('toastTexto');

    if (!elemento || !mensaje || !window.bootstrap) {
        alert(texto);
        return;
    }

    mensaje.textContent = texto;

    bootstrap.Toast.getOrCreateInstance(elemento, {
        delay: 2500
    }).show();
}

function mostrarAvisoEsquina(texto) {

    const elemento = document.getElementById('toastEsquina');
    const mensaje = document.getElementById('toastEsquinaTexto');

    if (!elemento || !mensaje || !window.bootstrap) {
        mostrarAviso(texto);
        return;
    }

    mensaje.textContent = texto;

    bootstrap.Toast.getOrCreateInstance(elemento, {
        delay: 3000
    }).show();
}


// ==========================================
// CARGAR PRODUCTOS DESDE EL BACKEND
// ==========================================

async function cargarProductos() {

    const contenedor = document.getElementById('catalogo-productos');

    if (!contenedor) return;

    try {

        const respuesta = await fetch(`${API_URL}/productos`);

        if (!respuesta.ok) {
            throw new Error('Error al consultar los productos.');
        }

        const datos = await respuesta.json();

        if (!Array.isArray(datos)) {
            throw new Error('El servidor no devolvió una lista de productos.');
        }

        productos = datos;

        actualizarCategorias();
        renderCatalogo();
        actualizarCarritoUI();

    } catch (error) {

        console.error('Error al cargar productos:', error);

        contenedor.innerHTML = `
            <div class="col-12 text-center text-danger py-5">
                <i class="bi bi-exclamation-triangle fs-1"></i>
                <p class="mt-3">
                    No se pudo conectar con el servidor.
                </p>
                <p class="small">
                    Verifica que el backend esté funcionando
                    en el puerto 8081.
                </p>
                <button class="btn btn-outline-primary rounded-pill"
                        type="button" onclick="cargarProductos()">
                    Intentar nuevamente
                </button>
            </div>
        `;
    }
}


// ==========================================
// FILTRAR Y ORDENAR PRODUCTOS
// ==========================================

function obtenerProductosFiltrados() {

    let lista = [...productos];

    if (categoriaActual) {

        const categoria = normalizar(categoriaActual);

        lista = lista.filter(producto =>
            normalizar(producto.categoria).includes(categoria)
        );
    }

    if (busquedaActual) {

        const texto = normalizar(busquedaActual);

        lista = lista.filter(producto => {

            const contenido = normalizar(`
                ${producto.nombre ?? ''}
                ${producto.categoria ?? ''}
                ${producto.descripcion ?? ''}
            `);

            return contenido.includes(texto);
        });
    }

    if (precioMinimo !== null) {
        lista = lista.filter(
            producto => Number(producto.precio) >= precioMinimo
        );
    }

    if (precioMaximo !== null) {
        lista = lista.filter(
            producto => Number(producto.precio) <= precioMaximo
        );
    }

    if (ordenActual === 'asc') {
        lista.sort(
            (a, b) => Number(a.precio) - Number(b.precio)
        );

    } else if (ordenActual === 'desc') {
        lista.sort(
            (a, b) => Number(b.precio) - Number(a.precio)
        );

    } else if (ordenActual === 'az') {
        lista.sort(
            (a, b) => String(a.nombre ?? '').localeCompare(
                String(b.nombre ?? ''),
                'es',
                { sensitivity: 'base' }
            )
        );
    }

    return lista;
}


// ==========================================
// MOSTRAR CATÁLOGO Y PAGINACIÓN
// ==========================================

function renderCatalogo() {

    const contenedor = document.getElementById('catalogo-productos');

    if (!contenedor) return;

    const lista = obtenerProductosFiltrados();

    const totalPaginas = Math.ceil(
        lista.length / PRODUCTOS_POR_PAGINA
    );

    if (totalPaginas > 0 && paginaActual > totalPaginas) {
        paginaActual = totalPaginas;
    }

    if (totalPaginas === 0) {
        paginaActual = 1;
    }

    const inicio = (paginaActual - 1) * PRODUCTOS_POR_PAGINA;

    const productosPagina = lista.slice(
        inicio,
        inicio + PRODUCTOS_POR_PAGINA
    );

    if (!productosPagina.length) {

        contenedor.innerHTML = `
            <div class="col-12 text-center text-muted py-5">
                <i class="bi bi-search fs-1"></i>
                <p class="mt-3">
                    No encontramos productos con esos criterios.
                </p>
            </div>
        `;

    } else {

        contenedor.innerHTML = productosPagina.map(producto => {

            const id = Number(producto.id);
            const stock = Number(producto.stock ?? 0);

            const estadoStock = stock <= 0
                ? `
                    <span class="badge text-bg-danger mb-2">
                        Agotado
                    </span>
                `
                : stock <= 5
                    ? `
                        <span class="badge text-bg-warning mb-2">
                            Últimas ${stock} unidades
                        </span>
                    `
                    : `
                        <span class="badge text-bg-success mb-2">
                            Disponible
                        </span>
                    `;

            return `
                <div class="col">
                    <article class="product-card">

                        <div class="product-card-img-container">
                            <img
                                src="${esc(rutaImagen(producto.imagenUrl))}"
                                alt="${esc(producto.nombre)}"
                                loading="lazy"
                                onerror="this.onerror=null;this.src='${IMG_VACIA}'"
                            >
                        </div>

                        <div class="product-card-body">

                            <span class="product-category">
                                ${esc(producto.categoria || 'Farmacia')}
                            </span>

                            <h3 class="product-title">
                                ${esc(producto.nombre)}
                            </h3>

                            <p class="product-description">
                                ${esc(producto.descripcion || '')}
                            </p>

                            <div class="product-stock">
                                ${estadoStock}
                            </div>

                            <div class="product-price">
                                ${soles(producto.precio)}
                            </div>

                            <button
                                type="button"
                                class="btn-add-cart"
                                data-id="${id}"
                                ${stock <= 0 ? 'disabled' : ''}
                            >
                                ${
                                    stock <= 0
                                        ? 'Sin stock'
                                        : carrito[id]
                                            ? `Agregar otra unidad (${carrito[id].cantidad})`
                                            : 'Agregar al carrito'
                                }
                            </button>

                        </div>
                    </article>
                </div>
            `;
        }).join('');
    }

    const resumen = document.querySelector(
        'main > .d-flex.flex-wrap p'
    );

    if (resumen) {
        resumen.textContent = lista.length
            ? `Mostrando ${inicio + 1}-${Math.min(
                inicio + PRODUCTOS_POR_PAGINA,
                lista.length
            )} de ${lista.length} productos`
            : 'No hay productos para mostrar';
    }

    renderPaginacion(totalPaginas);
}


// ==========================================
// PAGINACIÓN DINÁMICA
// ==========================================

function renderPaginacion(totalPaginas) {

    const paginacion = document.querySelector('main .pagination');

    if (!paginacion) return;

    if (totalPaginas <= 1) {
        paginacion.innerHTML = '';
        return;
    }

    let html = `
        <li class="page-item ${paginaActual === 1 ? 'disabled' : ''}">
            <a class="page-link rounded-start-pill px-3"
               href="#"
               data-page="${paginaActual - 1}">
                Anterior
            </a>
        </li>
    `;

    for (let pagina = 1; pagina <= totalPaginas; pagina++) {

        html += `
            <li class="page-item ${
                pagina === paginaActual ? 'active' : ''
            }">
                <a class="page-link"
                   href="#"
                   data-page="${pagina}">
                    ${pagina}
                </a>
            </li>
        `;
    }

    html += `
        <li class="page-item ${
            paginaActual === totalPaginas ? 'disabled' : ''
        }">
            <a class="page-link rounded-end-pill px-3"
               href="#"
               data-page="${paginaActual + 1}">
                Siguiente
            </a>
        </li>
    `;

    paginacion.innerHTML = html;
}


// ==========================================
// ACTUALIZAR CANTIDADES DE LAS CATEGORÍAS
// ==========================================

function actualizarCategorias() {

    const enlaces = document.querySelectorAll(
        'aside .list-group-item a'
    );

    enlaces.forEach(enlace => {

        const texto = enlace.textContent.trim();
        const esTodas = normalizar(texto) === 'todas';

        const activa = esTodas
            ? !categoriaActual
            : normalizar(texto) === normalizar(categoriaActual);

        enlace.classList.toggle('categoria-activa', activa);

        enlace.classList.toggle('fw-semibold', activa);

        const insignia = enlace.parentElement.querySelector('.badge');

        if (!insignia) return;

        const cantidad = esTodas
            ? productos.length
            : productos.filter(producto =>
                normalizar(producto.categoria).includes(normalizar(texto))
            ).length;

        insignia.textContent = cantidad;

        insignia.className = activa
            ? 'badge bg-primary rounded-pill'
            : 'badge bg-light text-dark rounded-pill';
    });
}


// ==========================================
// CARRITO: ALMACENAMIENTO
// ==========================================

function cargarCarrito() {

    try {

        carrito = JSON.parse(
            localStorage.getItem('farma_carrito') || '{}'
        ) || {};

    } catch (error) {

        carrito = {};
    }
}

function guardarCarrito() {

    try {

        localStorage.setItem(
            'farma_carrito',
            JSON.stringify(carrito)
        );

    } catch (error) {

        console.warn('No se pudo guardar el carrito.');
    }
}


// ==========================================
// AGREGAR AL CARRITO
// ==========================================

function agregarAlCarrito(id) {

    const producto = productos.find(
        item => Number(item.id) === id
    );

    if (!producto) return;

    const stock = Number(producto.stock ?? 0);
    const cantidadActual = carrito[id]?.cantidad ?? 0;

    if (cantidadActual >= stock) {
        mostrarAviso('No hay más unidades disponibles.');
        return;
    }

    if (!carrito[id]) {

        carrito[id] = {
            id,
            nombre: producto.nombre,
            precio: Number(producto.precio),
            imagen: rutaImagen(producto.imagenUrl),
            categoria: producto.categoria || '',
            cantidad: 0
        };
    }

    carrito[id].cantidad++;

    guardarCarrito();
    actualizarCarritoUI();
    renderCatalogo();
}


// ==========================================
// CAMBIAR CANTIDAD
// ==========================================

function cambiarCantidad(id, diferencia) {

    if (!carrito[id]) return;

    const producto = productos.find(
        item => Number(item.id) === id
    );

    const nuevaCantidad =
        Number(carrito[id].cantidad) + diferencia;

    if (
        producto &&
        nuevaCantidad > Number(producto.stock ?? 0)
    ) {
        mostrarAviso('No hay más unidades disponibles.');
        return;
    }

    if (nuevaCantidad <= 0) {
        delete carrito[id];
    } else {
        carrito[id].cantidad = nuevaCantidad;
    }

    guardarCarrito();
    actualizarCarritoUI();
    renderCatalogo();
}


// ==========================================
// ELIMINAR DEL CARRITO
// ==========================================

function eliminarDelCarrito(id) {

    if (!carrito[id]) return;

    delete carrito[id];

    guardarCarrito();
    actualizarCarritoUI();
    renderCatalogo();

    mostrarAvisoEsquina(
        'Has eliminado este producto de tu carrito.'
    );
}


// ==========================================
// ACTUALIZAR INTERFAZ DEL CARRITO
// ==========================================

function actualizarCarritoUI() {

    const items = Object.values(carrito);

    const unidades = items.reduce(
        (suma, item) => suma + Number(item.cantidad || 0),
        0
    );

    const total = items.reduce(
        (suma, item) =>
            suma + Number(item.cantidad || 0) *
                Number(item.precio || 0),
        0
    );

    const contador = document.getElementById('cartCount');
    const subtotal = document.getElementById('carritoTotal');
    const botonPagar = document.getElementById('btnPagar');
    const pie = document.getElementById('carritoPie');
    const contenedor = document.getElementById('carritoItems');

    if (contador) contador.textContent = unidades;
    if (subtotal) subtotal.textContent = soles(total);
    if (botonPagar) botonPagar.disabled = items.length === 0;

    if (pie) {
        pie.classList.toggle('d-none', items.length === 0);
    }

    if (!contenedor) return;

    if (!items.length) {

        contenedor.innerHTML = `
            <div class="cart-empty">
                <div class="cart-empty-icon">
                    <i class="bi bi-cart3"></i>
                </div>
                <h6>Tu carrito está vacío</h6>
                <p>Agrega productos para iniciar tu compra.</p>
            </div>
        `;

        return;
    }

    contenedor.innerHTML = `
        <div class="cart-store">
            Farmacia Farma (${unidades})
        </div>
    ` + items.map(item => {

        const producto = productos.find(
            p => Number(p.id) === Number(item.id)
        );

        const sinStock =
            producto &&
            item.cantidad >= Number(producto.stock ?? 0);

        return `
            <div class="cart-row">

                <img
                    src="${esc(rutaImagen(item.imagen))}"
                    alt="${esc(item.nombre)}"
                    onerror="this.onerror=null;this.src='${IMG_VACIA}'"
                >

                <div class="cart-info">

                    <div class="cart-name">
                        ${esc(item.nombre)}
                    </div>

                    ${
                        item.categoria
                            ? `<div class="cart-cat">${esc(item.categoria)}</div>`
                            : ''
                    }

                    <div class="cart-qty">
                        <span>Cantidad:</span>

                        <button
                            type="button"
                            data-accion="menos"
                            data-id="${item.id}"
                            aria-label="Quitar uno"
                            ${item.cantidad <= 1 ? 'disabled' : ''}
                        >−</button>

                        <span>${item.cantidad}</span>

                        <button
                            type="button"
                            data-accion="mas"
                            data-id="${item.id}"
                            aria-label="Agregar uno"
                            ${sinStock ? 'disabled' : ''}
                        >+</button>
                    </div>

                </div>

                <div class="cart-side">

                    <div class="cart-price">
                        ${soles(item.cantidad * item.precio)}
                    </div>

                    <button
                        type="button"
                        class="cart-del"
                        data-accion="eliminar"
                        data-id="${item.id}"
                    >Eliminar</button>

                </div>

            </div>
        `;
    }).join('');
}


// ==========================================
// LOGIN Y REGISTRO
// ==========================================

function actualizarNavbarUsuario() {

    const contenedor = document.getElementById('navAuthContainer');

    if (!contenedor) return;

    let usuario = null;

    try {
        usuario = JSON.parse(
            localStorage.getItem('farma_user') || 'null'
        );
    } catch (error) {
        usuario = null;
    }

    if (!usuario) {

        contenedor.innerHTML = `
            <button class="btn btn-outline-primary rounded-pill px-3"
                    data-bs-toggle="modal"
                    data-bs-target="#loginModal">
                Iniciar sesión
            </button>

            <button class="btn btn-primary rounded-pill px-3"
                    data-bs-toggle="modal"
                    data-bs-target="#registroModal">
                Registrarse
            </button>
        `;

        return;
    }

    const esAdmin = usuario.rol === 'ADMIN';

    contenedor.innerHTML = `
        ${
            esAdmin
                ? `
                    <a href="../admin.html"
                       class="btn btn-warning rounded-pill px-3 fw-semibold">
                        <i class="bi bi-shield-lock-fill"></i>
                        Panel Admin
                    </a>
                `
                : ''
        }

        <div class="dropdown">
            <button class="btn btn-light rounded-pill px-3 dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown">
                <i class="bi bi-person-circle text-primary me-1"></i>
                ${esc(usuario.nombre || 'Mi Cuenta')}
            </button>

            <ul class="dropdown-menu dropdown-menu-end shadow border-0">
                <li class="px-3 py-2 small">
                    <strong>
                        ${esc(usuario.nombre)}
                        ${esc(usuario.apellido || '')}
                    </strong>
                    <div>
                        <span class="badge ${
                            esAdmin ? 'bg-primary' : 'bg-secondary'
                        }">
                            ${esc(usuario.rol)}
                        </span>
                    </div>
                </li>

                ${
                    esAdmin
                        ? `
                            <li>
                                <a class="dropdown-item" href="../admin.html">
                                    Panel de administración
                                </a>
                            </li>
                        `
                        : ''
                }

                <li><hr class="dropdown-divider"></li>

                <li>
                    <a class="dropdown-item text-danger"
                       href="#"
                       onclick="cerrarSesionUsuario(event)">
                        <i class="bi bi-box-arrow-right me-2"></i>
                        Cerrar sesión
                    </a>
                </li>
            </ul>
        </div>
    `;
}

function cerrarSesionUsuario(evento) {

    evento?.preventDefault();

    localStorage.removeItem('farma_user');

    actualizarNavbarUsuario();

    mostrarAviso('Has cerrado sesión correctamente.');
}

async function manejarLogin(evento) {

    evento.preventDefault();

    const correo = document.getElementById('loginCorreo').value;
    const contrasena = document.getElementById('loginContrasena').value;
    const errorBox = document.getElementById('loginError');

    errorBox?.classList.add('d-none');

    try {

        const respuesta = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ correo, contrasena })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.error || 'Error al iniciar sesión.'
            );
        }

        localStorage.setItem(
            'farma_user',
            JSON.stringify(datos)
        );

        const modal = document.getElementById('loginModal');

        if (modal && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modal).hide();
        }

        evento.target.reset();
        actualizarNavbarUsuario();

        mostrarAviso(`Bienvenido ${datos.nombre || ''}.`);

    } catch (error) {

        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove('d-none');
        }
    }
}

async function manejarRegistro(evento) {

    evento.preventDefault();

    const nombre = document.getElementById('regNombre').value;
    const apellido = document.getElementById('regApellido').value;
    const correo = document.getElementById('regCorreo').value;
    const contrasena = document.getElementById('regContrasena').value;
    const telefono = document.getElementById('regTelefono').value;

    const errorBox = document.getElementById('registroError');

    errorBox?.classList.add('d-none');

    try {

        const respuesta = await fetch(`${API_URL}/auth/registro`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre,
                apellido,
                correo,
                contrasena,
                telefono
            })
        });

        const datos = await respuesta.json();

        if (!respuesta.ok) {
            throw new Error(
                datos.error || 'Error al registrarse.'
            );
        }

        alert('Cuenta creada correctamente. Ahora puedes iniciar sesión.');

        const modal = document.getElementById('registroModal');

        if (modal && window.bootstrap) {
            bootstrap.Modal.getOrCreateInstance(modal).hide();
        }

        evento.target.reset();

    } catch (error) {

        if (errorBox) {
            errorBox.textContent = error.message;
            errorBox.classList.remove('d-none');
        }
    }
}