package com.farma.backend.repository;

import com.farma.backend.model.Producto;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface ProductoRepository extends JpaRepository<Producto, Integer> {

    // Búsqueda exacta por código (FAR-0001), sin importar mayúsculas/minúsculas
    Optional<Producto> findByCodigoIgnoreCase(String codigo);

    // Último código registrado, para generar el siguiente (FAR-0020 -> FAR-0021)
    Optional<Producto> findTopByOrderByCodigoDesc();

    // Búsqueda parcial por código, nombre, marca o categoría
    @Query("""
           SELECT p FROM Producto p
           WHERE LOWER(p.codigo)    LIKE LOWER(CONCAT('%', :texto, '%'))
              OR LOWER(p.nombre)    LIKE LOWER(CONCAT('%', :texto, '%'))
              OR LOWER(p.marca)     LIKE LOWER(CONCAT('%', :texto, '%'))
              OR LOWER(p.categoria) LIKE LOWER(CONCAT('%', :texto, '%'))
           ORDER BY p.codigo
           """)
    List<Producto> buscar(@Param("texto") String texto);

    List<Producto> findAllByOrderByCodigoAsc();

    // Solo los productos activos (los que se muestran en la tienda)
    List<Producto> findByActivoTrueOrderByCodigoAsc();
}
