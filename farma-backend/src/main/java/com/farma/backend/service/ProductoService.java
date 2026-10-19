package com.farma.backend.service;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.model.Producto;

import java.util.List;

public interface ProductoService {
    List<Producto> listarTodos();
    Producto obtenerPorId(Integer id);
    Producto crear(ProductoRequest request);
    Producto actualizar(Integer id, ProductoRequest request);
    void eliminar(Integer id);
}
