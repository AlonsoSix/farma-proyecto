package com.farma.backend.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;

import java.math.BigDecimal;

public class ProductoRequest {

    @NotBlank(message = "El nombre del producto es obligatorio.")
    private String nombre;

    private String descripcion;

    @NotNull(message = "El precio es obligatorio.")
    @PositiveOrZero(message = "El precio debe ser mayor o igual a 0.")
    private BigDecimal precio;

    private String categoria;

    private String imagenUrl;

    @PositiveOrZero(message = "El stock debe ser mayor o igual a 0.")
    private Integer stock;

    public ProductoRequest() {
    }

    public ProductoRequest(String nombre, String descripcion, BigDecimal precio, String categoria, String imagenUrl, Integer stock) {
        this.nombre = nombre;
        this.descripcion = descripcion;
        this.precio = precio;
        this.categoria = categoria;
        this.imagenUrl = imagenUrl;
        this.stock = stock;
    }

    public String getNombre() {
        return nombre;
    }

    public void setNombre(String nombre) {
        this.nombre = nombre;
    }

    public String getDescripcion() {
        return descripcion;
    }

    public void setDescripcion(String descripcion) {
        this.descripcion = descripcion;
    }

    public BigDecimal getPrecio() {
        return precio;
    }

    public void setPrecio(BigDecimal precio) {
        this.precio = precio;
    }

    public String getCategoria() {
        return categoria;
    }

    public void setCategoria(String categoria) {
        this.categoria = categoria;
    }

    public String getImagenUrl() {
        return imagenUrl;
    }

    public void setImagenUrl(String imagenUrl) {
        this.imagenUrl = imagenUrl;
    }

    public Integer getStock() {
        return stock;
    }

    public void setStock(Integer stock) {
        this.stock = stock;
    }
}
