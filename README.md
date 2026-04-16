# 📁 GestiónPro v3.0 (Versión Profesional)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fmikiaiapp%2Fgestionpro2)

GestiónPro es una plataforma SaaS de gestión empresarial moderna, diseñada para autónomos y pequeñas empresas que buscan profesionalizar su facturación y control de proyectos.

## ✨ Características Principales
- 📑 **Invoicing Pro**: Editor de facturas con líneas de detalle y cálculos automáticos.
- 🤖 **AI Import**: Importación de facturas en PDF mediante **Google Gemini API**.
- 📍 **Geo-Intelligence**: Autocompletado de municipios y provincias por Código Postal.
- 📈 **Análisis Financiero**: Control de márgenes previstos vs reales por proyecto.
- 🔒 **Security First**: Aislamiento total de datos mediante Row Level Security (RLS).
- 📱 **Multi-dispositivo**: Diseño premium adaptado a móviles y tablets.

## 🚀 Instalación en 2 Pasos

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
