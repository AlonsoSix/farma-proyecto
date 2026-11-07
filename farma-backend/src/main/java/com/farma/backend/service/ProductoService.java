package com.farma.backend.service;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.UsuarioRepository;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

/**
 * Servicio del catálogo de productos y mantenimiento del inventario.
 * Cumple con SOLID:
 * - SRP: Se responsabiliza exclusivamente de la lógica de negocio y persistencia de productos.
 * - DIP: Inyección de repositorios mediante constructor.
 */
@Service
public class ProductoService {

    private static final String PREFIJO_CODIGO = "FAR-";

    private final ProductoRepository productoRepository;
    private final UsuarioRepository usuarioRepository;

    public ProductoService(ProductoRepository productoRepository, UsuarioRepository usuarioRepository) {
        this.productoRepository = productoRepository;
        this.usuarioRepository = usuarioRepository;
    }

    /* ---------------- Consultas (públicas) ---------------- */

    /** Tienda: devuelve solo los productos activos. */
    public List<Producto> listar() {
        return productoRepository.findByActivoTrueOrderByCodigoAsc();
    }

    /** Panel de administración: todos los productos (activos y dados de baja). Requiere rol ADMIN. */
    public List<Producto> listarTodos(Integer idUsuario) {
        verificarAdmin(idUsuario);
        return productoRepository.findAllByOrderByCodigoAsc();
    }

    /** Busca un producto por su código alfanumérico (ej: FAR-0001). */
    public Producto buscarPorCodigo(String codigo) {
        if (codigo == null || codigo.isBlank()) {
            throw new IllegalArgumentException("El código de producto no puede estar vacío.");
        }
        return productoRepository.findByCodigoIgnoreCase(codigo.trim())
                .orElseThrow(() -> new NoSuchElementException("No existe un producto con el código " + codigo.trim().toUpperCase() + "."));
    }

    /** Búsqueda por texto (código, nombre, marca o categoría). */
    public List<Producto> buscar(String texto) {
        if (texto == null || texto.isBlank()) {
            return productoRepository.findAllByOrderByCodigoAsc();
        }
        return productoRepository.buscar(texto.trim());
    }

    /* ---------------- CRUD (solo administrador) ---------------- */

    /** Registra un nuevo producto autogenerando el código consecutivo FAR-XXXX. */
    public Producto registrar(ProductoRequest datos, Integer idUsuario) {
        verificarAdmin(idUsuario);
        validar(datos);
        Producto producto = new Producto();
        producto.setCodigo(siguienteCodigo());
        copiarDatos(datos, producto);
        return productoRepository.save(producto);
    }

    /** Actualiza la información de un producto existente. */
    public Producto actualizar(String codigo, ProductoRequest datos, Integer idUsuario) {
        verificarAdmin(idUsuario);
        validar(datos);
        Producto producto = buscarPorCodigo(codigo);
        copiarDatos(datos, producto);
        return productoRepository.save(producto);
    }

    /** Activa o da de baja un producto sin eliminarlo de la base de datos. */
    public Producto cambiarEstado(String codigo, Boolean activo, Integer idUsuario) {
        verificarAdmin(idUsuario);
        if (activo == null) {
            throw new IllegalArgumentException("Indica si el producto debe quedar activo o dado de baja.");
        }
        Producto producto = buscarPorCodigo(codigo);
        producto.setActivo(activo);
        return productoRepository.save(producto);
    }

    /** Elimina un producto por código. */
    public void eliminar(String codigo, Integer idUsuario) {
        verificarAdmin(idUsuario);
        productoRepository.delete(buscarPorCodigo(codigo));
    }

    /* ---------------- Apoyo y Validaciones ---------------- */

    /** Valida que el usuario tenga privilegios de administrador. */
    public void verificarAdmin(Integer idUsuario) {
        if (idUsuario == null) {
            throw new SecurityException("Debes iniciar sesión como administrador.");
        }
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new SecurityException("Usuario no válido."));
        if (!"ADMIN".equalsIgnoreCase(usuario.getRol())) {
            throw new SecurityException("No tienes permisos de administrador.");
        }
    }

    /** Genera el siguiente código incremental (FAR-0001, FAR-0002, etc.). */
    private String siguienteCodigo() {
        int ultimo = productoRepository.findTopByOrderByCodigoDesc()
                .map(p -> Integer.parseInt(p.getCodigo().replaceAll("\\D", "")))
                .orElse(0);
        return PREFIJO_CODIGO + String.format("%04d", ultimo + 1);
    }

    /** Valida las reglas de negocio del producto. */
    private void validar(ProductoRequest d) {
        if (d == null) {
            throw new IllegalArgumentException("Los datos del producto son obligatorios.");
        }
        if (d.getNombre() == null || d.getNombre().isBlank()) {
            throw new IllegalArgumentException("El nombre es obligatorio.");
        }
        if (d.getNombre().trim().length() > 150) {
            throw new IllegalArgumentException("El nombre no puede tener más de 150 caracteres.");
        }
        if (d.getPrecio() == null || d.getPrecio().compareTo(BigDecimal.ZERO) <= 0) {
            throw new IllegalArgumentException("El precio debe ser mayor que 0.");
        }
        if (d.getStock() == null || d.getStock() < 0) {
            throw new IllegalArgumentException("El stock no puede ser negativo.");
        }
        if (d.getCategoria() == null || d.getCategoria().isBlank()) {
            throw new IllegalArgumentException("La categoría es obligatoria.");
        }
        Integer desc = d.getDescuento();
        if (desc != null && desc != 0 && (desc < 5 || desc > 90)) {
            throw new IllegalArgumentException("El descuento debe ser 0 (sin oferta) o estar entre 5% y 90%.");
        }
    }

    private void copiarDatos(ProductoRequest d, Producto p) {
        p.setNombre(d.getNombre().trim());
        p.setMarca(vacioANull(d.getMarca()));
        p.setDescripcion(vacioANull(d.getDescripcion()));
        p.setPrecio(d.getPrecio());
        p.setCategoria(d.getCategoria().trim());
        p.setImagenUrl(vacioANull(d.getImagenUrl()));
        p.setStock(d.getStock());
        p.setFechaVencimiento(d.getFechaVencimiento());
        p.setDescuento(d.getDescuento() == null ? 0 : d.getDescuento());
    }

    private String vacioANull(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
