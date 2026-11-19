# scripts/setup_upload_keystore.ps1
# Secure release keystore generator for Decidix Google Play Store upload.
# This script prompts for passwords locally without printing or logging them.

param(
    [Parameter(Mandatory = $false)]
    [System.Security.SecureString]$SecurePassword
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path "$PSScriptRoot\.."
$KeystorePath = Join-Path $ProjectRoot "android\decidix-release.jks"
$KeyPropsPath = Join-Path $ProjectRoot "android\key.properties"
$BackupDir = Join-Path $env:USERPROFILE ".decidix_keys_backup"

$KeytoolExe = "C:\Program Files\Java\jdk-24\bin\keytool.exe"
if (!(Test-Path $KeytoolExe)) {
    $found = Get-Command keytool -ErrorAction SilentlyContinue
    if ($found) { $KeytoolExe = $found.Source }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host " DECIDIX — Secure Android Release Keystore Generator" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan

if (Test-Path $KeystorePath) {
    Write-Host "[!] Keystore already exists at: $KeystorePath" -ForegroundColor Yellow
    Write-Host "Per policy, an existing keystore is NEVER overwritten." -ForegroundColor Yellow
    exit 0
}

# Resolve passwords securely
if ($null -ne $SecurePassword) {
    $secPass1 = $SecurePassword
    $secPass2 = $SecurePassword
} elseif ($env:DECIDIX_KEYSTORE_PASSWORD) {
    $secPass1 = ConvertTo-SecureString $env:DECIDIX_KEYSTORE_PASSWORD -AsPlainText -Force
    $secPass2 = $secPass1
} else {
    # Prompt user for secure password interactively
    $secPass1 = Read-Host -Prompt "Enter secure keystore password" -AsSecureString
    $secPass2 = Read-Host -Prompt "Confirm keystore password" -AsSecureString
}

$bstr1 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass1)
$bstr2 = [System.Runtime.InteropServices.Marshal]::SecureStringToBSTR($secPass2)
$pass1 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr1)
$pass2 = [System.Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr2)

if ($pass1 -ne $pass2) {
    Write-Host "[ERROR] Passwords do not match. Aborting." -ForegroundColor Red
    exit 1
}

if ($pass1.Length -lt 8) {
    Write-Host "[ERROR] Password must be at least 8 characters. Aborting." -ForegroundColor Red
    exit 1
}

Write-Host "`n[*] Generating 2048-bit RSA upload keystore..." -ForegroundColor Green
$dname = "CN=Decidix Mobile Team, OU=Engineering, O=Decidix, C=EG"

$genArgs = @(
    "-genkeypair",
    "-v",
    "-keystore", $KeystorePath,
    "-alias", "decidix",
    "-keyalg", "RSA",
    "-keysize", "2048",
    "-validity", "10000",
    "-storepass", $pass1,
    "-keypass", $pass1,
    "-dname", $dname
)

& $KeytoolExe $genArgs | Out-Null

if (!(Test-Path $KeystorePath)) {
    Write-Host "[ERROR] Keystore generation failed." -ForegroundColor Red
    exit 1
}

Write-Host "[+] Keystore successfully generated at: $KeystorePath" -ForegroundColor Green

# Create local android/key.properties
$keyPropsLines = @(
    "storePassword=$pass1",
    "keyPassword=$pass1",
    "keyAlias=decidix",
    "storeFile=../decidix-release.jks"
)
$keyPropsContent = $keyPropsLines -join "`r`n"

$utf8NoBom = New-Object System.Text.UTF8Encoding($false)
[System.IO.File]::WriteAllLines($KeyPropsPath, $keyPropsLines, $utf8NoBom)
Write-Host ('[+] Signing configuration saved to: {0}' -f $KeyPropsPath) -ForegroundColor Green

# Create secure backup directory outside the repository
if (!(Test-Path $BackupDir)) {
    New-Item -ItemType Directory -Path $BackupDir -Force | Out-Null
}
Copy-Item -Path $KeystorePath -Destination (Join-Path $BackupDir "decidix-release.jks") -Force
Copy-Item -Path $KeyPropsPath -Destination (Join-Path $BackupDir "key.properties") -Force
Write-Host "[+] Backup copy secured at: $BackupDir" -ForegroundColor Green

# Extract certificate fingerprints
Write-Host "`n[*] Extracting SHA-1 and SHA-256 certificate fingerprints..." -ForegroundColor Cyan
$certInfo = & $KeytoolExe -list -v -keystore $KeystorePath -alias decidix -storepass $pass1 | Out-String

$sha1Match = [regex]::Match($certInfo, 'SHA1:\s*([A-Fa-f0-9:]+)')
$sha256Match = [regex]::Match($certInfo, 'SHA256:\s*([A-Fa-f0-9:]+)')

if (-not $sha1Match.Success -or -not $sha256Match.Success) {
    throw "Failed to extract SHA-1/SHA-256 fingerprints from keytool output."
}

$sha1 = $sha1Match.Groups[1].Value
$sha256 = $sha256Match.Groups[1].Value

Write-Host "`n============================================================" -ForegroundColor Yellow
Write-Host " CRITICAL FINGERPRINTS FOR GOOGLE CLOUD AND FIREBASE" -ForegroundColor Yellow
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "SHA-1:   $sha1" -ForegroundColor White
Write-Host "SHA-256: $sha256" -ForegroundColor White
Write-Host "============================================================" -ForegroundColor Yellow
Write-Host "`nNext Step: Add the SHA-1 and SHA-256 fingerprints to Firebase Console under"
Write-Host "Project Settings -> General -> Your apps -> com.decidixteam.app"
Write-Host "Then rebuild the release AAB with: flutter build appbundle --release --dart-define-from-file=env/staging.json"
