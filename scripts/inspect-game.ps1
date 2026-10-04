#requires -Version 7.0
param(
  [string]$GameRoot,
  [string]$OutputPath
)

chcp 65001 > $null
$ErrorActionPreference = 'Stop'
if (!$GameRoot) {
  $anpcInstall = Get-ItemProperty 'HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\Steam App 1091500' -ErrorAction SilentlyContinue
  $GameRoot = $anpcInstall.InstallLocation
}
if (!$GameRoot) { throw '게임 루트를 -GameRoot로 지정하세요.' }
$anpcRoot = (Resolve-Path -LiteralPath $GameRoot).Path
$anpcExe = Get-Item -LiteralPath (Join-Path $anpcRoot 'bin\x64\Cyberpunk2077.exe')
$anpcTools = @(
  @('RED4ext', 'red4ext\RED4ext.dll'),
  @('redscript', 'engine\tools\scc.exe'),
  @('redscript library', 'engine\tools\scc_lib.dll'),
  @('CET', 'bin\x64\plugins\cyber_engine_tweaks.asi'),
  @('Codeware', 'red4ext\plugins\Codeware\Codeware.dll'),
  @('Red Hot Tools', 'red4ext\plugins\RedHotTools\RedHotTools.dll'),
  @('REDmod', 'tools\redmod\bin\redMod.exe')
)
$anpcInventory = foreach ($anpcTool in $anpcTools) {
  $anpcPath = Join-Path $anpcRoot $anpcTool[1]
  $anpcExists = Test-Path -LiteralPath $anpcPath -PathType Leaf
  $anpcInfo = if ($anpcExists) { (Get-Item -LiteralPath $anpcPath).VersionInfo }
  [pscustomobject]@{
    tool = $anpcTool[0]; file = $anpcTool[1]; installed_file = $anpcExists
    file_version = $(if ($anpcInfo) { $anpcInfo.FileVersion } else { $null })
    runtime_verified = $false
  }
}
$anpcReport = [pscustomobject]@{
  checked_at = [DateTimeOffset]::Now.ToString('o')
  game_root = $anpcRoot
  product_version = $anpcExe.VersionInfo.ProductVersion
  file_version = $anpcExe.VersionInfo.FileVersion
  phantom_liberty_files = Test-Path -LiteralPath (Join-Path $anpcRoot 'archive\pc\ep1\ep1_2_gamedata.archive')
  running = [bool](Get-Process -Name Cyberpunk2077 -ErrorAction SilentlyContinue)
  tools = @($anpcInventory)
  game_test_status = 'not_run'
}
$anpcJson = $anpcReport | ConvertTo-Json -Depth 5
if ($OutputPath) { $anpcJson | Set-Content -LiteralPath $OutputPath -Encoding UTF8 }
$anpcJson
