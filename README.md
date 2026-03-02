# Codificador Médico CDI – Versión Web Estática

Herramienta offline orientada a la estandarización de **diagnósticos principales en Medicina Interna, basada estrictamente en las directrices del registro RECALMIN 2023** y la optimización de los Grupos Relacionados por el Diagnóstico (APR-GDR).

Esta es la **versión web estática** de la herramienta, diseñada para funcionar en cualquier ordenador de hospital sin requerir instalación de software, permisos de administrador ni conexión a internet (Offline-first).

---

## 🌟 Características Principales

- **Búsqueda Inteligente (Fuzzy Search):** El motor de búsqueda es tolerante a errores tipográficos y completamente agnóstico al orden en que se escriben las palabras.
- **Árboles de Decisión Dinámicos:** Las patologías y procedimientos complejos autogeneran botones interactivos de decisión (ej: *Diagnóstico vs. Terapéutico*, *Derecho vs. Izquierdo*) extraídos directamente de la normativa.
- **Alertas Clínicas CDI:** Avisos críticos integrados para advertir al clínico sobre la necesidad de documentar apellidos diagnósticos que aumentan la severidad médica (ej: *Shock*, *Fracaso Renal Agudo*).
- **Integración con Portapapeles (Clipboard API):** Copie el resultado final normativo con un solo clic para pegarlo directamente en el informe de alta o evolución del paciente de la historia clínica electrónica.
- **Despliegue Cero:** No requiere servidor (localhost) ni Node.js. Es HTML, CSS y JavaScript puro.

## 🚀 Inicio Rápido

1. Descargue o clone el repositorio en su equipo local.
2. Haga **doble clic** en el archivo `index.html` para abrirlo en su navegador web preferido (Chrome, Edge, Firefox).
3. Escriba un diagnóstico en la barra de búsqueda (ej. `insuficiencia cardiaca`, `falla hepatica`, `paracentesis`).

## 📁 Estructura del Proyecto

El código está organizado de la siguiente manera para maximizar la mantenibilidad:

| Archivo | Función |
|---------|---------|
| `index.html` | Estructura de la aplicación web y elementos de UI. |
| `app.js` | Motor lógico principal. Gestiona la búsqueda *fuzzy*, el renderizado dinámico del DOM y la API del portapapeles. |
| `styles.css` | Diseño visual y responsivo de la interfaz. |
| `data.js` | Base de datos precargada y pre-parseada. Contiene toda la lógica normativa. |
| `base_datos_recalmin.csv` | El dataset maestro original que utilizan los médicos documentalistas. |
| `sync.py` * | Script auxiliar para los desarrolladores. Convierte el `CSV` maestro hacia el formato nativo para `data.js`. |

*\* Los scripts de Python son herramientas exclusivas para mantenimiento; el clínico solo necesita el `index.html`.*

---

*Aplicación diseñada específicamente para los facultativos y médicos internos residentes del servicio de Medicina Interna.*
