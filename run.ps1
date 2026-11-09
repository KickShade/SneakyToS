# =====================================================
# SneakyToS — Quick Local Launcher (PowerShell)
# =====================================================

Write-Host "=====================================================" -ForegroundColor Cyan
Write-Host "           Starting SneakyToS Full-Stack             " -ForegroundColor Cyan
Write-Host "=====================================================" -ForegroundColor Cyan

# 1. Start FastAPI Backend in a separate window
Write-Host "`n[1/2] Launching FastAPI Backend on http://127.0.0.1:8000 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; `$env:PYTHONPATH = 'src'; python -m uvicorn sneakytos.api:app --host 127.0.0.1 --port 8000 --reload"

# 2. Start Vite React Frontend in a separate window
Write-Host "[2/2] Launching Vite Frontend on http://localhost:5173 ..." -ForegroundColor Green
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot\web'; npm run dev"

Write-Host "`nBoth services are starting!" -ForegroundColor Yellow
Write-Host "👉 Open your browser at: http://localhost:5173" -ForegroundColor Cyan
Write-Host "👉 Backend Swagger docs at: http://127.0.0.1:8000/docs" -ForegroundColor Cyan

