#requires -Version 7.0
[CmdletBinding(SupportsShouldProcess)]
param(
  [Parameter(Mandatory)][string]$GameRoot,
  [Parameter(Mandatory)][string]$ReleaseDirectory
)

chcp 65001 > $null
$ErrorActionPreference = 'Stop'
$anpcRoot = (Resolve-Path -LiteralPath $GameRoot).Path
$anpcRepo = Split-Path -Parent $PSScriptRoot
if (!(Test-Path -LiteralPath (Join-Path $anpcRoot 'bin\x64\Cyberpunk2077.exe'))) {
  throw 'Cyberpunk 2077 게임 루트가 아닙니다.'
}
if ((Get-Item -LiteralPath (Join-Path $anpcRoot 'bin\x64\Cyberpunk2077.exe')).VersionInfo.ProductVersion -ne '2.31') {
  throw '현재 개발 검사 대상은 2.31입니다. 다른 패치는 별도 확인해야 합니다.'
}
if (Get-Process -Name Cyberpunk2077 -ErrorAction SilentlyContinue) { throw '게임을 종료한 뒤 설치하세요.' }

# 제작자 ZIP을 임시 폴더에 풀어 둔 자료만 사용한다. 의존성을 재배포하지 않는다.
$anpcReleases = @(
  @('red4ext', '3A72225C9D2C46C99F4A4159D952B9D24366357C2423EB7EA255C84E9E11C0B0'),
  @('redscript', '799BBD88863F6728616F8D723C941EA15DFF71ED5BBFD50C525F0D39EA0BF46B'),
  @('cet', '1855017796A27F518199F5B7D7210EF1DB7A5C5F0AF468C68E04E6E666AD248C'),
  @('codeware', '102989E199BAD650FE6E53395C22BAC53FDD7ABECC6EEEC3B0046886631591F0')
)
$anpcFiles = @()
foreach ($anpcRelease in $anpcReleases) {
  $anpcArchive = Join-Path $ReleaseDirectory ($anpcRelease[0] + '.zip')
  if ((Get-FileHash -LiteralPath $anpcArchive -Algorithm SHA256).Hash -ne $anpcRelease[1]) {
    throw ('배포 ZIP 해시 불일치: ' + $anpcRelease[0])
  }
  $anpcSourceRoot = (Resolve-Path -LiteralPath (Join-Path $ReleaseDirectory $anpcRelease[0])).Path
  $anpcArchiveFiles = @(Get-ChildItem -LiteralPath $anpcSourceRoot -File -Recurse)
  if (!$anpcArchiveFiles.Count) { throw '압축을 해제한 제작자 파일이 없습니다.' }
  $anpcZip = [IO.Compression.ZipFile]::OpenRead($anpcArchive)
  try {
    $anpcEntries = @($anpcZip.Entries | Where-Object { $_.Name })
    if ($anpcEntries.Count -ne $anpcArchiveFiles.Count) { throw '압축 해제 파일 수 불일치' }
    foreach ($anpcEntry in $anpcEntries) {
      $anpcEntryPath = [IO.Path]::GetFullPath((Join-Path $anpcSourceRoot $anpcEntry.FullName))
      if (!$anpcEntryPath.StartsWith($anpcSourceRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
        throw '배포 ZIP의 경로가 압축 해제 폴더를 벗어납니다.'
      }
      $anpcStream = $anpcEntry.Open()
      $anpcHasher = [Security.Cryptography.SHA256]::Create()
      try { $anpcHash = [Convert]::ToHexString($anpcHasher.ComputeHash($anpcStream)) }
      finally { $anpcStream.Dispose(); $anpcHasher.Dispose() }
      if ((Get-FileHash -LiteralPath $anpcEntryPath -Algorithm SHA256).Hash -ne $anpcHash) {
        throw ('압축 해제 파일 해시 불일치: ' + $anpcEntry.FullName)
      }
    }
  } finally { $anpcZip.Dispose() }
  foreach ($anpcFile in $anpcArchiveFiles) {
    $anpcRelative = [IO.Path]::GetRelativePath($anpcSourceRoot, $anpcFile.FullName)
    $anpcFiles += [pscustomobject]@{ source = $anpcFile.FullName; relative = $anpcRelative }
  }
}
foreach ($anpcMapping in @(
  @('game\cet\anpc', 'bin\x64\plugins\cyber_engine_tweaks\mods\anpc'),
  @('game\redscript\ANPC', 'r6\scripts\ANPC')
)) {
  $anpcSourceRoot = Join-Path $anpcRepo $anpcMapping[0]
  foreach ($anpcFile in Get-ChildItem -LiteralPath $anpcSourceRoot -File -Recurse) {
    $anpcFiles += [pscustomobject]@{
      source = $anpcFile.FullName
      relative = Join-Path $anpcMapping[1] ([IO.Path]::GetRelativePath($anpcSourceRoot, $anpcFile.FullName))
    }
  }
}

# 변경 전에 전체 대상·충돌을 검사한다. 기존 모드/원본 파일은 덮어쓰지 않는다.
foreach ($anpcFile in $anpcFiles) {
  $anpcDestination = [IO.Path]::GetFullPath((Join-Path $anpcRoot $anpcFile.relative))
  if (!$anpcDestination.StartsWith($anpcRoot + '\', [StringComparison]::OrdinalIgnoreCase)) {
    throw '게임 루트 밖의 설치 대상입니다.'
  }
  if (Test-Path -LiteralPath $anpcDestination) { throw ('기존 파일 충돌: ' + $anpcFile.relative) }
}
if ($PSCmdlet.ShouldProcess($anpcRoot, ('코어 런타임 4종과 ANPC 개발 파일 {0}개 새로 설치' -f $anpcFiles.Count))) {
  $anpcFiles | ConvertTo-Json -Depth 3 | Set-Content -LiteralPath (Join-Path $anpcRepo 'config.local.game-install.json') -Encoding UTF8
  foreach ($anpcFile in $anpcFiles) {
    $anpcDestination = Join-Path $anpcRoot $anpcFile.relative
    New-Item -ItemType Directory -Path ([IO.Path]::GetDirectoryName($anpcDestination)) -Force | Out-Null
    Copy-Item -LiteralPath $anpcFile.source -Destination $anpcDestination
  }
  Write-Output '설치 완료. 게임 실행·컴파일 로그·기존 저장은 별도 검증하세요.'
}
