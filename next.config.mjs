/** @type {import('next').NextConfig} */
const nextConfig = {
  // Configuración para permitir despliegue en GitHub Pages o Vercel
  // Si usas GitHub Pages, descomenta la línea 'output: export'
  // output: 'export', 
  
  images: {
    unoptimized: true, // Necesario para despliegues estáticos y Drive
  },
  
  // Si despliegas en mikiaiapp.github.io/gestionpro/, activa esta línea:
  // basePath: '/gestionpro',
};

export default nextConfig;
