# 게임 배포 전 redscript 시험 컴파일(DIST-25). 게임 폴더·캐시는 읽기만 하고 임시 폴더에서 컴파일한다.
# 사용: powershell -ExecutionPolicy Bypass -File scripts/check-redscript.ps1 [-GameRoot <게임 루트>] [-Without Audioware]
# -Without: 해당 선택 의존성이 없는 설치도 함께 검사한다(@if(ModuleExists(...)) 분기 확인).
param(
  [string]$GameRoot = 'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077',
  [string[]]$Without = @('Audioware')
)
$ErrorActionPreference = 'Stop'
$repo = Split-Path $PSScriptRoot -Parent
$scc = Join-Path $GameRoot 'engine\tools\scc.exe'
$base = Join-Path $GameRoot 'r6\cache\final.redscripts'
if (!(Test-Path -LiteralPath $scc) -or !(Test-Path -LiteralPath $base)) { throw "scc.exe 또는 final.redscripts 없음: $GameRoot" }

function Invoke-Check([string]$label, [string[]]$exclude) {
  $tmp = Join-Path $env:TEMP ('anpc-scc-' + [guid]::NewGuid().ToString('N').Substring(0, 8))
  $scripts = Join-Path $tmp 'r6\scripts'; $cache = Join-Path $tmp 'r6\cache'
  New-Item -ItemType Directory -Path $scripts, $cache -Force | Out-Null
  try {
    # 게임에 설치된 다른 모드 스크립트(ANPC 제외) + 저장소의 ANPC 스크립트 + RED4ext 플러그인 스크립트
    Get-ChildItem -LiteralPath (Join-Path $GameRoot 'r6\scripts') -Force | Where-Object { $_.Name -ne 'ANPC' -and $exclude -notcontains $_.Name } |
      ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $scripts -Recurse }
    Copy-Item -LiteralPath (Join-Path $repo 'game\redscript\ANPC') -Destination $scripts -Recurse
    Get-ChildItem -LiteralPath (Join-Path $GameRoot 'red4ext\plugins') -Directory | Where-Object { $exclude -notcontains $_.Name } | ForEach-Object {
      $s = Join-Path $_.FullName 'Scripts'
      if (Test-Path -LiteralPath $s) { Copy-Item -LiteralPath $s -Destination (Join-Path $scripts ('_plugin_' + $_.Name)) -Recurse }
    }
    Copy-Item -LiteralPath $base -Destination $cache
    & $scc -compile $scripts -customCacheDir $cache *> $null
    $code = $LASTEXITCODE
    $log = Join-Path $tmp 'r6\logs\redscript_rCURRENT.log'
    $errors = if (Test-Path -LiteralPath $log) { @(Select-String -LiteralPath $log -Pattern '^\[ERROR' -Context 0, 3 | ForEach-Object { $_.Line; $_.Context.PostContext }) } else { @('로그 없음') }
    [pscustomobject]@{ case = $label; exit = $code; ok = ($code -eq 0 -and !($errors | Where-Object { $_ -match '^\[ERROR' })); errors = $errors }
  } finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }
}

$results = @(Invoke-Check '현재 설치' @())
foreach ($w in $Without) {
  if (Test-Path -LiteralPath (Join-Path $GameRoot "r6\scripts\$w")) { $results += Invoke-Check ($w + ' 없음') @($w) }
}
foreach ($r in $results) {
  Write-Output ('{0}: {1} (exit {2})' -f $r.case, ($(if ($r.ok) { '통과' } else { '실패' })), $r.exit)
  if (!$r.ok) { $r.errors | ForEach-Object { Write-Output ('  ' + $_) } }
}
if ($results | Where-Object { !$_.ok }) { exit 1 }
