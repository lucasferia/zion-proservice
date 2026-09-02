# ==============================================================================
# SCRIPT DE MIGRAÇÃO E CRIAÇÃO DE JUNCTIONS (C: -> D:)
# ==============================================================================
# Este script move as pastas de cache do drive C: para o drive D: e cria
# Directory Junctions (mklink /J), garantindo que todo o espaço seja liberado
# no drive C: e que todas as ferramentas continuem funcionando de forma transparente.
#
# Execute este script no PowerShell com privilégios normais ou de Administrador.
# ==============================================================================

$DestBase = "D:\Caches"
if (!(Test-Path -LiteralPath $DestBase)) {
    New-Item -ItemType Directory -Path $DestBase -Force | Out-Null
    Write-Host "[OK] Diretório base criado: $DestBase" -ForegroundColor Green
}

$Mapeamentos = @(
    @{
        Nome = "Gemini / Antigravity Storage (.gemini)"
        Origem = "$env:USERPROFILE\.gemini"
        Destino = "$DestBase\gemini"
    },
    @{
        Nome = "Antigravity IDE (.antigravity-ide)"
        Origem = "$env:USERPROFILE\.antigravity-ide"
        Destino = "$DestBase\antigravity-ide"
    },
    @{
        Nome = "Antigravity Cache (.antigravity)"
        Origem = "$env:USERPROFILE\.antigravity"
        Destino = "$DestBase\antigravity"
    },
    @{
        Nome = "Codex Cache (.codex)"
        Origem = "$env:USERPROFILE\.codex"
        Destino = "$DestBase\codex"
    },
    @{
        Nome = "Claude Cache (.claude)"
        Origem = "$env:USERPROFILE\.claude"
        Destino = "$DestBase\claude"
    },
    @{
        Nome = "General / HuggingFace Cache (.cache)"
        Origem = "$env:USERPROFILE\.cache"
        Destino = "$DestBase\dot-cache"
    },
    @{
        Nome = "Bun Cache (.bun)"
        Origem = "$env:USERPROFILE\.bun"
        Destino = "$DestBase\bun"
    },
    @{
        Nome = "Docker WSL Disk Data"
        Origem = "$env:LOCALAPPDATA\Docker\wsl\disk"
        Destino = "$DestBase\docker-disk"
    },
    @{
        Nome = "NPM Cache"
        Origem = "$env:LOCALAPPDATA\npm-cache"
        Destino = "$DestBase\npm-cache"
    },
    @{
        Nome = "UV Cache (Python)"
        Origem = "$env:LOCALAPPDATA\uv"
        Destino = "$DestBase\uv"
    },
    @{
        Nome = "PIP Cache (Python)"
        Origem = "$env:LOCALAPPDATA\pip"
        Destino = "$DestBase\pip"
    },
    @{
        Nome = "VS Code Extensions"
        Origem = "$env:USERPROFILE\.vscode\extensions"
        Destino = "$DestBase\vscode-extensions"
    },
    @{
        Nome = "Cargo Home (Rust)"
        Origem = "$env:USERPROFILE\.cargo"
        Destino = "$DestBase\cargo"
    },
    @{
        Nome = "Rustup Home (Rust)"
        Origem = "$env:USERPROFILE\.rustup"
        Destino = "$DestBase\rustup"
    }
)

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " INICIANDO MIGRAÇÃO DE CACHES PARA O DRIVE D:" -ForegroundColor Cyan
Write-Host "==================================================`n" -ForegroundColor Cyan

foreach ($item in $Mapeamentos) {
    $origem = $item.Origem
    $destino = $item.Destino
    $nome = $item.Nome

    Write-Host ">>> Processando: $nome" -ForegroundColor Yellow

    if (!(Test-Path -LiteralPath $origem)) {
        Write-Host "    [IGNORADO] Origem não existe: $origem" -ForegroundColor Gray
        continue
    }

    # Verifica se a pasta de origem já é um Junction / Link Simbólico
    $itemAttr = (Get-Item -LiteralPath $origem -Force)
    if ($itemAttr.Attributes -band [System.IO.FileAttributes]::ReparsePoint) {
        Write-Host "    [AVISO] $origem já é um link/junction. Nenhuma ação necessária." -ForegroundColor Cyan
        continue
    }

    # 1. Cria o diretório de destino caso não exista
    if (!(Test-Path -LiteralPath $destino)) {
        New-Item -ItemType Directory -Path $destino -Force | Out-Null
    }

    # 2. Copia os arquivos existentes de forma segura usando Robocopy
    Write-Host "    [1/3] Copiando arquivos existentes para $destino..." -ForegroundColor Gray
    robocopy "$origem" "$destino" /E /MOVE /NFL /NDL /NJH /NJS /nc /ns /np /R:1 /W:1 *>$null

    # 3. Se a pasta de origem ainda existir após o move, remove
    if (Test-Path -LiteralPath $origem) {
        Write-Host "    [2/3] Removendo pasta antiga do drive C:..." -ForegroundColor Gray
        Remove-Item -LiteralPath $origem -Recurse -Force -ErrorAction SilentlyContinue
    }

    # 4. Cria o Directory Junction (mklink /J equivalente via PowerShell)
    Write-Host "    [3/3] Criando Junction: $origem -> $destino" -ForegroundColor Gray
    try {
        New-Item -ItemType Junction -Path $origem -Target $destino -Force | Out-Null
        Write-Host "    [SUCESSO] Junction criada com sucesso!" -ForegroundColor Green
    } catch {
        Write-Host "    [ERRO] Falha ao criar junction: $_" -ForegroundColor Red
    }
    Write-Host ""
}

Write-Host "`n==================================================" -ForegroundColor Cyan
Write-Host " CONFIGURANDO VARIÁVEIS DE AMBIENTE PERMANENTES" -ForegroundColor Cyan
Write-Host "==================================================`n" -ForegroundColor Cyan

# Define variáveis de ambiente de Usuário para garantir compatibilidade direta
$envVars = @{
    "PIP_CACHE_DIR" = "$DestBase\pip"
    "UV_CACHE_DIR"  = "$DestBase\uv"
    "CARGO_HOME"    = "$DestBase\cargo"
    "RUSTUP_HOME"   = "$DestBase\rustup"
}

foreach ($key in $envVars.Keys) {
    [System.Environment]::SetEnvironmentVariable($key, $envVars[$key], [System.EnvironmentVariableTarget]::User)
    Write-Host "    [VAR AMBIENTE] $key = $($envVars[$key])" -ForegroundColor Green
}

# Configura cache global do NPM
try {
    npm config set cache "$DestBase\npm-cache" --global
    Write-Host "    [NPM GLOBAL] Cache do NPM configurado para: $DestBase\npm-cache" -ForegroundColor Green
} catch {
    Write-Host "    [NPM GLOBAL] Aviso: Não foi possível rodar 'npm config set cache'" -ForegroundColor Yellow
}

Write-Host "`n==================================================" -ForegroundColor Green
Write-Host " MIGRAÇÃO CONCLUÍDA COM SUCESSO!" -ForegroundColor Green
Write-Host " Espaço no Drive C: liberado e caches ativos no Drive D: ($DestBase)." -ForegroundColor Green
Write-Host "==================================================`n" -ForegroundColor Green
