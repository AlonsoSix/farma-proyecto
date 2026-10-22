package com.farma.backend.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Datos que envía el administrador al registrar o editar un producto.
 * No incluye id ni código: el código lo genera el sistema y no se puede cambiar.
 */
public class ProductoRequest {

    private String nombre;
    private String marca;
    private String descripcion;
    private BigDecimal precio;
    private String categoria;
    private String imagenUrl;
    private Integer stock;
    private LocalDate fechaVencimiento;

    public String getNombre() { return nombre; }
    public void setNombre(String nombre) { this.nombre = nombre; }
    public String getMarca() { return marca; }
    public void setMarca(String marca) { this.marca = marca; }
    public String getDescripcion() { return descripcion; }
    public void setDescripcion(String descripcion) { this.descripcion = descripcion; }
    public BigDecimal getPrecio() { return precio; }
    public void setPrecio(BigDecimal precio) { this.precio = precio; }
    public String getCategoria() { return categoria; }
    public void setCategoria(String categoria) { this.categoria = categoria; }
    public String getImagenUrl() { return imagenUrl; }
    public void setImagenUrl(String imagenUrl) { this.imagenUrl = imagenUrl; }
    public Integer getStock() { return stock; }
    public void setStock(Integer stock) { this.stock = stock; }
    public LocalDate getFechaVencimiento() { return fechaVencimiento; }
    public void setFechaVencimiento(LocalDate fechaVencimiento) { this.fechaVencimiento = fechaVencimiento; }
}
