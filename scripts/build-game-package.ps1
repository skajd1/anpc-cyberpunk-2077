#requires -Version 7.0
param(
  [Parameter(Mandatory)][string]$NativeDll,
  [Parameter(Mandatory)][string]$OutputZip,
  [ValidateSet('development','public')][string]$Channel = 'development'
)

chcp 65001 > $null
$ErrorActionPreference = 'Stop'
$anpcRepo = Split-Path -Parent $PSScriptRoot
$anpcProfile = Get-Content (Join-Path $anpcRepo 'game/package-profile.json') -Raw -Encoding UTF8 | ConvertFrom-Json
$anpcContent = Get-Content (Join-Path $anpcRepo 'content/cyberpunk2077/manifest.json') -Raw -Encoding UTF8 | ConvertFrom-Json
# DIST-06: 현재 개발판을 명령 옵션만으로 공개판으로 만들지 못한다.
if ($Channel -eq 'public') {
  if (!$anpcProfile.public_release_ready -or @($anpcProfile.release_blockers).Count -gt 0) { throw '공개 배포 수용 미완료: 개발·검증 계획의 출시 전 결함을 먼저 해결하세요.' }
  if (!$anpcContent.runtime_enabled -or !(Test-Path (Join-Path $anpcRepo 'LICENSE'))) { throw '콘텐츠 활성/프로젝트 라이선스가 미완료입니다.' }
  if ((Get-Content (Join-Path $anpcRepo 'game/cet/anpc/config.lua') -Raw -Encoding UTF8) -match 'allow_draft_content\s*=\s*true') { throw '초안 허용 설정은 공개 패키지에 포함할 수 없습니다.' }
}
$anpcBinary = (Resolve-Path -LiteralPath $NativeDll).Path
$anpcBinaryBytes = [IO.File]::ReadAllBytes($anpcBinary)
if ([IO.Path]::GetExtension($anpcBinary) -ne '.dll' -or $anpcBinaryBytes.Length -lt 2 -or $anpcBinaryBytes[0] -ne 77 -or $anpcBinaryBytes[1] -ne 90) { throw 'NativeDll은 빌드한 Windows DLL이어야 합니다.' }

# DIST-05: 생성 파일과 소스 콘텐츠의 불일치를 패키지에 숨기지 않는다.
$anpcGenerated = (& node (Join-Path $anpcRepo 'scripts/build-cet-prompts.mjs')) -join "`n"
if ($LASTEXITCODE -ne 0) { throw '프롬프트 생성 검사 실패' }
$anpcTracked = Get-Content (Join-Path $anpcRepo 'game/cet/anpc/prompts.lua') -Raw -Encoding UTF8
if ($anpcGenerated.Replace("`r`n","`n").TrimEnd() -cne $anpcTracked.Replace("`r`n","`n").TrimEnd()) { throw '먼저 npm run build:cet-prompts로 생성 파일을 갱신하세요.' }

$anpcInputs = @()
foreach ($anpcMapping in @(
  @('game/cet/anpc','bin/x64/plugins/cyber_engine_tweaks/mods/anpc','*.lua'),
  @('game/redscript/ANPC','r6/scripts/ANPC','*.reds')
)) {
  foreach ($anpcFile in Get-ChildItem -LiteralPath (Join-Path $anpcRepo $anpcMapping[0]) -File -Filter $anpcMapping[2]) {
    $anpcInputs += [pscustomobject]@{ source=$anpcFile.FullName; path=($anpcMapping[1]+'/'+$anpcFile.Name); install=$true }
  }
}
$anpcInputs += [pscustomobject]@{ source=$anpcBinary; path='red4ext/plugins/ANPC/ANPC.Native.dll'; install=$true }
foreach ($anpcLicense in @(
  @('game/native/deps/RED4ext.SDK/LICENSE.md','RED4ext.SDK.txt'),
  @('game/native/deps/RED4ext.SDK/THIRD_PARTY_LICENSES.md','RED4ext.SDK-third-party.txt'),
  @('game/native/deps/RedLib/LICENSE','RedLib.txt'),
  @('game/native/deps/RedLib/vendor/nameof/LICENSE','nameof.txt'),
  @('game/native/deps/json/LICENSE.MIT','nlohmann-json.txt')
)) {
  $anpcInputs += [pscustomobject]@{ source=(Join-Path $anpcRepo $anpcLicense[0]); path=('ANPC-DOCUMENTATION/licenses/'+$anpcLicense[1]); install=$false }
}
$anpcEntries = @()
foreach ($anpcInput in $anpcInputs) {
  $anpcBytes = [IO.File]::ReadAllBytes($anpcInput.source)
  $anpcEntries += [pscustomobject]@{path=$anpcInput.path; bytes=$anpcBytes; install=$anpcInput.install}
}
$anpcUtf8 = [Text.UTF8Encoding]::new($false)
$anpcReadme = @"
# ANPC $($anpcProfile.version)

이 ZIP은 개발 시험용이며 공개 출시 승인이 아닙니다. 실제 게임 지원 검사는 미완료입니다.
게임 후보: $($anpcProfile.candidate_game_version). 필수 도구: $($anpcProfile.required_dependencies -join ', '). 코어 도구는 포함하지 않습니다.
Node.js/개발 서버 없이 ANPC.Native를 사용하는 구성입니다. 플레이어가 개인 API 키를 모드 창에서 등록합니다. 키는 이 ZIP에 없습니다.
ANPC-PACKAGE.json의 install=true 파일만 게임 루트 상대 경로에 대응합니다. 설치 전에 게임을 종료하고 기존 파일을 영구 백업하세요.
현재 제품 설치/업데이트/자동 복원/제거 도구는 미완료입니다. ZIP 압축 해제를 검증된 설치/복원 절차로 표시하지 않습니다.
다른 모드·원본·세이브·코어 도구를 덮어쓰거나 폴더 전체를 삭제하지 마세요. 파일 목록/해시와 변경 전 백업을 보존하세요.
프로젝트 배포 라이선스 선택과 콘텐츠 검수는 미완료입니다. 동봉 라이브러리의 고지는 licenses 아래에 있습니다.
출시 차단: $($anpcProfile.release_blockers -join ', '). 기능 기준과 리뷰는 저장소 docs의 명세를 참조하세요.
"@
$anpcEntries += [pscustomobject]@{path='ANPC-DOCUMENTATION/README.md'; bytes=$anpcUtf8.GetBytes($anpcReadme.Replace("`r`n","`n")); install=$false}
$anpcEntries = @($anpcEntries | Sort-Object path)
$anpcFiles = @($anpcEntries | ForEach-Object { [ordered]@{path=$_.path;sha256=[Convert]::ToHexString([Security.Cryptography.SHA256]::HashData($_.bytes));bytes=$_.bytes.Length;install=$_.install} })
$anpcManifest = [ordered]@{package_id=$anpcProfile.package_id;version=$anpcProfile.version;channel=$Channel;platform=$anpcProfile.platform;candidate_game_version=$anpcProfile.candidate_game_version;required_dependencies=$anpcProfile.required_dependencies;public_release_ready=$anpcProfile.public_release_ready;release_blockers=$anpcProfile.release_blockers;spec_refs=$anpcProfile.spec_refs;files=$anpcFiles}
$anpcEntries += [pscustomobject]@{path='ANPC-PACKAGE.json';bytes=$anpcUtf8.GetBytes(($anpcManifest|ConvertTo-Json -Depth 6).Replace("`r`n","`n"));install=$false}

$anpcOutput = [IO.Path]::GetFullPath($OutputZip)
if (Test-Path -LiteralPath $anpcOutput) { throw '출력 ZIP이 이미 있습니다. 새 경로를 지정하세요.' }
New-Item -ItemType Directory -Path (Split-Path -Parent $anpcOutput) -Force | Out-Null
$anpcStream = [IO.File]::Open($anpcOutput,[IO.FileMode]::CreateNew)
$anpcArchive = [IO.Compression.ZipArchive]::new($anpcStream,[IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($anpcEntry in $anpcEntries | Sort-Object path) {
    $anpcZipEntry = $anpcArchive.CreateEntry($anpcEntry.path,[IO.Compression.CompressionLevel]::Optimal)
    $anpcZipEntry.LastWriteTime = [DateTimeOffset]::new(2000,1,1,0,0,0,[TimeSpan]::Zero)
    $anpcEntryStream = $anpcZipEntry.Open()
    try { $anpcEntryStream.Write($anpcEntry.bytes,0,$anpcEntry.bytes.Length) } finally { $anpcEntryStream.Dispose() }
  }
} finally { $anpcArchive.Dispose(); $anpcStream.Dispose() }
$anpcPackageHash = (Get-FileHash -LiteralPath $anpcOutput -Algorithm SHA256).Hash
[IO.File]::WriteAllText($anpcOutput+'.sha256',$anpcPackageHash+'  '+[IO.Path]::GetFileName($anpcOutput)+"`n",$anpcUtf8)
[pscustomobject]@{path=$anpcOutput;sha256=$anpcPackageHash;channel=$Channel;install_files=@($anpcFiles|Where-Object install).Count;package_entries=$anpcEntries.Count;public_release_ready=$anpcProfile.public_release_ready}|ConvertTo-Json
