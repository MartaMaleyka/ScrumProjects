@echo off
echo ========================================
echo   Iniciando Servidor Gestor de Proyectos
echo ========================================
echo.
echo Cambiando a la carpeta api...
cd api
echo.
echo Verificando package.json...
if not exist package.json (
    echo ERROR: No se encuentra package.json en la carpeta api
    pause
    exit /b 1
)
echo.
echo Iniciando servidor...
echo.
npm run dev
pause

