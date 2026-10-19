package com.farma.backend.service;

import com.farma.backend.dto.ServicioRequest;
import com.farma.backend.exception.BadRequestException;
import com.farma.backend.exception.ResourceNotFoundException;
import com.farma.backend.model.Servicio;
import com.farma.backend.repository.ServicioRepository;
import com.farma.backend.service.impl.ServicioServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServicioServiceImplTest {

    @Mock
    private ServicioRepository servicioRepository;

    @InjectMocks
    private ServicioServiceImpl servicioService;

    private Servicio servicioMock;
    private ServicioRequest servicioRequest;

    @BeforeEach
    void setUp() {
        servicioMock = new Servicio("Delivery", "Envío a domicilio", "bi-truck", true);
        servicioMock.setId(1);

        servicioRequest = new ServicioRequest("Delivery", "Envío a domicilio", "bi-truck", true);
    }

    @Test
    @DisplayName("Debe listar servicios activos o todos")
    void listar_Exito() {
        when(servicioRepository.findByActivoTrue()).thenReturn(List.of(servicioMock));
        when(servicioRepository.findAll()).thenReturn(List.of(servicioMock));

        List<Servicio> activos = servicioService.listar(false);
        assertEquals(1, activos.size());

        List<Servicio> todos = servicioService.listar(true);
        assertEquals(1, todos.size());
    }

    @Test
    @DisplayName("Debe obtener un servicio por ID")
    void obtenerPorId_Exito() {
        when(servicioRepository.findById(1)).thenReturn(Optional.of(servicioMock));

        Servicio res = servicioService.obtenerPorId(1);
        assertNotNull(res);
        assertEquals(1, res.getId());
    }

    @Test
    @DisplayName("Debe crear un nuevo servicio correctamente")
    void crear_Exito() {
        when(servicioRepository.save(any(Servicio.class))).thenReturn(servicioMock);

        Servicio creado = servicioService.crear(servicioRequest);
        assertNotNull(creado);
        assertEquals("Delivery", creado.getTitulo());
    }

    @Test
    @DisplayName("Debe lanzar BadRequestException si el título está vacío")
    void crear_TituloVacio_LanzaExcepcion() {
        servicioRequest.setTitulo(" ");

        assertThrows(BadRequestException.class, () -> servicioService.crear(servicioRequest));
    }

    @Test
    @DisplayName("Debe cambiar el estado de activo de un servicio")
    void cambiarEstado_Exito() {
        when(servicioRepository.findById(1)).thenReturn(Optional.of(servicioMock));
        when(servicioRepository.save(any(Servicio.class))).thenAnswer(i -> i.getArgument(0));

        Servicio actualizado = servicioService.cambiarEstado(1, false);
        assertNotNull(actualizado);
        assertFalse(actualizado.getActivo());
    }

    @Test
    @DisplayName("Debe eliminar un servicio existente")
    void eliminar_Exito() {
        when(servicioRepository.findById(1)).thenReturn(Optional.of(servicioMock));
        doNothing().when(servicioRepository).delete(servicioMock);

        assertDoesNotThrow(() -> servicioService.eliminar(1));
        verify(servicioRepository, times(1)).delete(servicioMock);
    }
}
