$ErrorActionPreference = 'Stop'
$root = 'c:\Users\manis\OneDrive\Dokumen\GitHub\hackday'
$backendDir = Join-Path $root 'resqnet\backend'
$frontendDir = Join-Path $root 'resqnet\frontend'
$venvPython = Join-Path $root '.venv\Scripts\python.exe'
$npmCmd = Join-Path $env:ProgramFiles 'nodejs\npm.cmd'

if (-not (Test-Path $venvPython)) {
    throw "Python venv not found at $venvPython"
}
if (-not (Test-Path $npmCmd)) {
    throw "npm not found at $npmCmd"
}

Write-Host 'Installing backend dependencies...'
Set-Location $backendDir
& $venvPython -m pip install -r requirements.txt

Write-Host 'Installing frontend dependencies...'
Set-Location $frontendDir
& $npmCmd install

$backendDb = Join-Path $backendDir 'resqnet.db'
foreach ($file in @('resqnet.db', 'resqnet.db-shm', 'resqnet.db-wal')) {
    $path = Join-Path $backendDir $file
    if (Test-Path $path) { Remove-Item $path -Force }
}

Write-Host 'Starting backend...'
$backendArgs = @('-m', 'uvicorn', 'app.main:app', '--host', '0.0.0.0', '--port', '8000')
$backendProcess = Start-Process -FilePath $venvPython -ArgumentList $backendArgs -WorkingDirectory $backendDir -PassThru -WindowStyle Hidden

Write-Host 'Starting frontend...'
$frontendArgs = @('run', 'dev', '--', '--host', '0.0.0.0', '--port', '5173')
$frontendProcess = Start-Process -FilePath $npmCmd -ArgumentList $frontendArgs -WorkingDirectory $frontendDir -PassThru -WindowStyle Hidden

Start-Sleep -Seconds 12
Write-Host "Backend PID: $($backendProcess.Id)"
Write-Host "Frontend PID: $($frontendProcess.Id)"
Write-Host 'AegisFlow started on http://localhost:5173'
Write-Host 'Backend health endpoint: http://localhost:8000/api/health'
