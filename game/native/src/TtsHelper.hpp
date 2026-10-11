#pragma once

#include <string>

// 음성 출력 규격 6절: TTS 런타임은 게임 밖 로컬 보조 프로세스이며 ANPC.Native가 시작·종료·상태 감시를 맡는다.
// 플러그인 폴더의 tts-helper.local.json(개인 경로를 담는 로컬 설정, 배포물 제외)에 적힌 명령을 게임 시작 때 실행한다.
// 보조 프로세스는 Job Object에 묶어 게임이 종료되거나 비정상 종료돼도 함께 끝난다.
namespace anpc
{
class TtsHelper
{
public:
    // 설정이 없으면 not_configured. 이미 다른 보조 프로세스가 살아 있으면(alive.txt 3초 이내 갱신) 띄우지 않고 external.
    static std::string Start();
    static void Stop();
    static std::string Restart();
    // not_configured | external | running | exited:<코드> | failed:<사유>
    static std::string Status();
};
} // namespace anpc
