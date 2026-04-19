# 🚀 GestiónPro v1.5 - Producción (Build Final)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikiaiapp%2Fgestionpro2)

GestiónPro es una plataforma SaaS de gestión empresarial moderna y profesional, diseñada para cumplir con los estándares de facturación más exigentes. El sistema ahora incluye **Inteligencia Artificial Adaptativa** y un sistema de **Portabilidad Universal**.

## ✨ Características de Última Generación
- 🤖 **IA Auto-Suficiente**: Extracción de facturas recibidas (gastos) mediante Google Gemini. El sistema se auto-adapta a nuevos modelos de Google y funciona tras un **Proxy de Servidor** para evitar bloqueos del navegador.
- 📦 **Portabilidad ZIP**: Sistema de backups que genera un archivo comprimido con todos tus datos (JSON) y tus facturas originales (PDFs), permitiendo migrar de una cuenta de Supabase a otra en segundos.
- 📑 **Invoicing & Compliance**: Facturas y presupuestos profesionales con exportación a PDF, códigos QR y cumplimiento de normativa fiscal.
- 📗 **Libros de IVA**: Generación de listados oficiales de IVA Soportado y Repercutido en PDF/Excel.

## 🚀 Guía de Despliegue Rápido (5 Minutos)

Sigue estos pasos exactos para una instalación impecable:

### 1. Configurar Supabase (Base de Datos)
1.  **Proyecto Nuevo**: Crea un proyecto en [Supabase](https://supabase.com).
2.  **Esquema SQL**: Entra en `SQL Editor` > `New Query`, pega el contenido de [`supabase_schema.sql`](./supabase_schema.sql) y pulsa **Run**.
3.  **Storage (Crítico)**:
    *   Ve a `Storage` > `New Bucket`.
    *   Nómbralo exactamente: **`facturas-recibidas`**.
    *   ⚠️ **Importante**: Márcalo como **Public** para que las facturas sean accesibles.
4.  **Autenticación**: En `Auth` > `Providers`, activa el registro por Email (puedes desactivar "Confirm Email" para pruebas).

### 2. Despliegue en Vercel
1.  Pulsa el botón **Deploy with Vercel** de arriba.
2.  Configura las variables de entorno (`Project Settings` > `API` en Supabase):
    *   `NEXT_PUBLIC_SUPABASE_URL`: Tu URL del proyecto.
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Tu clave pública `anon`.
3.  **¡Listo!** Una vez termine, entra en tu URL y crea tu cuenta.

### 3. Activar la IA de Extracción
1.  Consigue una clave API gratuita en [Google AI Studio](https://aistudio.google.com/).
2.  Dentro de GestiónPro, ve a **Ajustes** > **Perfil de Negocio**.
3.  Pega tu clave en el campo **Gemini API Key** y guarda.
4.  Ya puedes ir a **Costes** e importar facturas directamente desde archivos PDF.

---

## 🛠️ Stack Tecnológico
- **Core**: Next.js 14, TypeScript, Tailwind CSS.
- **Backend**: Supabase (Auth, DB con RLS fuerte, Storage).
- **IA**: Google Gemini Cloud (Motor autónomo con Proxy de Servidor).
- **Backups**: JSZip (Compresión de datos y archivos binarios).

## 🔒 Seguridad y Privacidad
- **RLS (Row Level Security)**: Los datos de cada usuario están aislados a nivel de base de datos.
- **AI Proxy**: Las peticiones de IA se procesan en el servidor (`/api/ai/extract`), protegiendo tu clave API y evitando AdBlockers.

---
*GestiónPro: Control total, portabilidad absoluta. Producido por mikiaiapp.*
