package com.farma.backend.service;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Usuario;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.UsuarioRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ProductoService {

    private static final String PREFIJO_CODIGO = "FAR-";

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private UsuarioRepository usuarioRepository;

    /* ---------------- Consultas (públicas) ---------------- */

    // Tienda: solo productos activos
    public List<Producto> listar() {
        return productoRepository.findByActivoTrueOrderByCodigoAsc();
    }

    // Panel de administración: todos (activos y dados de baja)
    public List<Producto> listarTodos(Integer idUsuario) {
        verificarAdmin(idUsuario);
        return productoRepository.findAllByOrderByCodigoAsc();
    }

    public Producto buscarPorCodigo(String codigo) {
        return productoRepository.findByCodigoIgnoreCase(codigo.trim())
                .orElseThrow(() -> new NoSuchElementException("No existe un producto con el código " + codigo.trim().toUpperCase() + "."));
    }

    // Búsqueda del panel de administración (incluye los dados de baja)
    public List<Producto> buscar(String texto) {
        if (texto == null || texto.isBlank()) return productoRepository.findAllByOrderByCodigoAsc();
        return productoRepository.buscar(texto.trim());
    }

    /* ---------------- CRUD (solo administrador) ---------------- */

    public Producto registrar(ProductoRequest datos, Integer idUsuario) {
        verificarAdmin(idUsuario);
        validar(datos);
        Producto producto = new Producto();
        producto.setCodigo(siguienteCodigo());
        copiarDatos(datos, producto);
        return productoRepository.save(producto);
    }

    public Producto actualizar(String codigo, ProductoRequest datos, Integer idUsuario) {
        verificarAdmin(idUsuario);
        validar(datos);
        Producto producto = buscarPorCodigo(codigo);   // el código no cambia
        copiarDatos(datos, producto);
        return productoRepository.save(producto);
    }

    // Dar de baja (activo = false) o volver a activar (activo = true) sin borrar el producto
    public Producto cambiarEstado(String codigo, Boolean activo, Integer idUsuario) {
        verificarAdmin(idUsuario);
        if (activo == null) {
            throw new IllegalArgumentException("Indica si el producto debe quedar activo o dado de baja.");
        }
        Producto producto = buscarPorCodigo(codigo);
        producto.setActivo(activo);
        return productoRepository.save(producto);
    }

    public void eliminar(String codigo, Integer idUsuario) {
        verificarAdmin(idUsuario);
        productoRepository.delete(buscarPorCodigo(codigo));
    }

    /* ---------------- Apoyo ---------------- */

    // El frontend envía el id del usuario que inició sesión; aquí se comprueba que sea ADMIN
    private void verificarAdmin(Integer idUsuario) {
        if (idUsuario == null) {
            throw new SecurityException("Debes iniciar sesión como administrador.");
        }
        Usuario usuario = usuarioRepository.findById(idUsuario)
                .orElseThrow(() -> new SecurityException("Usuario no válido."));
        if (!"ADMIN".equalsIgnoreCase(usuario.getRol())) {
            throw new SecurityException("No tienes permisos de administrador.");
        }
    }

    // FAR-0020 -> FAR-0021. Si no hay productos, empieza en FAR-0001
    private String siguienteCodigo() {
        int ultimo = productoRepository.findTopByOrderByCodigoDesc()
                .map(p -> Integer.parseInt(p.getCodigo().replaceAll("\\D", "")))
                .orElse(0);
        return PREFIJO_CODIGO + String.format("%04d", ultimo + 1);
    }

    private void validar(ProductoRequest d) {
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
    }

    private String vacioANull(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
