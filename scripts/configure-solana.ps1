param([string]$Merchant,[string]$Mint)
$ErrorActionPreference = 'Stop'
$taskHttpsProxy = $env:HTTPS_PROXY
$taskNodeProxy = $env:NODE_USE_ENV_PROXY
try {
 if ([string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) {
  $taskUri = [Uri]'https://api.devnet.solana.com'
  $taskProxy = [System.Net.WebRequest]::DefaultWebProxy.GetProxy($taskUri)
  if ($taskProxy.AbsoluteUri -ne $taskUri.AbsoluteUri) { $env:HTTPS_PROXY = $taskProxy.AbsoluteUri }
 }
 if (-not [string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) { $env:NODE_USE_ENV_PROXY = '1' }
 & node scripts/configure-solana.mjs $Merchant $Mint
 $taskExit = $LASTEXITCODE
} finally {
 if ($null -eq $taskHttpsProxy) { Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue } else { $env:HTTPS_PROXY = $taskHttpsProxy }
 if ($null -eq $taskNodeProxy) { Remove-Item Env:NODE_USE_ENV_PROXY -ErrorAction SilentlyContinue } else { $env:NODE_USE_ENV_PROXY = $taskNodeProxy }
}
exit $taskExit
