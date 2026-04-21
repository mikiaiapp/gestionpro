# 🚀 GestiónPro v1.6 - Professional Build

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikiaiapp%2Fgestionpro2)

GestiónPro es una plataforma SaaS de gestión empresarial moderna y profesional, diseñada para cumplir con los estándares de facturación más exigentes. Esta versión (v1.6) introduce mejoras críticas en integridad de datos, automatización de contadores y refinamiento visual.

## ✨ Características Destacadas
- 🤖 **IA Auto-Suficiente**: Extracción de facturas mediante Google Gemini con proxy de servidor.
- 🔢 **Contadores Inteligentes (Gap-Filling)**: Lógica automatizada que detecta números de facturas o presupuestos eliminados y los propone para los nuevos registros, asegurando una numeración correlativa sin saltos (Exigencia de Hacienda).
- 🧹 **Gestor Documental Limpio**: Nuevo motor de integridad que solo muestra PDFs vinculados a registros reales. Incluye herramienta de **Limpieza de Huérfanos** para purgar el Storage de archivos sin referencia.
- 💶 **Formato Moneda España**: Visualización y exportación profesional con separador de miles (.) y decimales (,) (Ej: `1.500,25 €`).
- 📦 **Portabilidad Universal**: Exportación total de datos y archivos en un único ZIP para migraciones instantáneas.

## 🚀 Guía de Despliegue Rápido

### 1. Configurar Supabase
1.  **Proyecto**: Crea un proyecto en [Supabase](https://supabase.com).
2.  **Esquema SQL**: Ejecuta [`supabase_schema.sql`](./supabase_schema.sql) y luego [`setup_document_counters.sql`](./setup_document_counters.sql).
3.  **Storage**: Crea un bucket **público** llamado **`facturas-recibidas`**.
4.  **Auth (Redirección)**: 
    *   Ve a `Authentication` > `URL Configuration`.
    *   En **Site URL**, pon tu dominio de Vercel (ej: `https://mi-gestion.vercel.app`).
    *   En **Redirect URLs**, añade también tu dominio. 
    *   *Esto evita que los correos de confirmación apunten a localhost.*

### 2. Despliegue en Vercel
1.  Conecta tu repositorio y configura las variables:
    *   `NEXT_PUBLIC_SUPABASE_URL`
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`
2.  Activa la IA pegando tu clave de Google AI Studio en **Ajustes** dentro de la app.

## 🛠️ Stack Tecnológico
- **Core**: Next.js 14, TypeScript, Tailwind CSS.
- **Backend**: Supabase (Auth, DB RLS, Storage).
- **Iconografía**: Lucide React (Sistema de edición semántico con iconos de lápiz).
- **PDF**: jsPDF + AutoTable (Formato corporativo con tipografía helvetica).

---
*GestiónPro: Control total, integridad absoluta. Diseñador por mikiaiapp.*
