package com.farma.backend.service;

import com.farma.backend.dto.ResultadoPago;
import com.farma.backend.dto.VentaRequest;
import com.farma.backend.model.DetalleVenta;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Venta;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.VentaRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/**
 * Servicio encargado del procesamiento y registro de ventas.
 * Cumple con SOLID:
 * - SRP: Orquesta la validación de carrito, cálculo fiscal (IGV), cobro y decremento de inventario.
 * - DIP: Inyección de dependencias mediante constructor con abstracción PasarelaPago.
 */
@Service
public class VentaService {

    private static final BigDecimal FACTOR_IGV = new BigDecimal("1.18");   // IGV 18 %
    private static final Set<String> METODOS = Set.of("EFECTIVO", "TARJETA", "YAPE");

    private final VentaRepository ventaRepository;
    private final ProductoRepository productoRepository;
    private final PasarelaPago pasarelaPago;

    public VentaService(VentaRepository ventaRepository,
                        ProductoRepository productoRepository,
                        PasarelaPago pasarelaPago) {
        this.ventaRepository = ventaRepository;
        this.productoRepository = productoRepository;
        this.pasarelaPago = pasarelaPago;
    }

    /**
     * Registra la compra: valida los datos, calcula los precios con oferta, cobra con la
     * pasarela (Culqi o simulado), descuenta el stock y genera el número de boleta.
     * Si algo falla, la transacción revierte todos los cambios (@Transactional).
     */
    @Transactional
    public Venta registrar(VentaRequest datos) {
        validarCliente(datos);
        String metodo = datos.getMetodoPago().trim().toUpperCase();

        // Agrupa cantidades si el mismo producto viene repetido en el pedido
        Map<Integer, Integer> cantidades = new LinkedHashMap<>();
        for (VentaRequest.Item item : datos.getItems()) {
            if (item.getIdProducto() == null || item.getCantidad() == null || item.getCantidad() <= 0) {
                throw new IllegalArgumentException("Hay un producto con cantidad no válida en el carrito.");
            }
            cantidades.merge(item.getIdProducto(), item.getCantidad(), Integer::sum);
        }

        Venta venta = new Venta();
        venta.setClienteNombre(datos.getClienteNombre().trim());
        venta.setClienteDni(datos.getClienteDni().trim());
        venta.setClienteCorreo(vacioANull(datos.getClienteCorreo()));
        venta.setMetodoPago(metodo);
        venta.setIdUsuario(datos.getIdUsuario());

        BigDecimal sinDescuento = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;

        // Se valida todo el inventario antes de procesar el pago para proteger el stock
        List<Producto> productos = new ArrayList<>();
        List<Integer> cantidadesCompradas = new ArrayList<>();

        for (Map.Entry<Integer, Integer> e : cantidades.entrySet()) {
            Producto p = productoRepository.findById(e.getKey())
                    .orElseThrow(() -> new NoSuchElementException("Uno de los productos del carrito ya no existe."));
            int cantidad = e.getValue();
            if (!Boolean.TRUE.equals(p.getActivo())) {
                throw new IllegalArgumentException("El producto " + p.getNombre() + " ya no está a la venta.");
            }
            if (p.getStock() < cantidad) {
                throw new IllegalArgumentException("Solo quedan " + p.getStock() + " unidades de " + p.getNombre() + ".");
            }

            DetalleVenta d = new DetalleVenta();
            d.setIdProducto(p.getId());
            d.setCodigo(p.getCodigo());
            d.setNombre(p.getNombre());
            d.setCategoria(p.getCategoria());
            d.setCantidad(cantidad);
            d.setPrecioUnitario(p.getPrecio());
            d.setDescuento(p.getDescuento() == null ? 0 : p.getDescuento());
            d.setPrecioFinal(p.getPrecioFinal());
            d.setImporte(p.getPrecioFinal().multiply(BigDecimal.valueOf(cantidad)));
            venta.agregarDetalle(d);

            sinDescuento = sinDescuento.add(p.getPrecio().multiply(BigDecimal.valueOf(cantidad)));
            total = total.add(d.getImporte());

            productos.add(p);
            cantidadesCompradas.add(cantidad);
        }

        BigDecimal opGravada = total.divide(FACTOR_IGV, 2, RoundingMode.HALF_UP);
        venta.setSubtotalSinDescuento(sinDescuento);
        venta.setDescuentoTotal(sinDescuento.subtract(total));
        venta.setTotal(total);
        venta.setOpGravada(opGravada);
        venta.setIgv(total.subtract(opGravada));

        // Procesamiento del cobro (Culqi o Simulado). Si falla, lanza PagoRechazadoException
        ResultadoPago pago = pasarelaPago.cobrar(
                metodo,
                datos.getTokenPago(),
                total,
                datos.getClienteCorreo(),
                datos.getClienteNombre(),
                datos.getClienteDni()
        );
        venta.setPagoEstado(pago.estado());
        venta.setPagoPasarela(pago.pasarela());
        venta.setPagoReferencia(pago.referencia());
        venta.setTarjetaMarca(pago.marcaTarjeta());
        venta.setTarjetaUltimos4(pago.ultimos4());

        try {
            for (int i = 0; i < productos.size(); i++) {
                Producto p = productos.get(i);
                p.setStock(p.getStock() - cantidadesCompradas.get(i));
                productoRepository.save(p);
            }

            venta = ventaRepository.save(venta);
            venta.setNumero(String.format("B001-%08d", venta.getId()));
            return ventaRepository.save(venta);
        } catch (RuntimeException e) {
            // Reembolso de seguridad si ocurre un fallo posterior a la aprobación del cargo
            pasarelaPago.reembolsar(pago.referencia());
            throw e;
        }
    }

    /** Historial de compras de un usuario, de la más reciente a la más antigua. */
    public List<Venta> listarPorUsuario(Integer idUsuario) {
        if (idUsuario == null) {
            throw new IllegalArgumentException("El usuario es obligatorio.");
        }
        return ventaRepository.findByIdUsuarioOrderByFechaDescIdDesc(idUsuario);
    }

    /** Busca una boleta por su correlativo oficial (ej: B001-00000001). */
    public Venta buscarPorNumero(String numero) {
        if (numero == null || numero.isBlank()) {
            throw new IllegalArgumentException("El número de boleta es obligatorio.");
        }
        return ventaRepository.findByNumeroIgnoreCase(numero.trim())
                .orElseThrow(() -> new NoSuchElementException("No existe la boleta " + numero.trim().toUpperCase() + "."));
    }

    private void validarCliente(VentaRequest d) {
        if (d == null) {
            throw new IllegalArgumentException("Los datos de la venta son obligatorios.");
        }
        if (d.getItems() == null || d.getItems().isEmpty()) {
            throw new IllegalArgumentException("Tu carrito está vacío.");
        }
        if (d.getClienteNombre() == null || d.getClienteNombre().trim().length() < 3) {
            throw new IllegalArgumentException("Escribe tu nombre completo.");
        }
        if (d.getClienteNombre().trim().length() > 150) {
            throw new IllegalArgumentException("El nombre no puede tener más de 150 caracteres.");
        }
        if (d.getClienteDni() == null || !d.getClienteDni().trim().matches("\\d{8}")) {
            throw new IllegalArgumentException("El DNI debe tener 8 números.");
        }
        String correo = vacioANull(d.getClienteCorreo());
        if (correo != null && (correo.length() > 150 || !correo.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+"))) {
            throw new IllegalArgumentException("El correo no es válido.");
        }
        if (d.getMetodoPago() == null || !METODOS.contains(d.getMetodoPago().trim().toUpperCase())) {
            throw new IllegalArgumentException("Elige un método de pago: efectivo, tarjeta o Yape.");
        }
    }

    private String vacioANull(String texto) {
        return (texto == null || texto.isBlank()) ? null : texto.trim();
    }
}
