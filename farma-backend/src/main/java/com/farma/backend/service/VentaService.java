package com.farma.backend.service;

import com.farma.backend.dto.VentaRequest;
import com.farma.backend.model.DetalleVenta;
import com.farma.backend.model.Producto;
import com.farma.backend.model.Venta;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.repository.VentaRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.NoSuchElementException;
import java.util.Set;

@Service
public class VentaService {

    private static final BigDecimal FACTOR_IGV = new BigDecimal("1.18");   // IGV 18 %
    private static final Set<String> METODOS = Set.of("EFECTIVO", "TARJETA", "YAPE");

    @Autowired
    private VentaRepository ventaRepository;

    @Autowired
    private ProductoRepository productoRepository;

    /**
     * Registra la compra: valida los datos, calcula los precios con oferta, descuenta el stock
     * y genera el número de boleta. Si algo falla, no se guarda nada (@Transactional).
     */
    @Transactional
    public Venta registrar(VentaRequest datos) {
        validarCliente(datos);

        // Junta cantidades si el mismo producto viene dos veces
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
        venta.setMetodoPago(datos.getMetodoPago().trim().toUpperCase());
        venta.setIdUsuario(datos.getIdUsuario());

        BigDecimal sinDescuento = BigDecimal.ZERO;
        BigDecimal total = BigDecimal.ZERO;

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

            p.setStock(p.getStock() - cantidad);   // se descuenta el stock
            productoRepository.save(p);
        }

        BigDecimal opGravada = total.divide(FACTOR_IGV, 2, RoundingMode.HALF_UP);
        venta.setSubtotalSinDescuento(sinDescuento);
        venta.setDescuentoTotal(sinDescuento.subtract(total));
        venta.setTotal(total);
        venta.setOpGravada(opGravada);
        venta.setIgv(total.subtract(opGravada));

        venta = ventaRepository.save(venta);
        venta.setNumero(String.format("B001-%08d", venta.getId()));   // B001-00000001
        return ventaRepository.save(venta);
    }

    public Venta buscarPorNumero(String numero) {
        return ventaRepository.findByNumeroIgnoreCase(numero.trim())
                .orElseThrow(() -> new NoSuchElementException("No existe la boleta " + numero.trim().toUpperCase() + "."));
    }

    private void validarCliente(VentaRequest d) {
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
