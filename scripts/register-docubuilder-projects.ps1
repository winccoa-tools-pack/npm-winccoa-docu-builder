<#
.SYNOPSIS
  Register DocuBuilder (non-runnable) and a worker project (runnable) with DocuBuilder as sub-project.

.DESCRIPTION
  Uses @winccoa-tools-pack/npm-winccoa-register-project locally or in CI.
  Prefer this on Windows; the .sh script is for Git Bash / Linux / CI containers.

.EXAMPLE
  ./scripts/register-docubuilder-projects.ps1 -ProjectPath ./src/Squirt -Version 3.21
#>
[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string] $ProjectPath,

    [Parameter(Mandatory = $true)]
    [Alias('v')]
    [string] $Version,

    [string] $Langs = 'en_US.utf8',

    [string] $DocuBuilderPath = '',

    [string] $RegisterCli = '',

    [switch] $DryRun
)

$ErrorActionPreference = 'Stop'
$PkgRoot = Split-Path -Parent $PSScriptRoot
if (-not $DocuBuilderPath) {
    $DocuBuilderPath = Join-Path $PkgRoot 'winccoa\DocuBuilder'
}

$ProjectPath = (Resolve-Path -LiteralPath $ProjectPath).Path
$DocuBuilderPath = (Resolve-Path -LiteralPath $DocuBuilderPath).Path

function Find-RegisterCli {
    if ($RegisterCli -and (Test-Path -LiteralPath $RegisterCli)) {
        return (Resolve-Path -LiteralPath $RegisterCli).Path
    }
    $candidates = @(
        (Join-Path $PkgRoot 'node_modules\@winccoa-tools-pack\npm-winccoa-register-project\dist\cjs\cli.js'),
        (Join-Path $PkgRoot '..\npm-winccoa-register-project\dist\cjs\cli.js'),
        (Join-Path $PkgRoot '..\npm-winccoa-register-project\dist\src\cli.js')
    )
    foreach ($c in $candidates) {
        if (Test-Path -LiteralPath $c) { return (Resolve-Path -LiteralPath $c).Path }
    }
    $cmd = Get-Command npm-winccoa-register -ErrorAction SilentlyContinue
    if ($cmd) { return $cmd.Source }
    throw 'Could not find npm-winccoa-register-project CLI. Install the package or pass -RegisterCli.'
}

function Invoke-Register {
    param([string[]] $Args)
    $cli = Find-RegisterCli
    Write-Host "register: $cli $($Args -join ' ')"
    if ($DryRun) { return }
    if ($cli -like '*.js') {
        & node $cli @Args
    } else {
        & $cli @Args
    }
    if ($LASTEXITCODE -ne 0) {
        throw "Registration failed with exit code $LASTEXITCODE"
    }
}

Write-Host "DocuBuilder (non-runnable): $DocuBuilderPath"
Write-Host "Worker project (runnable): $ProjectPath"
Write-Host "WinCC OA version: $Version"
Write-Host "Langs: $Langs"

Invoke-Register -Args @(
    '--project-path', $DocuBuilderPath,
    '--runnable', 'false',
    '--wincc-oa-version', $Version
)

Invoke-Register -Args @(
    '--project-path', $ProjectPath,
    '--runnable', 'true',
    '--wincc-oa-version', $Version,
    '--langs', $Langs,
    '--sub-project', $DocuBuilderPath
)

Write-Host 'Registration complete.'
