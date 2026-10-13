param(
    [string]$InstallDirectory = (Join-Path $PSScriptRoot '../.local/mailpit'),
    [switch]$DownloadOnly,
    [switch]$Background
)

$ErrorActionPreference = 'Stop'
$version = 'v1.31.5'
$architecture = [System.Runtime.InteropServices.RuntimeInformation]::OSArchitecture.ToString().ToLowerInvariant()
$assetArchitecture = switch ($architecture) {
    'x64' { 'amd64' }
    'arm64' { 'arm64' }
    default { throw "Unsupported Windows architecture: $architecture" }
}
$installRoot = [System.IO.Path]::GetFullPath($InstallDirectory)
$versionRoot = Join-Path $installRoot $version
$executable = Join-Path $versionRoot 'mailpit.exe'
New-Item -ItemType Directory -Force -Path $versionRoot | Out-Null

if (-not (Test-Path -LiteralPath $executable)) {
    $assetName = "mailpit-windows-$assetArchitecture.zip"
    $release = Invoke-RestMethod -Uri "https://api.github.com/repos/axllent/mailpit/releases/tags/$version"
    $asset = $release.assets | Where-Object { $_.name -eq $assetName }
    if (-not $asset -or -not $asset.digest.StartsWith('sha256:')) {
        throw 'Official release asset or SHA-256 digest is unavailable.'
    }
    $archive = Join-Path $versionRoot $assetName
    Invoke-WebRequest -Uri $asset.browser_download_url -OutFile $archive
    $actualDigest = (Get-FileHash -LiteralPath $archive -Algorithm SHA256).Hash.ToLowerInvariant()
    if ($actualDigest -ne $asset.digest.Substring(7)) { throw 'Mailpit checksum does not match the official release.' }
    Expand-Archive -LiteralPath $archive -DestinationPath $versionRoot -Force
}

if ($DownloadOnly) { Write-Output "Mailpit ready: $executable"; return }
$arguments = @('--listen', '127.0.0.1:8025', '--smtp', '127.0.0.1:1025', '--database', (Join-Path $versionRoot 'mailpit.db'))
if ($Background) {
    $process = Start-Process -FilePath $executable -ArgumentList $arguments -WindowStyle Hidden -PassThru
    Write-Output "Mailpit started (PID $($process.Id)). Inbox: http://127.0.0.1:8025"
} else {
    Write-Output 'Inbox: http://127.0.0.1:8025. Press Ctrl+C to stop.'
    & $executable @arguments
}
