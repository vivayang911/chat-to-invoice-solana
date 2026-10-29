$ErrorActionPreference = 'Stop'
$previousHttpsProxy = $env:HTTPS_PROXY
$previousNodeProxy = $env:NODE_USE_ENV_PROXY
$previousProvider = $env:MODEL_PROVIDER
try {
    if ([string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) {
        $targetUri = [Uri]'https://api.groq.com/openai/v1/chat/completions'
        $systemProxy = [System.Net.WebRequest]::DefaultWebProxy.GetProxy($targetUri)
        if ($systemProxy.AbsoluteUri -ne $targetUri.AbsoluteUri) { $env:HTTPS_PROXY = $systemProxy.AbsoluteUri }
    }
    if (-not [string]::IsNullOrWhiteSpace($env:HTTPS_PROXY)) { $env:NODE_USE_ENV_PROXY = '1' }
    $env:MODEL_PROVIDER = 'groq'
    & node --env-file-if-exists=work/groq-model.env --env-file-if-exists=work/solana.env scripts/start-solana.mjs
    $taskExit = $LASTEXITCODE
} finally {
    if ($null -eq $previousHttpsProxy) { Remove-Item Env:HTTPS_PROXY -ErrorAction SilentlyContinue } else { $env:HTTPS_PROXY = $previousHttpsProxy }
    if ($null -eq $previousNodeProxy) { Remove-Item Env:NODE_USE_ENV_PROXY -ErrorAction SilentlyContinue } else { $env:NODE_USE_ENV_PROXY = $previousNodeProxy }
    if ($null -eq $previousProvider) { Remove-Item Env:MODEL_PROVIDER -ErrorAction SilentlyContinue } else { $env:MODEL_PROVIDER = $previousProvider }
}
if ($taskExit -ne 0) { throw 'Application startup failed. Check local configuration.' }
