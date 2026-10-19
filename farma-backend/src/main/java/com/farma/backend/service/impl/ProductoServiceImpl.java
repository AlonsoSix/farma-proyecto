package com.farma.backend.service.impl;

import com.farma.backend.dto.ProductoRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import com.farma.backend.service.ProductoService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class ProductoServiceImpl implements ProductoService {

    private final ProductoRepository productoRepository;

    public ProductoServiceImpl(ProductoRepository productoRepository) {
        this.productoRepository = productoRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Producto> listarTodos() {
        return productoRepository.findAll();
    }

    @Override
    @Transactional(readOnly = true)
    public Producto obtenerPorId(Integer id) {
        return productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + id));
    }

    @Override
    @Transactional
    public Producto crear(ProductoRequest request) {
        if (request.getNombre() == null || request.getNombre().trim().isEmpty()) {
            throw new BadRequestException("El nombre del producto es obligatorio.");
        }
        if (request.getPrecio() == null || request.getPrecio().compareTo(BigDecimal.ZERO) < 0) {
            throw new BadRequestException("El precio debe ser mayor o igual a 0.");
        }

        Producto producto = new Producto();
        producto.setNombre(request.getNombre().trim());
        producto.setDescripcion(request.getDescripcion() != null ? request.getDescripcion().trim() : "");
        producto.setPrecio(request.getPrecio());
        producto.setCategoria(request.getCategoria() != null ? request.getCategoria().trim() : "");
        producto.setImagenUrl(request.getImagenUrl() != null ? request.getImagenUrl().trim() : "");
        producto.setStock(request.getStock() != null && request.getStock() >= 0 ? request.getStock() : 0);
        producto.setFechaCreacion(LocalDateTime.now());

        return productoRepository.save(producto);
    }

    @Override
    @Transactional
    public Producto actualizar(Integer id, ProductoRequest request) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + id));

        if (request.getNombre() != null && !request.getNombre().trim().isEmpty()) {
            producto.setNombre(request.getNombre().trim());
        }
        if (request.getDescripcion() != null) {
            producto.setDescripcion(request.getDescripcion().trim());
        }
        if (request.getPrecio() != null) {
            if (request.getPrecio().compareTo(BigDecimal.ZERO) < 0) {
                throw new BadRequestException("El precio debe ser mayor o igual a 0.");
            }
            producto.setPrecio(request.getPrecio());
        }
        if (request.getCategoria() != null) {
            producto.setCategoria(request.getCategoria().trim());
        }
        if (request.getImagenUrl() != null) {
            producto.setImagenUrl(request.getImagenUrl().trim());
        }
        if (request.getStock() != null) {
            if (request.getStock() < 0) {
                throw new BadRequestException("El stock no puede ser negativo.");
            }
            producto.setStock(request.getStock());
        }

        return productoRepository.save(producto);
    }

    @Override
    @Transactional
    public void eliminar(Integer id) {
        Producto producto = productoRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Producto no encontrado con ID: " + id));
        productoRepository.delete(producto);
    }
}
