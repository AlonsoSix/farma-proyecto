package com.farma.backend.dto;

import java.util.List;

/**
 * Lo que envía carrito.html al confirmar la compra.
 * Solo se envían los ids y cantidades: los precios los calcula el backend
 * (así nadie puede cambiar el precio desde el navegador).
 */
public class VentaRequest {

    private String clienteNombre;
    private String clienteDni;
    private String clienteCorreo;
    private String metodoPago;      // EFECTIVO, TARJETA o YAPE
    private Integer idUsuario;      // opcional: el usuario que inició sesión
    private List<Item> items;

    public static class Item {
        private Integer idProducto;
        private Integer cantidad;

        public Integer getIdProducto() { return idProducto; }
        public void setIdProducto(Integer idProducto) { this.idProducto = idProducto; }
        public Integer getCantidad() { return cantidad; }
        public void setCantidad(Integer cantidad) { this.cantidad = cantidad; }
    }

    public String getClienteNombre() { return clienteNombre; }
    public void setClienteNombre(String clienteNombre) { this.clienteNombre = clienteNombre; }
    public String getClienteDni() { return clienteDni; }
    public void setClienteDni(String clienteDni) { this.clienteDni = clienteDni; }
    public String getClienteCorreo() { return clienteCorreo; }
    public void setClienteCorreo(String clienteCorreo) { this.clienteCorreo = clienteCorreo; }
    public String getMetodoPago() { return metodoPago; }
    public void setMetodoPago(String metodoPago) { this.metodoPago = metodoPago; }
    public Integer getIdUsuario() { return idUsuario; }
    public void setIdUsuario(Integer idUsuario) { this.idUsuario = idUsuario; }
    public List<Item> getItems() { return items; }
    public void setItems(List<Item> items) { this.items = items; }
}
