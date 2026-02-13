Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Iniciando Servidor Gestor de Proyectos" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

Write-Host "Cambiando a la carpeta api..." -ForegroundColor Yellow
Set-Location -Path "api"

Write-Host ""
Write-Host "Verificando package.json..." -ForegroundColor Yellow
if (-not (Test-Path "package.json")) {
    Write-Host "ERROR: No se encuentra package.json en la carpeta api" -ForegroundColor Red
    Read-Host "Presiona Enter para salir"
    exit 1
}

Write-Host ""
Write-Host "Iniciando servidor..." -ForegroundColor Green
Write-Host ""
npm run dev

