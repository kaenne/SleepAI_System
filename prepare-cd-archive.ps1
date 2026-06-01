# Готовит проект к записи на CD/DVD.
# Создаёт чистую копию в Desktop\SleepAI_For_CD, удаляет тяжёлые папки и секреты,
# архивирует в SleepAI_For_CD.zip рядом с папкой-копией.
#
# Запуск:  правый клик -> Run with PowerShell

$Src = "C:\Users\77077\Desktop\SleepAI_System"
$Dst = "C:\Users\77077\Desktop\SleepAI_For_CD"
$Zip = "C:\Users\77077\Desktop\SleepAI_For_CD.zip"

if (Test-Path $Dst) {
    Write-Host "Removing previous copy $Dst ..." -ForegroundColor Yellow
    Remove-Item $Dst -Recurse -Force
}
if (Test-Path $Zip) {
    Write-Host "Removing previous archive $Zip ..." -ForegroundColor Yellow
    Remove-Item $Zip -Force
}

Write-Host "Copying project ..." -ForegroundColor Cyan

$excludeDirs = @(
    "node_modules",
    ".expo",
    ".expo-shared",
    "build",
    "target",
    ".gradle",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "dist",
    "out",
    "uploads",
    "logs",
    ".next",
    ".cache",
    ".idea"
)

$excludeFiles = @(
    ".env",
    "*.log",
    "*.apk",
    "*.aab",
    "*.keystore"
)

$args = @($Src, $Dst, "/E", "/XD") + $excludeDirs + @("/XF") + $excludeFiles + @("/NFL", "/NDL", "/NJH", "/NJS", "/NC", "/NS")
& robocopy @args | Out-Null

# robocopy returns >0 for "files copied", which is success — clear $LASTEXITCODE
if ($LASTEXITCODE -ge 8) {
    Write-Host "robocopy reported errors (exit $LASTEXITCODE)" -ForegroundColor Red
    Read-Host "Press Enter to close"
    exit 1
}

# Drop any leftover .env that robocopy might have missed.
Get-ChildItem -Path $Dst -Filter ".env" -Recurse -Force -ErrorAction SilentlyContinue |
    Remove-Item -Force -ErrorAction SilentlyContinue

Write-Host "Sanity check - looking for any leftover secrets ..." -ForegroundColor Cyan
$leftovers = Get-ChildItem -Path $Dst -Recurse -Force -ErrorAction SilentlyContinue |
    Where-Object { $_.Name -in @(".env", ".env.local", ".env.production", "application-secret.yml") }
if ($leftovers) {
    Write-Host "WARNING: secrets still present:" -ForegroundColor Red
    $leftovers | ForEach-Object { Write-Host "  $($_.FullName)" -ForegroundColor Red }
} else {
    Write-Host "OK - no .env / secrets left." -ForegroundColor Green
}

$sizeMb = [math]::Round(((Get-ChildItem $Dst -Recurse -ErrorAction SilentlyContinue | Measure-Object Length -Sum).Sum / 1MB), 1)
Write-Host "Clean copy size: $sizeMb MB" -ForegroundColor Cyan

Write-Host "Creating ZIP ..." -ForegroundColor Cyan
Compress-Archive -Path "$Dst\*" -DestinationPath $Zip -CompressionLevel Optimal -Force

$zipMb = [math]::Round((Get-Item $Zip).Length / 1MB, 1)
Write-Host ""
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  DONE" -ForegroundColor Green
Write-Host "============================================================" -ForegroundColor Green
Write-Host "  Folder:  $Dst   ($sizeMb MB)"
Write-Host "  Archive: $Zip   ($zipMb MB)"
Write-Host ""
Write-Host "  CD-R fits  ~700 MB"
Write-Host "  DVD-R fits ~4700 MB"
Write-Host ""
Read-Host "Press Enter to close"
