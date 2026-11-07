package com.farma.backend.service;

import com.farma.backend.dto.ResultadoPago;

import java.math.BigDecimal;

/**
 * Contrato de la pasarela de pago. Mañana se puede cambiar Culqi por otro proveedor
 * sin tocar la lógica de ventas, stock ni boleta.
 */
public interface PasarelaPago {

    /**
     * Cobra una venta. Para EFECTIVO no se llama a ningún proveedor: queda pendiente de pago.
     *
     * @param metodoPago EFECTIVO, TARJETA o YAPE
     * @param tokenPago  token generado por Culqi Checkout (tkn_..., ype_...)
     * @param total      monto total en soles
     * @param correo     correo del cliente (Culqi lo exige para el cargo)
     */
    ResultadoPago cobrar(String metodoPago, String tokenPago, BigDecimal total,
                         String correo, String nombreCliente, String dniCliente);

    /** Reembolso de mejor esfuerzo si el cargo se aprobó pero la venta no se pudo guardar. */
    void reembolsar(String referencia);
}
