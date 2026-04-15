# GestiónPro v3.0 (Versión Profesional)

Bienvenido a la nueva era de **GestiónPro**. Este repositorio ha sido saneado y migrado de un archivo monolítico de 5.000 líneas a una arquitectura modular basada en **Next.js 14**, **TypeScript** y **Tailwind CSS**.

## 🚀 Cómo empezar

Dado que el entorno actual no tiene Node.js configurado en el PATH, sigue estos pasos una vez lo tengas instalado:

1.  **Instalar Dependencias**:
    ```bash
    npm install
    ```

2.  **Lanzar Entorno de Desarrollo**:
    ```bash
    npm run dev
    ```

3.  **Acceder a la App**:
    Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📁 Nueva Estructura

-   `/src/app`: Rutas y páginas de la aplicación (App Router).
-   `/src/components`: Componentes UI reutilizables (Sidebar, Cards, etc.).
-   `/legacy`: Contiene la versión anterior (`index.html`) para referencia de datos y lógica.

## 🛡️ Siguientes Pasos (Saneamiento)

1.  **Migración de Datos**: Implementar la conexión con Supabase (PostgreSQL) para alojar los datos que antes estaban en el archivo JSON.
2.  **Lógica de Negocio**: Portar las funciones de cálculo de IVA e IRPF desde `legacy/index.html` a la nueva estructura en `src/lib`.
3.  **PDFs**: Configurar una librería moderna para generación de facturas en el servidor.

---
*Desarrollado con ❤️ por Antigravity para Miguel Ángel.*
