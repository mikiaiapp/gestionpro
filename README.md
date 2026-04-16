# 📁 GestiónPro v1.5 (Build OK)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikiaiapp%2Fgestionpro2)

GestiónPro es una plataforma SaaS de gestión empresarial moderna y profesional, diseñada para cumplir con los estándares de facturación más exigentes.

## ✨ Características Principales
- 📑 **Invoicing & Budgets**: Gestión de facturas y presupuestos profesionales con exportación a PDF.
- 🏗️ **Project Advance Invoicing**: Sistema de facturación por hitos/porcentaje (Certificaciones de obra) con cálculo automático sobre el presupuesto del proyecto.
- ⚖️ **Compliance Legal**: Preparada para la **Ley Crea y Crece** y la normativa **Veri*factu**, incluyendo identificadores de trazabilidad y códigos QR.
- 🔒 **Integridad de Datos**: Bloqueos inteligentes para evitar saltos de numeración y eliminación de registros con dependencias activas.
- 📊 **Análisis de Rentabilidad**: Resumen dinámico de márgenes por proyecto con comparativa de ventas vs costes reales.
- 🤖 **AI Import**: Importación de facturas en PDF mediante **Google Gemini API**.
- 📍 **Geo-Intelligence**: Autocompletado de municipios y provincias por Código Postal.

## 🚀 Instalación en 2 Pasos
... (Misma estructura de instalación) ...

### 1. Despliegue en Vercel
Haz clic en el botón **"Deploy with Vercel"** de arriba. Deberás configurar las siguientes variables de entorno:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 2. Configuración de Base de Datos (Supabase)
1. Crea un proyecto gratuito en [Supabase](https://supabase.com).
2. Entra en el **SQL Editor**.
3. Copia el contenido del archivo [`supabase_schema.sql`](./supabase_schema.sql) y ejecútalo.
4. ¡Listo! Ya puedes empezar a usar tu instancia privada.

---

## 🛠️ Tecnologías
- **Frontend**: Next.js 14, Tailwind CSS, Lucide Icons.
- **Backend**: Supabase (Auth, DB, RLS).
- **IA**: Google Gemini Cloud Service.

---
*GestiónPro: Control total, estés donde estés.*
