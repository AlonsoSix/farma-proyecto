package com.farma.backend.model;

import jakarta.persistence.*;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Avance Final: una compra hecha desde el carrito. Cada venta genera una boleta (B001-00000001).
 * Los precios ya incluyen IGV: total = opGravada + igv.
 */
@Entity
@Table(name = "ventas")
public class Venta {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta")
    private Integer id;

    // Número de la boleta: B001-00000001 (se arma con el id después de guardar)
    @Column(unique = true, length = 20)
    private String numero;

    @Column(name = "tipo_comprobante", nullable = false, length = 20)
    private String tipoComprobante = "BOLETA";

    // Usuario que inició sesión (null si compró sin cuenta)
    @Column(name = "id_usuario")
    private Integer idUsuario;

    @Column(name = "cliente_nombre", nullable = false, length = 150)
    private String clienteNombre;

    @Column(name = "cliente_dni", nullable = false, length = 8)
    private String clienteDni;

    @Column(name = "cliente_correo", length = 150)
    private String clienteCorreo;

    // EFECTIVO, TARJETA o YAPE (pago simulado)
    @Column(name = "metodo_pago", nullable = false, length = 20)
    private String metodoPago;

    // Total de los precios normales, sin ofertas
    @Column(name = "subtotal_sin_descuento", nullable = false, precision = 10, scale = 2)
    private BigDecimal subtotalSinDescuento = BigDecimal.ZERO;

    // Cuánto se ahorró el cliente por las ofertas
    @Column(name = "descuento_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal descuentoTotal = BigDecimal.ZERO;

    // Operación gravada (total sin IGV)
    @Column(name = "op_gravada", nullable = false, precision = 10, scale = 2)
    private BigDecimal opGravada = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal igv = BigDecimal.ZERO;

    @Column(nullable = false, precision = 10, scale = 2)
    private BigDecimal total = BigDecimal.ZERO;

    @Column(nullable = false)
    private LocalDateTime fecha = LocalDateTime.now();

    @OneToMany(mappedBy = "venta", cascade = CascadeType.ALL, fetch = FetchType.EAGER, orphanRemoval = true)
    private List<DetalleVenta> detalles = new ArrayList<>();

    public void agregarDetalle(DetalleVenta d) {
        d.setVenta(this);
        detalles.add(d);
    }

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getNumero() { return numero; }
    public void setNumero(String numero) { this.numero = numero; }
    public String getTipoComprobante() { return tipoComprobante; }
    public void setTipoComprobante(String tipoComprobante) { this.tipoComprobante = tipoComprobante; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteDni() { return clienteDni; }
    public void setClienteDni(String clienteDni) { this.clienteDni = clienteDni; }
    public String getClienteCorreo() { return clienteCorreo; }
    public void setClienteCorreo(String clienteCorreo) { this.clienteCorreo = clienteCorreo; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public BigDecimal getSubtotalSinDescuento() { return subtotalSinDescuento; }
    public void setSubtotalSinDescuento(BigDecimal v) { this.subtotalSinDescuento = v; }
    public BigDecimal getDescuentoTotal() { return descuentoTotal; }
    public void setDescuentoTotal(BigDecimal descuentoTotal) { this.descuentoTotal = descuentoTotal; }
    public BigDecimal getOpGravada() { return opGravada; }
    public void setOpGravada(BigDecimal opGravada) { this.opGravada = opGravada; }
    public BigDecimal getIgv() { return igv; }
    public void setIgv(BigDecimal igv) { this.igv = igv; }
    public BigDecimal getTotal() { return total; }
    public void setTotal(BigDecimal total) { this.total = total; }
    public LocalDateTime getFecha() { return fecha; }
    public void setFecha(LocalDateTime fecha) { this.fecha = fecha; }
    public List<DetalleVenta> getDetalles() { return detalles; }
    public void setDetalles(List<DetalleVenta> detalles) { this.detalles = detalles; }
}
