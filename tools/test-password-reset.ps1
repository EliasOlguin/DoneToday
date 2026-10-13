param([string]$ApiUrl = 'https://localhost:7155')
$ErrorActionPreference = 'Stop'
. "$PSScriptRoot/test-authentication.ps1" -ApiUrl $ApiUrl -FunctionsOnly
# Creates one fictitious confirmed user; never changes a real user's credentials.
$account = New-TestUser
$anonymous = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$null = Request '/api/auth/forgot-password' 200 $anonymous 'POST' @{email='unknown-reset@example.test'}
$null = Request '/api/auth/forgot-password' 400 $anonymous 'POST' @{email=$account.Credentials.email} $false
$null = Request '/api/auth/forgot-password' 200 $anonymous 'POST' @{email=$account.Credentials.email}
$message = $null
for ($attempt=0; $attempt -lt 20 -and !$message; $attempt++) {
    $inbox = Invoke-RestMethod 'http://127.0.0.1:8025/api/v1/messages'
    $message = $inbox.messages | Where-Object {
        $_.Subject -eq 'Reset your DoneToday password' -and @($_.To | ForEach-Object {$_.Address}) -contains $account.Credentials.email
    } | Select-Object -First 1
    if (!$message) { Start-Sleep -Milliseconds 100 }
}
if (!$message) { throw 'Password reset email missing' }
$mail = Invoke-RestMethod ('http://127.0.0.1:8025/api/v1/message/' + $message.ID)
$link = [regex]::Match($mail.Text, 'https://localhost:5173/reset-password\?[^\s]+').Value
if (!$link) { throw 'Password reset link missing' }
$values = @{}
foreach ($part in ([uri]$link).Query.TrimStart('?').Split('&')) {
    $pair=$part.Split('=',2); $values[$pair[0]]=[uri]::UnescapeDataString($pair[1])
}
$null = Request '/api/auth/reset-password' 400 $anonymous 'POST' @{userId=$values.userId;code='invalid';password='NewStrongPassword!456'}
$values.password='onlylowercaseletters'
$null = Request '/api/auth/reset-password' 400 $anonymous 'POST' $values
$values.password='NewStrongPassword!456'
$null = Request '/api/auth/reset-password' 200 $anonymous 'POST' $values
$null = Request '/api/auth/me' 401 $account.Session
$null = Request '/api/auth/reset-password' 400 $anonymous 'POST' $values
$null = Request '/api/auth/login' 401 $anonymous 'POST' $account.Credentials
$null = Request '/api/auth/login' 200 $anonymous 'POST' @{email=$account.Credentials.email;password=$values.password}
Write-Output 'PASS: reset email, generic unknown-account response, CSRF, invalid token, password policy, single use, session invalidation and new-password login.'
