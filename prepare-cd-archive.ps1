# Готовит проект к записи на CD/DVD.
# Создаёт чистую копию в Desktop\SleepAI_For_CD, удаляет тяжёлые папки и секреты,
# архивирует в SleepAI_For_CD.zip рядом с папкой-копией.
#
# Запуск:  правый клик → Run with PowerShell
# (если PowerShell ругается на политику, открой PS as admin и:
#   Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force )

$Src  = "C:\Users\77077\Desktop\SleepAI_System"
$Dst  = "C:\Users\77077\Desktop\SleepAI_For_CD"
$Zip  = "C:\Users\77077\Desktop\SleepAI_For_CD.zip"

if (Test-Path $Dst) {
    Write-Host "Removing previous copy $Dst ..." -ForegroundColor Yellow
    Remove-Item $Dst -Recurse -Force
}
if (Test-Path $Zip) {
    Write-Host "Removing previous archive $Zip ..." -ForegroundColor Yellow
    Remove-Item $Zip -Force
}

Write-Host "Copying project ..." -ForegroundColor Cyan
# Robocopy is the fastest way to recursive-copy on Windows.
# /XD excludes directories, /XF excludes files. /NFL /NDL silences file lists.
robocopy $Src $Dst /E /XD `
    node_modules `
    .expo `
    .expo-shared `
    build `
    target `
    .gradle `
    __pycache__ `
    .pytest_cache `
    .mypy_cache `
    dist `
    out `
    uploads `
    logs `
    .next `
    .cache `
    .idea `
    /XF .env `
    /XF *.log `
    /XF *.apk `
    /XF *.aab `
    /XF *.keystore `
    /NFL /NDL /NJH /NJS /NC /NS | Out-Null

# Drop any leftover .env that robocopy missed (e.g., dotfiles in subfolders)
Get-ChildItem -Path $Dst -Filter ".env" -Recurse -Force -ErrorAction SilentlyContinue | Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Sanity check — looking for any leftover secrets ..." -ForegroundColor Cyan
$leftovers = Get-ChildItem -Path $Dst -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @(".env",".env.local",".env.production","application-secret.yml") }
if ($leftovers) {
    Write-Host "WARNING: secrets still present:" -ForegroundColor Red
    $leftovers | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Red }
} else {
    Write-Host "OK — no .env / secrets left." -ForegroundColor Green
}

$sizeMb = [math]::Round(((Get-ChildItem $Dst -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "Clean copy size: ${sizeMb} MB" -ForegroundColor Cyan

Write-Host "Creating ZIP ..." -ForegroundColor Cyan
Compress-Archive -Path "$Dst\*" -DestinationPath $Zip -CompressionLevel Optimal

$zipMb = [math]::Round((Get-Item $Zip).Length / 1MB, 1)
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DONE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Folder:  $Dst   (${sizeMb} MB)"
Write-Host "  Archive: $Zip   (${zipMb} MB)"
Write-Host ""
Write-Host "  CD-R fits  ~700 MB"
Write-Host "  DVD-R fits ~4700 MB"
Write-Host ""
Read-Host "Press Enter to close"
