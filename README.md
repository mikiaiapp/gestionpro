# 📁 GestiónPro v1.5 (Build OK)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikiaiapp%2Fgestionpro2)

GestiónPro es una plataforma SaaS de gestión empresarial moderna y profesional, diseñada para cumplir con los estándares de facturación más exigentes.

## ✨ Características Principales
- 📑 **Invoicing & Budgets**: Gestión de facturas y presupuestos profesionales con exportación a PDF.
- 🏗️ **Project Advance Invoicing**: Sistema de facturación por hitos/porcentaje con cálculo automático sobre el presupuesto.
- 🤖 **AI-Powered Expenses**: Registro de facturas recibidas (gastos) de forma manual o mediante **importación automática de PDF** analizados con **Google Gemini AI**.
- 📈 **Rentabilidad por Proyecto**: Panel de análisis dinámico que cruza ventas vs costes reales para obtener el margen neto de cada obra o servicio.
- 📗 **Libros de IVA**: Generación automática de libros de IVA **Soportado** (Costes) e IVA **Repercutido** (Ventas) listos para la liquidación de impuestos.
- ⚖️ **Compliance Legal**: Preparada para la **Ley Crea y Crece** y normativa **Veri*factu**, con trazabilidad digital y códigos QR.
- 🔒 **Integridad de Datos**: Bloqueos inteligentes para mantener correlatividad numérica y evitar borrados accidentales de datos con dependencias.
- 📍 **Geo-Intelligence**: Autocompletado de municipios y provincias por Código Postal.

## 🚀 Guía Detallada de Instalación

Sigue estos pasos para tener tu propia instancia privada de GestiónPro totalmente operativa.

### 1. Preparar la Base de Datos (Supabase)
GestiónPro utiliza **Supabase** como motor de base de datos, sistema de autenticación y almacenamiento.
1.  **Crea un proyecto**: Ve a [Supabase](https://supabase.com) y crea un nuevo proyecto gratuito.
2.  **Ejecuta el Esquema**: 
    *   En el menú lateral, entra en el **SQL Editor**.
    *   Haz clic en **"New Query"**.
    *   Copia y pega íntegramente el contenido del archivo [`supabase_schema.sql`](./supabase_schema.sql) de este repositorio.
    *   Pulsa **Run**. Esto creará todas las tablas, relaciones y las reglas de seguridad (RLS) que garantizan que tus datos sean privados.
3.  **Configura la Autenticación**:
    *   Ve a **Authentication > Providers**.
    *   Asegúrate de que el proveedor **Email** está activado (es el que viene por defecto).
    *   *Recomendación*: Puedes desactivar "Confirm Email" en los ajustes de Auth para empezar a probar inmediatamente sin esperar correos de verificación.

### 2. Despliegue en Vercel
1.  Haz clic en el botón **"Deploy with Vercel"** ubicado al principio de este README.
2.  **Configura las Variables de Entorno**: Vercel te pedirá dos valores críticos. Para encontrarlos en Supabase, ve a **Project Settings > API**:
    *   `NEXT_PUBLIC_SUPABASE_URL`: Es la URL de tu proyecto (ej: `https://xyz.supabase.co`).
    *   `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Es la clave pública (identificada como `anon` `public`).
3.  Pulsa **Deploy**. Una vez termine el proceso (aprox. 3 minutos), tendrás tu URL pública lista.

### 3. Primer Acceso
*   Entra en tu nueva URL y ve a la página de **Registro**.
*   Crea tu cuenta de administrador.
*   ¡Listo! Recomendamos configurar tus datos de empresa en **Ajustes** para que tus facturas y presupuestos salgan con tu identidad corporativa.

---

## 🛠️ Tecnologías
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: Supabase (Auth, DB, RLS).
- **IA**: Google Gemini Cloud Service.

---
*GestiónPro: Control total, estés donde estés.*
