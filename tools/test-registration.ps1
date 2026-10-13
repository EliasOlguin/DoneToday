param([string]$ApiUrl = 'https://localhost:7155')
$ErrorActionPreference = 'Stop'
# Creates one fictitious user in the development authentication database.
$testEmail = 'registration-' + [Guid]::NewGuid().ToString('N') + '@example.test'
$csrf = Invoke-RestMethod "$ApiUrl/api/auth/csrf" -SkipCertificateCheck -SessionVariable authSession
$headers = @{ 'X-CSRF-TOKEN' = $csrf.token }
$body = @{email=$testEmail;password='ExampleStrong!123'} | ConvertTo-Json
$missingCsrf = Invoke-WebRequest "$ApiUrl/api/auth/register" -Method Post -ContentType 'application/json' -Body $body -SkipCertificateCheck -SkipHttpErrorCheck
$weakBody = @{email=$testEmail;password='abcdefghijklm'} | ConvertTo-Json
$weak = Invoke-WebRequest "$ApiUrl/api/auth/register" -Method Post -ContentType 'application/json' -Body $weakBody -WebSession $authSession -Headers $headers -SkipCertificateCheck -SkipHttpErrorCheck
$registered = Invoke-WebRequest "$ApiUrl/api/auth/register" -Method Post -ContentType 'application/json' -Body $body -WebSession $authSession -Headers $headers -SkipCertificateCheck -SkipHttpErrorCheck
if ($registered.StatusCode -ne 200) { throw "Registration returned $($registered.StatusCode)" }
$message = $null
for ($attempt = 0; $attempt -lt 10 -and !$message; $attempt++) {
    $inbox = Invoke-RestMethod 'http://127.0.0.1:8025/api/v1/messages'
    $message = $inbox.messages | Where-Object {
        @($_.To | ForEach-Object { $_.Address }) -contains $testEmail
    } | Select-Object -First 1
    if (!$message) { Start-Sleep -Milliseconds 200 }
}
if (!$message) { throw 'Confirmation email missing' }
$mail = Invoke-RestMethod ('http://127.0.0.1:8025/api/v1/message/' + $message.ID)
$link = [regex]::Match($mail.Text, 'https?://localhost:5173/confirm-email\?[^\s]+').Value
if (!$link) { throw 'Confirmation link missing' }
$queryValues = @{}
foreach ($part in ([uri]$link).Query.TrimStart('?').Split('&')) {
    $pair = $part.Split('=', 2)
    $queryValues[$pair[0]] = [uri]::UnescapeDataString($pair[1])
}
$invalidBody = @{userId=$queryValues.userId;code='invalid'} | ConvertTo-Json
$invalid = Invoke-WebRequest "$ApiUrl/api/auth/confirm-email" -Method Post -ContentType 'application/json' -Body $invalidBody -WebSession $authSession -Headers $headers -SkipCertificateCheck -SkipHttpErrorCheck
$confirmed = Invoke-WebRequest "$ApiUrl/api/auth/confirm-email" -Method Post -ContentType 'application/json' -Body ($queryValues | ConvertTo-Json) -WebSession $authSession -Headers $headers -SkipCertificateCheck -SkipHttpErrorCheck
if ($registered.StatusCode -ne 200 -or $confirmed.StatusCode -ne 200 -or $invalid.StatusCode -ne 400 -or $missingCsrf.StatusCode -ne 400 -or $weak.StatusCode -ne 400) { throw 'Registration smoke test failed' }
Write-Output 'PASS: registration, Mailpit delivery, confirmation, invalid token rejection, password policy and CSRF rejection.'
