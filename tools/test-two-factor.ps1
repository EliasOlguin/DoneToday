param([string]$ApiUrl = 'https://localhost:7155')
. "$PSScriptRoot/test-authentication.ps1" -ApiUrl $ApiUrl -FunctionsOnly

function Get-TestTotp([string]$key) {
    $alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'; $buffer=0; $bits=0
    $bytes=[System.Collections.Generic.List[byte]]::new()
    foreach ($character in $key.ToUpperInvariant().ToCharArray()) {
        $buffer=($buffer -shl 5) -bor $alphabet.IndexOf($character); $bits+=5
        if ($bits -ge 8) { $bits-=8; $bytes.Add([byte](($buffer -shr $bits) -band 255)); $buffer=$buffer -band ((1 -shl $bits)-1) }
    }
    $counter=[BitConverter]::GetBytes([long][Math]::Floor([DateTimeOffset]::UtcNow.ToUnixTimeSeconds()/30))
    if ([BitConverter]::IsLittleEndian) { [Array]::Reverse($counter) }
    $hmac=[System.Security.Cryptography.HMACSHA1]::new($bytes.ToArray())
    try { $hash=$hmac.ComputeHash($counter) } finally { $hmac.Dispose() }
    $offset=$hash[19] -band 15
    $value=(([long]($hash[$offset] -band 127) -shl 24) -bor ([long]$hash[$offset+1] -shl 16) -bor ([long]$hash[$offset+2] -shl 8) -bor $hash[$offset+3]) % 1000000
    return $value.ToString('D6')
}

# Only generates codes for the fictitious account created by this test.
$account=New-TestUser
$session=$account.Session
$password=$account.Credentials.password
$setup=(Request '/api/auth/two-factor/setup' 200 $session 'POST' @{password=$password}).Content | ConvertFrom-Json
$null=Request '/api/auth/two-factor/enable' 400 $session 'POST' @{password=$password;code='invalid'}
$enabled=(Request '/api/auth/two-factor/enable' 200 $session 'POST' @{password=$password;code=(Get-TestTotp $setup.sharedKey)}).Content | ConvertFrom-Json
if ($enabled.recoveryCodes.Count -ne 10) { throw 'Recovery codes missing' }
$null=Request '/api/auth/logout' 204 $session 'POST' @{}
$challenge=(Request '/api/auth/login' 200 $session 'POST' $account.Credentials).Content | ConvertFrom-Json
if (!$challenge.requiresTwoFactor) { throw '2FA login challenge missing' }
$null=Request '/api/auth/me' 401 $session
$null=Request '/api/auth/two-factor/login' 401 $session 'POST' @{code='invalid'}
$null=Request '/api/auth/two-factor/login' 200 $session 'POST' @{code=(Get-TestTotp $setup.sharedKey)}
$null=Request '/api/auth/me' 200 $session
$null=Request '/api/auth/logout' 204 $session 'POST' @{}
$null=Request '/api/auth/login' 200 $session 'POST' $account.Credentials
$null=Request '/api/auth/two-factor/login' 200 $session 'POST' @{code=$enabled.recoveryCodes[0];recoveryCode=$true}
$null=Request '/api/auth/logout' 204 $session 'POST' @{}
$null=Request '/api/auth/login' 200 $session 'POST' $account.Credentials
$null=Request '/api/auth/two-factor/login' 401 $session 'POST' @{code=$enabled.recoveryCodes[0];recoveryCode=$true}
$null=Request '/api/auth/two-factor/login' 200 $session 'POST' @{code=(Get-TestTotp $setup.sharedKey)}
$newCodes=(Request '/api/auth/two-factor/recovery-codes' 200 $session 'POST' @{password=$password;code=(Get-TestTotp $setup.sharedKey)}).Content | ConvertFrom-Json
if ($newCodes.recoveryCodes.Count -ne 10) { throw 'Regeneration failed' }
$null=Request '/api/auth/two-factor/disable' 204 $session 'POST' @{password=$password;code=$newCodes.recoveryCodes[0];recoveryCode=$true}
$null=Request '/api/auth/logout' 204 $session 'POST' @{}
$null=Request '/api/auth/login' 200 $session 'POST' $account.Credentials
$null=Request '/api/auth/me' 200 $session
Write-Output 'PASS: TOTP activation, password-only rejection, authenticator login, single-use recovery, regeneration and disable.'
