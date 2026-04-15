@echo off
title Asistente de Instalacion GestionPro
setlocal enabledelayedexpansion

echo ======================================================
echo           BIENVENIDO A GESTIONPRO v3.0
echo ======================================================
echo.
echo Este asistente preparara todo para que puedas trabajar.
echo.

:: 1. Comprobar Winget
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [!] Ups, no encuentro 'Winget'. 
    echo Por favor, instala 'App Installer' desde la Microsoft Store primero.
    pause
    exit /b
)

:: 2. Instalar Node.js
node -v >nul 2>&1
if %errorlevel% neq 0 (
    echo [1/3] Preparando el motor (Node.js)... esto tardara un poquito.
    winget install OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements --silent
    echo.
    echo [!] Motor instalado. Por favor, CIERRA esta ventana y vuelve a ejecutar 'install.bat'.
    pause
    exit /b
) else (
    echo [1/3] El motor (Node.js) ya esta listo.
)

:: 3. Instalar dependencias
echo [2/3] Descargando las piezas de la aplicacion...
call npm install --no-audit --no-fund

:: 4. Finalizar y Preguntar
echo.
echo ======================================================
echo [3/3] TODO LISTO PARA DESPEGAR!
echo ======================================================
echo.
set /p choice="¿Quieres arrancar la aplicacion ahora mismo? (S/N): "
if /i "%choice%"=="S" (
    echo Abriendo GestionPro en tu navegador...
    start http://localhost:3000
    npm run dev
) else (
    echo.
    echo Perfecto. Cuando quieras empezar, solo escribe 'npm run dev' en esta carpeta.
    pause
)
