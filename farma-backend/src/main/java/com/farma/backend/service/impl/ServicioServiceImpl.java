package com.farma.backend.service.impl;

import com.farma.backend.dto.ServicioRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Servicio;
import com.farma.backend.repository.ServicioRepository;
import com.farma.backend.service.ServicioService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class ServicioServiceImpl implements ServicioService {

    private final ServicioRepository servicioRepository;

    public ServicioServiceImpl(ServicioRepository servicioRepository) {
        this.servicioRepository = servicioRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Servicio> listar(boolean todos) {
        if (todos) {
            return servicioRepository.findAll();
        }
        return servicioRepository.findByActivoTrue();
    }

    @Override
    @Transactional(readOnly = true)
    public Servicio obtenerPorId(Integer id) {
        return servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));
    }

    @Override
    @Transactional
    public Servicio crear(ServicioRequest request) {
        if (request.getTitulo() == null || request.getTitulo().trim().isEmpty()) {
            throw new BadRequestException("El título del servicio es obligatorio.");
        }
        if (request.getDescripcion() == null || request.getDescripcion().trim().isEmpty()) {
            throw new BadRequestException("La descripción es obligatoria.");
        }

        Servicio servicio = new Servicio();
        servicio.setTitulo(request.getTitulo().trim());
        servicio.setDescripcion(request.getDescripcion().trim());
        servicio.setIcono((request.getIcono() != null && !request.getIcono().trim().isEmpty())
                ? request.getIcono().trim()
                : "bi-heart-pulse");
        servicio.setActivo(request.getActivo() != null ? request.getActivo() : true);
        servicio.setFechaCreacion(LocalDateTime.now());

        return servicioRepository.save(servicio);
    }

    @Override
    @Transactional
    public Servicio actualizar(Integer id, ServicioRequest request) {
        Servicio servicio = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));

        if (request.getTitulo() != null && !request.getTitulo().trim().isEmpty()) {
            servicio.setTitulo(request.getTitulo().trim());
        }
        if (request.getDescripcion() != null && !request.getDescripcion().trim().isEmpty()) {
            servicio.setDescripcion(request.getDescripcion().trim());
        }
        if (request.getIcono() != null && !request.getIcono().trim().isEmpty()) {
            servicio.setIcono(request.getIcono().trim());
        }
        if (request.getActivo() != null) {
            servicio.setActivo(request.getActivo());
        }

        return servicioRepository.save(servicio);
    }

    @Override
    @Transactional
    public void eliminar(Integer id) {
        Servicio servicio = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));
        servicioRepository.delete(servicio);
    }

    @Override
    @Transactional
    public Servicio cambiarEstado(Integer id, Boolean activo) {
        Servicio servicio = servicioRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Servicio no encontrado con ID: " + id));
        servicio.setActivo(activo != null ? activo : true);
        return servicioRepository.save(servicio);
    }
}
