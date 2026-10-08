# 개발 게임 배포(DIST-26): 저장소 소스를 게임 폴더의 ANPC 소유 경로에 동기화한다. 게임 폴더 파일을 직접 고치지 않는다.
# 계획만 보기: powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Plan
# 배포:       powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Name '<배포 이름>' [-NativeDll <빌드한 DLL>]
# 되돌리기:   powershell -ExecutionPolicy Bypass -File scripts/deploy-game-dev.ps1 -Restore <배포 ID>
# 기록: config.local.backups/<배포 ID>/ 아래 manifest.json(파일·해시·백업), files/(바뀌기 전 파일), history.md(배포 이력 초안)
[CmdletBinding(DefaultParameterSetName = 'Deploy')]
param(
  [Parameter(ParameterSetName = 'Deploy')][string]$Name,
  [Parameter(ParameterSetName = 'Deploy')][string]$NativeDll,
  [Parameter(ParameterSetName = 'Deploy')][Parameter(ParameterSetName = 'Restore')][switch]$Plan,
  [Parameter(ParameterSetName = 'Restore', Mandatory)][string]$Restore,
  [string]$GameRoot,
  [switch]$Force
)
chcp 65001 > $null
$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [Text.Encoding]::UTF8 } catch {}  # node 출력의 한글을 UTF-8로 읽는다
$repo =(Resolve-Path -LiteralPath (Split-Path $PSScriptRoot -Parent)).Path
$utf8 = New-Object System.Text.UTF8Encoding $false
$statePath = Join-Path $repo 'config.local.game-deploy-state.json'
$backupRoot = Join-Path $repo 'config.local.backups'
# 소스 폴더 → 게임 루트 상대 경로. 이 경로 아래에서 소스에 없는 파일(로그·DB·tts 교환 파일)은 관리하지 않는다
$mappings = @(
  @('game/cet/anpc', 'bin/x64/plugins/cyber_engine_tweaks/mods/anpc'),
  @('game/redscript/ANPC', 'r6/scripts/ANPC'),
  @('game/audioware/ANPC', 'r6/audioware/ANPC'),
  # 로컬 빌드 자원(Git 제외 *.local.archive). 예: UF-75 말하기 입모양 ANPC_talk.local.archive
  @('game/archive', 'archive/pc/mod')
)
$nativePath = 'red4ext/plugins/ANPC/ANPC.Native.dll'
# 없을 때만 설치하는 경로: Audioware 슬롯 wav는 TTS 보조 프로세스가 실행 중에 덮어쓴다
$seedOnly = @('r6/audioware/ANPC/slots/')
function Test-SeedOnly($rel) { [bool]($seedOnly | Where-Object { $rel.StartsWith($_) }) }

if (!$GameRoot) {
  $envFile = Join-Path $repo 'config.local.game-environment.json'
  $GameRoot = if (Test-Path -LiteralPath $envFile) { (Get-Content -LiteralPath $envFile -Raw -Encoding UTF8 | ConvertFrom-Json).game_root } else { 'C:\Program Files (x86)\Steam\steamapps\common\Cyberpunk 2077' }
}
$GameRoot = (Resolve-Path -LiteralPath $GameRoot).Path.TrimEnd('\')
if (!(Test-Path -LiteralPath (Join-Path $GameRoot 'bin\x64\Cyberpunk2077.exe'))) { throw "게임 루트가 아닙니다: $GameRoot" }

function Get-Sha($path) { if (Test-Path -LiteralPath $path -PathType Leaf) { (Get-FileHash -LiteralPath $path -Algorithm SHA256).Hash } else { $null } }
function Get-GamePath($rel) { Join-Path $GameRoot ($rel -replace '/', '\') }
function Get-RepoRel($full) { $full.Substring($repo.Length + 1) -replace '\\', '/' }
function Write-Json($path, $obj) { New-Item -ItemType Directory -Path (Split-Path $path) -Force | Out-Null; [IO.File]::WriteAllText($path, ($obj | ConvertTo-Json -Depth 8), $utf8) }
function Assert-GameStopped { if (Get-Process -Name Cyberpunk2077 -ErrorAction SilentlyContinue) { throw '게임 실행 중: 게임을 종료한 뒤 다시 실행하세요.' } }
function Format-Kst($iso) {
  $t = [DateTimeOffset]::Parse($iso)
  $o = $t.Offset
  $zone = if ($o.TotalHours -eq 9) { 'KST (UTC+09:00)' } else { 'UTC{0}{1:hh\:mm}' -f ($(if ($o -lt [TimeSpan]::Zero) { '-' } else { '+' })), $o }
  '{0} {1}' -f $t.ToString('yyyy-MM-dd HH:mm:ss'), $zone
}

# 소유 목록: 이 스크립트가 마지막으로 게임에 쓴 파일과 해시. 게임 쪽이 그 뒤 바뀌었으면 충돌로 본다(DIST-14)
$owned = [ordered]@{}
if (Test-Path -LiteralPath $statePath) {
  $state = Get-Content -LiteralPath $statePath -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($state.game_root -ne $GameRoot) { throw "소유 목록의 게임 루트가 다릅니다: $($state.game_root)" }
  foreach ($p in $state.files.PSObject.Properties) { $owned[$p.Name] = $p.Value }
}

$git = [ordered]@{ commit = $null; branch = $null; dirty = @() }
try {
  $git.commit = (& git -C $repo rev-parse --short HEAD 2>$null)
  $git.branch = (& git -C $repo rev-parse --abbrev-ref HEAD 2>$null)
  $git.dirty = @(& git -C $repo status --porcelain -- game 2>$null | ForEach-Object { $_.Substring(3) })
} catch {}

$items = @()
$same = 0
if ($PSCmdlet.ParameterSetName -eq 'Deploy') {
  $desired = [ordered]@{}
  foreach ($m in $mappings) {
    # Git에 없는 로컬 빌드 폴더(game/archive)는 없을 수 있다.
    if (!(Test-Path -LiteralPath (Join-Path $repo $m[0]))) { continue }
    $src = (Resolve-Path -LiteralPath (Join-Path $repo $m[0])).Path
    foreach ($f in Get-ChildItem -LiteralPath $src -File -Recurse) {
      $desired[$m[1] + '/' + ($f.FullName.Substring($src.Length + 1) -replace '\\', '/')] = $f.FullName
    }
  }
  if ($NativeDll) {
    $dll = (Resolve-Path -LiteralPath $NativeDll).Path
    $head = [IO.File]::ReadAllBytes($dll)[0..1]
    if ([IO.Path]::GetExtension($dll) -ne '.dll' -or $head[0] -ne 77 -or $head[1] -ne 90) { throw 'NativeDll은 빌드한 Windows DLL이어야 합니다.' }
    $desired[$nativePath] = $dll
  }
  foreach ($rel in $desired.Keys) {
    $new = Get-Sha $desired[$rel]; $cur = Get-Sha (Get-GamePath $rel)
    if ($cur -eq $new -or ($cur -and (Test-SeedOnly $rel))) { $same++; continue }
    $items += [pscustomobject]@{ path = $rel; change = $(if ($cur) { '수정' } else { '추가' }); from = $desired[$rel]
      source = $(if ($desired[$rel].StartsWith($repo + '\')) { Get-RepoRel $desired[$rel] } else { 'NativeDll' })
      old_sha256 = $cur; new_sha256 = $new; conflict = [bool]($cur -and $owned.Contains($rel) -and $cur -ne $owned[$rel]) }
  }
  # 소스에서 지운 파일: 소유 목록에 있고 매핑 경로 아래인 것만. Native DLL은 -NativeDll 없이 건드리지 않는다
  foreach ($rel in @($owned.Keys)) {
    if ($desired.Contains($rel) -or !($mappings | Where-Object { $rel.StartsWith($_[1] + '/') })) { continue }
    $cur = Get-Sha (Get-GamePath $rel)
    if (!$cur) { continue }
    $items += [pscustomobject]@{ path = $rel; change = '삭제'; from = $null; source = $null; old_sha256 = $cur; new_sha256 = $null; conflict = ($cur -ne $owned[$rel]) }
  }
  $unmanaged = @()
  foreach ($m in $mappings) {
    $dir = Get-GamePath $m[1]
    if (!(Test-Path -LiteralPath $dir)) { continue }
    foreach ($f in Get-ChildItem -LiteralPath $dir -File -Recurse) {
      $rel = $m[1] + '/' + ($f.FullName.Substring($dir.Length + 1) -replace '\\', '/')
      if (!$desired.Contains($rel) -and !$owned.Contains($rel)) { $unmanaged += $rel }
    }
  }
} else {
  # 되돌리기(DIST-13): 지정 배포 직후 해시와 지금이 같을 때만 그 배포 전 파일로 되돌린다. 결과는 새 배포 항목이다
  $srcDir = Join-Path $backupRoot $Restore
  $old = Get-Content -LiteralPath (Join-Path $srcDir 'manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
  if ($old.status -ne 'installed') { throw "적용 완료된 배포만 되돌릴 수 있습니다: $($old.status)" }
  foreach ($f in $old.files) {
    $cur = Get-Sha (Get-GamePath $f.path)
    $from = $null
    if ($f.old_sha256) {
      $from = Join-Path $srcDir ($f.backup -replace '/', '\')
      if ((Get-Sha $from) -ne $f.old_sha256) { throw "백업 해시 불일치로 복원 불가(DIST-17): $($f.path)" }
    }
    if ($cur -eq $f.old_sha256) { $same++; continue }
    $items += [pscustomobject]@{ path = $f.path; change = $(if (!$f.old_sha256) { '삭제' } elseif ($cur) { '수정' } else { '추가' }); from = $from
      source = $(if ($from) { "$Restore 백업" } else { $null }); old_sha256 = $cur; new_sha256 = $f.old_sha256; conflict = ($cur -ne $f.new_sha256) }
  }
  $Name = "$Restore 되돌리기"
  $unmanaged = @()
}

$conflicts = @($items | Where-Object { $_.conflict })
Write-Output "게임 루트: $GameRoot"
Write-Output ('기준 커밋: {0} ({1}){2}' -f $git.commit, $git.branch, $(if ($git.dirty.Count) { ' · 미커밋: ' + ($git.dirty -join ', ') } else { '' }))
if (!$owned.Count) { Write-Output '소유 목록 없음: 이번 배포로 기준을 만듭니다.' }
Write-Output ("변경 {0}개 (동일 {1}개 제외)" -f $items.Count, $same)
foreach ($i in $items) { Write-Output ('  {0}{1}  {2}' -f $i.change, $(if ($i.conflict) { '·충돌' } else { '' }), $i.path) }
if ($unmanaged.Count) { Write-Output ('관리 밖(건드리지 않음): ' + ($unmanaged -join ', ')) }
if ($conflicts.Count) { Write-Output '충돌: 마지막 배포 뒤 게임 쪽 파일이 바뀌었습니다. 확인 후 -Force로 진행하면 지금 파일을 백업하고 덮어씁니다.' }

# 배포 전 검사(DIST-05·DIST-25)
$checks = [ordered]@{}
if ($PSCmdlet.ParameterSetName -eq 'Deploy') {
  $gen = (& node (Join-Path $repo 'scripts/build-cet-prompts.mjs')) -join "`n"
  if ($LASTEXITCODE -ne 0) { throw '프롬프트 생성 검사 실패' }
  $tracked = [IO.File]::ReadAllText((Join-Path $repo 'game/cet/anpc/prompts.lua'), $utf8)
  if ($gen.Replace("`r`n", "`n").TrimEnd() -cne $tracked.Replace("`r`n", "`n").TrimEnd()) { throw '프롬프트 생성 파일이 최신이 아닙니다. npm run build:cet-prompts 후 다시 실행하세요.' }
  $checks.prompts = '최신'
}
if ($Plan) { return }
if (!$items.Count) {
  if ($PSCmdlet.ParameterSetName -eq 'Deploy') {
    foreach ($rel in $desired.Keys) { if (!(Test-SeedOnly $rel)) { $owned[$rel] = Get-Sha $desired[$rel] } }
    Write-Json $statePath ([ordered]@{ game_root = $GameRoot; updated_at = (Get-Date).ToString('o'); last_deploy = $null; files = $owned })
  }
  Write-Output '변경 없음: 배포하지 않았습니다.'
  return
}
if (!$Name) { throw '-Name으로 배포 이름을 지정하세요.' }
if ($conflicts.Count -and !$Force) { throw '충돌 파일이 있어 중단했습니다.' }
if ($PSCmdlet.ParameterSetName -eq 'Deploy' -and ($items | Where-Object { $_.path -like '*.reds' })) {
  & powershell -NoProfile -ExecutionPolicy Bypass -File (Join-Path $repo 'scripts\check-redscript.ps1') -GameRoot $GameRoot
  if ($LASTEXITCODE -ne 0) { throw 'redscript 시험 컴파일 실패: 배포하지 않았습니다.' }
  $checks.redscript = '시험 컴파일 통과'
}

Assert-GameStopped
do {
  $id = 'DEP-' + (Get-Date -Format 'yyyyMMddHHmmss')
  $dir = Join-Path $backupRoot $id
  if (Test-Path -LiteralPath $dir) { Start-Sleep -Milliseconds 300 }
} while (Test-Path -LiteralPath $dir)
$files = @()
foreach ($i in $items) {
  $rec = [ordered]@{ path = $i.path; change = $i.change; source = $i.source; old_sha256 = $i.old_sha256; new_sha256 = $i.new_sha256; backup = $null; conflict = $i.conflict }
  if ($i.old_sha256) {
    # 바뀌기 전 파일을 게임 밖 영구 백업에 복사하고 해시를 확인한다(DIST-10)
    $rec.backup = 'files/' + $i.path
    $b = Join-Path $dir ($rec.backup -replace '/', '\')
    New-Item -ItemType Directory -Path (Split-Path $b) -Force | Out-Null
    Copy-Item -LiteralPath (Get-GamePath $i.path) -Destination $b
    if ((Get-Sha $b) -ne $i.old_sha256) { throw "백업 검증 실패: $($i.path)" }
  }
  $files += $rec
}
$manifest = [ordered]@{ deploy_id = $id; kind = $(if ($Restore) { 'restore' } else { 'deploy' }); name = $Name; restores = $(if ($Restore) { $Restore } else { $null })
  game_root = $GameRoot; git = $git; checks = $checks; status = 'backed_up'; started_at = (Get-Date).ToString('o'); deployed_at = $null; game_verified = $false; files = $files }
$manifestPath = Join-Path $dir 'manifest.json'
Write-Json $manifestPath $manifest

Assert-GameStopped
$done = New-Object System.Collections.ArrayList
try {
  foreach ($i in $items) {
    [void]$done.Add($i)
    $target = Get-GamePath $i.path
    if ($i.change -eq '삭제') { Remove-Item -LiteralPath $target -Force; continue }
    New-Item -ItemType Directory -Path (Split-Path $target) -Force | Out-Null
    Copy-Item -LiteralPath $i.from -Destination $target -Force
    if ((Get-Sha $target) -ne $i.new_sha256) { throw "설치 검증 실패: $($i.path)" }
  }
} catch {
  # 실패하면 이번에 바꾼 파일을 백업으로 되돌린다(DIST-11)
  $err = $_.Exception.Message
  $left = @()
  $done.Reverse()
  foreach ($i in $done) {
    $target = Get-GamePath $i.path
    try {
      if ((Get-Sha $target) -eq $i.old_sha256) { continue }
      if ($i.old_sha256) { Copy-Item -LiteralPath (Join-Path $dir ('files/' + $i.path -replace '/', '\')) -Destination $target -Force; if ((Get-Sha $target) -ne $i.old_sha256) { throw 'hash' } }
      elseif (Test-Path -LiteralPath $target) { Remove-Item -LiteralPath $target -Force }
    } catch { $left += $i.path }
  }
  $manifest.status = $(if ($left.Count) { 'partial' } else { 'rolled_back' })
  $manifest.error = $err
  $manifest.unrestored = $left
  Write-Json $manifestPath $manifest
  throw "배포 실패로 되돌림($($manifest.status)): $err$(if ($left.Count) { ' / 미복구: ' + ($left -join ', ') })"
}

$manifest.status = 'installed'
$manifest.deployed_at = (Get-Date).ToString('o')
Write-Json $manifestPath $manifest
foreach ($i in $items) { if ($i.new_sha256 -and !(Test-SeedOnly $i.path)) { $owned[$i.path] = $i.new_sha256 } else { $owned.Remove($i.path) } }
if ($PSCmdlet.ParameterSetName -eq 'Deploy') { foreach ($rel in $desired.Keys) { if (!(Test-SeedOnly $rel)) { $owned[$rel] = Get-Sha $desired[$rel] } } }
Write-Json $statePath ([ordered]@{ game_root = $GameRoot; updated_at = $manifest.deployed_at; last_deploy = $id; files = $owned })

# 배포 이력 초안: 변경 내용·이유·영향은 사람이 채운 뒤 docs/game-mod-validation.md에 옮긴다
$verify = @()
if ($checks.redscript) { $verify += 'scripts/check-redscript.ps1 통과(Audioware 있음·없음)' }
$verify += '실게임 동작 미검증'
$lines = @("## $id — $Name", '', "- 일시: $(Format-Kst $manifest.deployed_at)", "- 대상/상태: 게임 / $(if ($Restore) { '되돌림' } else { '적용 완료' })", '',
  '| 변경 파일 | 구분 | 변경 내용 | 이유·영향 |', '| --- | --- | --- | --- |')
foreach ($i in $items) { $lines += "| $($i.path) | $($i.change) | (작성) | (작성) |" }
$lines += @('', "- 백업·복원·해시: config.local.backups/$id/manifest.json", "- 확인: $($verify -join '. ')")
[IO.File]::WriteAllText((Join-Path $dir 'history.md'), (($lines -join "`r`n") + "`r`n"), $utf8)
Write-Output ''
Write-Output "배포 완료: $id ($(Format-Kst $manifest.deployed_at)), 파일 $($items.Count)개"
Write-Output "이력 초안: config.local.backups/$id/history.md"
Write-Output '게임을 다시 시작해야 redscript·Audioware·Native 변경이 반영됩니다.'
