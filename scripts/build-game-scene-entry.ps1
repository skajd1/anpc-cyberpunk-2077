param(
  [Parameter(Mandatory = $true)][string]$DotnetExe,
  [Parameter(Mandatory = $true)][string]$WolvenKitCli,
  [string]$BuildDirectory = (Join-Path $PSScriptRoot '../game/build/scene-entry')
)

chcp 65001 > $null
$ErrorActionPreference = 'Stop'
$buildRoot = [IO.Path]::GetFullPath($BuildDirectory)
$resourceRoot = Join-Path $buildRoot 'resources'
$packageRoot = Join-Path $buildRoot 'package'
$resourcePath = Join-Path $resourceRoot 'anpc/entry_scene.interaction'
$archivePath = Join-Path $packageRoot 'resources.archive'
if (Test-Path -LiteralPath $resourceRoot) {
  throw '출력 폴더가 이미 있습니다. 새 BuildDirectory를 지정하세요.'
}
New-Item -ItemType Directory -Path (Join-Path $resourceRoot 'anpc'),$packageRoot | Out-Null
$source = Join-Path $PSScriptRoot '../game/resources/anpc/entry_scene.interaction.json'
& $DotnetExe $WolvenKitCli convert deserialize $source --outpath (Join-Path $resourceRoot 'anpc') --verbosity Minimal
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $resourcePath)) { throw 'interaction 변환 실패' }
& $DotnetExe $WolvenKitCli pack $resourceRoot --outpath $packageRoot
if ($LASTEXITCODE -ne 0 -or !(Test-Path -LiteralPath $archivePath)) { throw 'archive 빌드 실패' }
Get-Item -LiteralPath $archivePath | Select-Object FullName,Length
Get-FileHash -LiteralPath $archivePath -Algorithm SHA256
