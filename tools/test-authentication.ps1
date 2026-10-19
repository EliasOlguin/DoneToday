param([string]$ApiUrl = 'https://localhost:7155', [switch]$FunctionsOnly)
$ErrorActionPreference = 'Stop'
$testPassword = 'ExampleStrong!123'

function Request([string]$path, [int]$expected, $session, [string]$method = 'GET', $body = $null, [bool]$csrf = $true) {
    # PowerShell persists supplied headers in WebSession; remove the previous CSRF header.
    $session.Headers.Remove('X-CSRF-TOKEN')
    $headers = @{}
    if ($method -ne 'GET' -and $csrf) {
        $token = Invoke-RestMethod "$ApiUrl/api/auth/csrf" -WebSession $session -SkipCertificateCheck
        $headers['X-CSRF-TOKEN'] = $token.token
    }
    $arguments = @{Uri="$ApiUrl$path";Method=$method;WebSession=$session;Headers=$headers;SkipCertificateCheck=$true;SkipHttpErrorCheck=$true}
    if ($null -ne $body) { $arguments.ContentType='application/json'; $arguments.Body=($body | ConvertTo-Json -Depth 5) }
    $response = Invoke-WebRequest @arguments
    if ($response.StatusCode -ne $expected) { throw "$method $path expected $expected, received $($response.StatusCode)" }
    return $response
}

function New-TestUser {
    $email = 'session-' + [Guid]::NewGuid().ToString('N') + '@example.test'
    $session = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
    $credentials = @{email=$email;password=$testPassword}
    $null = Request '/api/auth/register' 200 $session 'POST' $credentials
    $null = Request '/api/auth/login' 401 $session 'POST' $credentials
    $message = $null
    for ($attempt=0; $attempt -lt 20 -and !$message; $attempt++) {
        $inbox = Invoke-RestMethod 'http://127.0.0.1:8025/api/v1/messages'
        $message = $inbox.messages | Where-Object { @($_.To | ForEach-Object {$_.Address}) -contains $email } | Select-Object -First 1
        if (!$message) { Start-Sleep -Milliseconds 100 }
    }
    if (!$message) { throw 'Confirmation email missing' }
    $mail = Invoke-RestMethod ('http://127.0.0.1:8025/api/v1/message/' + $message.ID)
    $link = [regex]::Match($mail.Text, 'https?://localhost:5173/confirm-email\?[^\s]+').Value
    $values = @{}
    foreach ($part in ([uri]$link).Query.TrimStart('?').Split('&')) {
        $pair=$part.Split('=',2); $values[$pair[0]]=[uri]::UnescapeDataString($pair[1])
    }
    $values.password = $testPassword
    $null = Request '/api/auth/confirm-email' 200 $session 'POST' $values
    $login = Request '/api/auth/login' 200 $session 'POST' $credentials
    $cookie = $login.Headers['Set-Cookie'] -join ';'
    if ($cookie -notmatch 'httponly' -or $cookie -notmatch 'secure' -or $cookie -notmatch 'samesite=lax') { throw 'Unsafe authentication cookie' }
    if ($cookie -notmatch 'expires=|max-age=') { throw 'Login did not create a persistent cookie' }
    $me = (Request '/api/auth/me' 200 $session).Content | ConvertFrom-Json
    return @{Session=$session;Credentials=$credentials;Id=$me.id}
}

# This test creates two disposable accounts and one habit in the development database.
if ($FunctionsOnly) { return }
$anonymous = [Microsoft.PowerShell.Commands.WebRequestSession]::new()
$null = Request '/api/Habits' 401 $anonymous
$first = New-TestUser
$second = New-TestUser
if ($first.Id -eq $second.Id) { throw 'Accounts share an ID' }
$habitBody = @{name='Authentication isolation test';description='Fictitious test habit';color='#b7a5ff';daysOfWeek=@(0,1,2,3,4,5,6)}
$created = (Request '/api/Habits' 201 $first.Session 'POST' $habitBody).Content | ConvertFrom-Json
$id=$created.id
foreach ($path in @("/api/Habits/$id", "/api/Habits/$id/detail")) { $null = Request $path 404 $second.Session }
$null = Request "/api/Habits/$id" 404 $second.Session 'PUT' $habitBody
foreach ($action in @('archive','restore')) { $null = Request "/api/Habits/$id/$action" 404 $second.Session 'PATCH' }
$null = Request "/api/Habits/$id/complete" 404 $second.Session 'POST'
$null = Request "/api/Habits/$id/complete" 404 $second.Session 'DELETE'
foreach ($path in @('/api/Habits','/api/Habits/archived','/api/Today')) {
    $items = (Request $path 200 $second.Session).Content | ConvertFrom-Json
    if (@($items | Where-Object {$_.id -eq $id}).Count -gt 0) { throw 'Foreign habit leaked' }
}
$progress = (Request '/api/Progress/week' 200 $second.Session).Content | ConvertFrom-Json
if (@($progress.habits | Where-Object {$_.id -eq $id}).Count -gt 0) { throw 'Foreign progress leaked' }
$null = Request "/api/Habits/$id/complete" 400 $first.Session 'POST' $null $false
$null = Request "/api/Habits/$id/complete" 204 $first.Session 'POST'
$null = Request "/api/Habits/$id/complete" 204 $first.Session 'DELETE'
$null = Request '/api/auth/logout' 400 $first.Session 'POST' @{} $false
$null = Request '/api/auth/logout' 204 $first.Session 'POST' @{}
$null = Request '/api/auth/me' 401 $first.Session
$null = Request '/api/Habits' 401 $first.Session
$null = Request '/api/auth/logout' 204 $second.Session 'POST' @{}
for ($attempt=0; $attempt -lt 5; $attempt++) {
    $null = Request '/api/auth/login' 401 $second.Session 'POST' @{email=$second.Credentials.email;password='WrongPassword!123'}
}
$null = Request '/api/auth/login' 401 $second.Session 'POST' $second.Credentials
Write-Output 'PASS: confirmed-email login, secure cookie, two-user isolation, CSRF, logout and temporary lockout.'
