# Codificador Médico CDI – Versión Web Estática

Herramienta offline de codificación CIE-10-ES y optimización APR-GDR para el Servicio de Medicina Interna.

## Descripción

Aplicación web estática (HTML + JavaScript + CSS) para la estandarización de **diagnósticos principales en Medicina Interna, basado en el registro RECALMIN 2023**. 
Permite a los médicos buscar diagnósticos y procedimientos interactivamente con:

- **Motor de búsqueda fuzzy** tolerante a errores tipográficos y agnóstico al orden de palabras.
- **Árboles de decisión dinámicos** generados automáticamente desde corchetes `[Opción 1 / Opción 2]` en el texto normativo.
- **Alertas CDI** con recomendaciones de codificación específicas para cada diagnóstico.
- **Clipboard API** para copiar el texto normativo directamente al portapapeles.

## Uso

Abra el archivo `index.html` directamente en su navegador web (arránstrelo o haga doble clic).
**No requiere de un servidor local (localhost) ni de conexión a internet para funcionar.** (Offline-first).

## Estructura

| Archivo | Descripción |
|---------|-------------|
| `index.html` | Página principal |
| `app.js` | Motor de búsqueda y renderizado de UI |
| `data.js` | Dataset pre-parseado con árboles de decisión |
| `styles.css` | Estilos visuales |
| `base_datos_recalmin.csv` | Base de datos fuente (formato CSV con `;`) |
| `update_csv.py` | Script para regenerar el CSV maestro |
| `sync.py` | Sincroniza el CSV a `data.js` |


