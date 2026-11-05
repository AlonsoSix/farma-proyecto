package com.farma.backend.service;

import com.farma.backend.model.Producto;
import com.farma.backend.repository.ProductoRepository;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.TypedQuery;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.*;

/**
 * Avance Final: los 6 reportes del panel de administración.
 *   1. Ventas por mes                 4. Ventas por método de pago
 *   2. Productos más vendidos (top 10) 5. Estado del inventario
 *   3. Ventas por categoría           6. Productos por vencer
 * Los reportes de ventas (1 a 4) se pueden filtrar por fechas (desde / hasta).
 */
@Service
public class ReporteService {

    @PersistenceContext
    private EntityManager em;

    @Autowired
    private ProductoRepository productoRepository;

    @Autowired
    private ProductoService productoService;

    public Map<String, Object> generar(LocalDate desde, LocalDate hasta, Integer idUsuario) {
        productoService.verificarAdmin(idUsuario);
        LocalDateTime inicio = (desde != null ? desde : LocalDate.of(2000, 1, 1)).atStartOfDay();
        LocalDateTime fin = (hasta != null ? hasta : LocalDate.of(2100, 1, 1)).plusDays(1).atStartOfDay();
        if (!fin.isAfter(inicio)) {
            throw new IllegalArgumentException("La fecha 'desde' no puede ser mayor que la fecha 'hasta'.");
        }

        Map<String, Object> r = new LinkedHashMap<>();
        r.put("desde", desde);
        r.put("hasta", hasta);
        r.put("generado", LocalDateTime.now());
        r.put("resumen", resumen(inicio, fin));
        r.put("ventasPorMes", ventasPorMes(inicio, fin));
        r.put("productosMasVendidos", productosMasVendidos(inicio, fin));
        r.put("ventasPorCategoria", ventasPorCategoria(inicio, fin));
        r.put("metodosPago", metodosPago(inicio, fin));

        List<Producto> productos = productoRepository.findAllByOrderByCodigoAsc();
        r.put("inventario", inventario(productos));
        r.put("vencimientos", vencimientos(productos));
        return r;
    }

    /* ---------- Resumen general (tarjetas de arriba) ---------- */
    private Map<String, Object> resumen(LocalDateTime inicio, LocalDateTime fin) {
        Object[] v = em.createQuery("""
                SELECT COUNT(v), COALESCE(SUM(v.total), 0), COALESCE(SUM(v.descuentoTotal), 0)
                FROM Venta v WHERE v.fecha >= :inicio AND v.fecha < :fin
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getSingleResult();
        Long unidades = em.createQuery("""
                SELECT COALESCE(SUM(d.cantidad), 0) FROM DetalleVenta d
                WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                """, Long.class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getSingleResult();

        long cantidad = ((Number) v[0]).longValue();
        BigDecimal total = dinero(v[1]);
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("ventas", cantidad);
        m.put("ingresos", total);
        m.put("ahorroOfertas", dinero(v[2]));
        m.put("unidades", unidades);
        m.put("ticketPromedio", cantidad == 0 ? BigDecimal.ZERO
                : total.divide(BigDecimal.valueOf(cantidad), 2, RoundingMode.HALF_UP));
        return m;
    }

    /* ---------- 1. Ventas por mes ---------- */
    private List<Map<String, Object>> ventasPorMes(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT YEAR(v.fecha), MONTH(v.fecha), COUNT(v), SUM(v.total), SUM(v.descuentoTotal)
                FROM Venta v WHERE v.fecha >= :inicio AND v.fecha < :fin
                GROUP BY YEAR(v.fecha), MONTH(v.fecha)
                ORDER BY YEAR(v.fecha), MONTH(v.fecha)
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("anio", ((Number) f[0]).intValue());
            m.put("mes", ((Number) f[1]).intValue());
            m.put("ventas", ((Number) f[2]).longValue());
            m.put("total", dinero(f[3]));
            m.put("descuentos", dinero(f[4]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 2. Productos más vendidos (top 10 por unidades) ---------- */
    private List<Map<String, Object>> productosMasVendidos(LocalDateTime inicio, LocalDateTime fin) {
        TypedQuery<Object[]> q = em.createQuery("""
                SELECT d.codigo, d.nombre, SUM(d.cantidad), SUM(d.importe)
                FROM DetalleVenta d WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                GROUP BY d.codigo, d.nombre
                ORDER BY SUM(d.cantidad) DESC, SUM(d.importe) DESC
                """, Object[].class);
        List<Object[]> filas = q.setParameter("inicio", inicio).setParameter("fin", fin)
                .setMaxResults(10).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("codigo", f[0]);
            m.put("nombre", f[1]);
            m.put("unidades", ((Number) f[2]).longValue());
            m.put("total", dinero(f[3]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 3. Ventas por categoría ---------- */
    private List<Map<String, Object>> ventasPorCategoria(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT COALESCE(d.categoria, 'Otros'), SUM(d.cantidad), SUM(d.importe)
                FROM DetalleVenta d WHERE d.venta.fecha >= :inicio AND d.venta.fecha < :fin
                GROUP BY COALESCE(d.categoria, 'Otros')
                ORDER BY SUM(d.importe) DESC
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("categoria", f[0]);
            m.put("unidades", ((Number) f[1]).longValue());
            m.put("total", dinero(f[2]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 4. Ventas por método de pago ---------- */
    private List<Map<String, Object>> metodosPago(LocalDateTime inicio, LocalDateTime fin) {
        List<Object[]> filas = em.createQuery("""
                SELECT v.metodoPago, COUNT(v), SUM(v.total)
                FROM Venta v WHERE v.fecha >= :inicio AND v.fecha < :fin
                GROUP BY v.metodoPago
                ORDER BY COUNT(v) DESC
                """, Object[].class)
                .setParameter("inicio", inicio).setParameter("fin", fin).getResultList();
        List<Map<String, Object>> lista = new ArrayList<>();
        for (Object[] f : filas) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("metodo", f[0]);
            m.put("ventas", ((Number) f[1]).longValue());
            m.put("total", dinero(f[2]));
            lista.add(m);
        }
        return lista;
    }

    /* ---------- 5. Estado del inventario ---------- */
    private Map<String, Object> inventario(List<Producto> productos) {
        int disponibles = 0, stockBajo = 0, agotados = 0, deBaja = 0;
        BigDecimal valor = BigDecimal.ZERO;
        List<Map<String, Object>> criticos = new ArrayList<>();
        for (Producto p : productos) {
            if (!Boolean.TRUE.equals(p.getActivo())) { deBaja++; continue; }
            int s = p.getStock() == null ? 0 : p.getStock();
            if (s <= 0) agotados++;
            else if (s <= 5) stockBajo++;
            else disponibles++;
            valor = valor.add(p.getPrecio().multiply(BigDecimal.valueOf(s)));
            if (s <= 5) {
                Map<String, Object> m = new LinkedHashMap<>();
                m.put("codigo", p.getCodigo());
                m.put("nombre", p.getNombre());
                m.put("stock", s);
                criticos.add(m);
            }
        }
        criticos.sort(Comparator.comparingInt(m -> (Integer) m.get("stock")));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("disponibles", disponibles);
        m.put("stockBajo", stockBajo);
        m.put("agotados", agotados);
        m.put("deBaja", deBaja);
        m.put("valorInventario", valor.setScale(2, RoundingMode.HALF_UP));
        m.put("criticos", criticos);
        return m;
    }

    /* ---------- 6. Productos por vencer ---------- */
    private Map<String, Object> vencimientos(List<Producto> productos) {
        LocalDate hoy = LocalDate.now();
        // Rangos: vencidos, hasta 3 meses, 3 a 6 meses, 6 a 12 meses, más de 12 meses, no vence
        long[] rangos = new long[6];
        List<Map<String, Object>> proximos = new ArrayList<>();
        for (Producto p : productos) {
            if (!Boolean.TRUE.equals(p.getActivo())) continue;
            if (p.getFechaVencimiento() == null) { rangos[5]++; continue; }
            long dias = ChronoUnit.DAYS.between(hoy, p.getFechaVencimiento());
            if (dias < 0) rangos[0]++;
            else if (dias <= 90) rangos[1]++;
            else if (dias <= 180) rangos[2]++;
            else if (dias <= 365) rangos[3]++;
            else rangos[4]++;
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("codigo", p.getCodigo());
            m.put("nombre", p.getNombre());
            m.put("fechaVencimiento", p.getFechaVencimiento());
            m.put("dias", dias);
            m.put("stock", p.getStock());
            proximos.add(m);
        }
        proximos.sort(Comparator.comparingLong(m -> (Long) m.get("dias")));
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("etiquetas", List.of("Vencidos", "Hasta 3 meses", "3 a 6 meses", "6 a 12 meses", "Más de 12 meses", "No vence"));
        m.put("cantidades", Arrays.stream(rangos).boxed().toList());
        m.put("proximos", proximos.subList(0, Math.min(8, proximos.size())));
        return m;
    }

    private BigDecimal dinero(Object valor) {
        if (valor == null) return BigDecimal.ZERO.setScale(2);
        BigDecimal b = valor instanceof BigDecimal bd ? bd : new BigDecimal(valor.toString());
        return b.setScale(2, RoundingMode.HALF_UP);
    }
}
