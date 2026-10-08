#include "TtsHelper.hpp"

#include <Windows.h>

#include <chrono>
#include <filesystem>
#include <fstream>
#include <mutex>
#include <vector>
#include <nlohmann/json.hpp>

namespace anpc
{
namespace
{
std::mutex gLock;
HANDLE gJob = nullptr;
HANDLE gProcess = nullptr;
std::string gStatus = "not_started";

std::wstring Widen(const std::string& aText)
{
    if (aText.empty())
        return {};
    const int size = MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), nullptr, 0);
    std::wstring result(static_cast<size_t>(size), L'\0');
    MultiByteToWideChar(CP_UTF8, 0, aText.data(), static_cast<int>(aText.size()), result.data(), size);
    return result;
}

std::filesystem::path PluginDirectory()
{
    HMODULE module = nullptr;
    GetModuleHandleExW(GET_MODULE_HANDLE_EX_FLAG_FROM_ADDRESS | GET_MODULE_HANDLE_EX_FLAG_UNCHANGED_REFCOUNT,
                       reinterpret_cast<LPCWSTR>(&PluginDirectory), &module);
    wchar_t path[MAX_PATH * 4]{};
    GetModuleFileNameW(module, path, static_cast<DWORD>(std::size(path)));
    return std::filesystem::path(path).parent_path();
}

// 게임 루트/red4ext/plugins/ANPC → 게임 루트. CET 모드가 보조 프로세스와 주고받는 tts 폴더의 생존 표시를 읽는다.
bool ExternalHelperAlive(const std::filesystem::path& aPluginDir)
{
    const auto alive = aPluginDir.parent_path().parent_path().parent_path() / L"bin" / L"x64" / L"plugins" /
                       L"cyber_engine_tweaks" / L"mods" / L"anpc" / L"tts" / L"alive.txt";
    std::ifstream file(alive);
    long long stamp = 0;
    if (!(file >> stamp))
        return false;
    const auto now = std::chrono::duration_cast<std::chrono::seconds>(
                         std::chrono::system_clock::now().time_since_epoch())
                         .count();
    return now - stamp <= 3 && stamp - now <= 3;
}

// Windows 명령줄 규칙에 맞춰 인수 하나를 감싼다.
std::wstring Quote(const std::wstring& aArg)
{
    if (!aArg.empty() && aArg.find_first_of(L" \t\"") == std::wstring::npos)
        return aArg;
    std::wstring out = L"\"";
    size_t slashes = 0;
    for (const wchar_t c : aArg)
    {
        if (c == L'\\')
        {
            ++slashes;
            continue;
        }
        out.append(c == L'"' ? slashes * 2 + 1 : slashes, L'\\');
        slashes = 0;
        out.push_back(c);
    }
    out.append(slashes * 2, L'\\');
    out.push_back(L'"');
    return out;
}

// aOwnRestart: 이 플러그인이 방금 끈 보조 프로세스의 생존 표시가 아직 남아 있어도 다시 띄운다.
std::string Launch(bool aOwnRestart)
{
    const auto dir = PluginDirectory();
    std::ifstream file(dir / L"tts-helper.local.json");
    if (!file)
        return "not_configured";
    nlohmann::json config;
    try
    {
        file >> config;
    }
    catch (const std::exception&)
    {
        return "failed:config_invalid";
    }
    if (!config.value("enabled", true))
        return "not_configured";
    if (!config.contains("command") || !config["command"].is_string())
        return "failed:command_missing";
    if (!aOwnRestart && ExternalHelperAlive(dir))
        return "external";

    std::wstring commandLine = Quote(Widen(config["command"].get<std::string>()));
    for (const auto& arg : config.value("args", nlohmann::json::array()))
        if (arg.is_string())
            commandLine += L" " + Quote(Widen(arg.get<std::string>()));
    const std::wstring cwd = Widen(config.value("cwd", std::string()));

    // 현재 환경에 설정의 env를 더한 블록(이름=값\0 ... \0\0).
    std::wstring environment;
    if (auto* block = GetEnvironmentStringsW())
    {
        for (const wchar_t* p = block; *p; p += wcslen(p) + 1)
            environment.append(p).push_back(L'\0');
        FreeEnvironmentStringsW(block);
    }
    const auto env = config.value("env", nlohmann::json::object());
    for (auto item = env.begin(); item != env.end(); ++item)
        if (item.value().is_string())
            environment.append(Widen(item.key()) + L"=" + Widen(item.value().get<std::string>())).push_back(L'\0');
    environment.push_back(L'\0');

    SECURITY_ATTRIBUTES inherit{sizeof(SECURITY_ATTRIBUTES), nullptr, TRUE};
    HANDLE log = INVALID_HANDLE_VALUE;
    if (config.contains("log") && config["log"].is_string())
        log = CreateFileW(Widen(config["log"].get<std::string>()).c_str(), FILE_APPEND_DATA, FILE_SHARE_READ | FILE_SHARE_WRITE,
                          &inherit, OPEN_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);

    // 로그 핸들 하나만 상속한다(게임 프로세스의 다른 상속 가능 핸들은 넘기지 않는다).
    STARTUPINFOEXW startup{};
    startup.StartupInfo.cb = sizeof(startup);
    std::vector<char> attributes;
    DWORD flags = CREATE_NO_WINDOW | CREATE_SUSPENDED | CREATE_UNICODE_ENVIRONMENT | BELOW_NORMAL_PRIORITY_CLASS;
    if (log != INVALID_HANDLE_VALUE)
    {
        SIZE_T size = 0;
        InitializeProcThreadAttributeList(nullptr, 1, 0, &size);
        attributes.resize(size);
        startup.lpAttributeList = reinterpret_cast<LPPROC_THREAD_ATTRIBUTE_LIST>(attributes.data());
        if (InitializeProcThreadAttributeList(startup.lpAttributeList, 1, 0, &size) &&
            UpdateProcThreadAttribute(startup.lpAttributeList, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST, &log, sizeof(log),
                                      nullptr, nullptr))
        {
            startup.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
            startup.StartupInfo.hStdOutput = log;
            startup.StartupInfo.hStdError = log;
            flags |= EXTENDED_STARTUPINFO_PRESENT;
        }
        else
        {
            startup.lpAttributeList = nullptr;
        }
    }
    const BOOL inheritHandles = (flags & EXTENDED_STARTUPINFO_PRESENT) != 0 ? TRUE : FALSE;
    PROCESS_INFORMATION info{};
    const BOOL created = CreateProcessW(nullptr, commandLine.data(), nullptr, nullptr, inheritHandles, flags, environment.data(),
                                        cwd.empty() ? nullptr : cwd.c_str(), &startup.StartupInfo, &info);
    if (startup.lpAttributeList)
        DeleteProcThreadAttributeList(startup.lpAttributeList);
    if (log != INVALID_HANDLE_VALUE)
        CloseHandle(log);
    if (!created)
        return "failed:create_process_" + std::to_string(GetLastError());

    // 게임 프로세스가 끝나면(정상·비정상 모두) Job 핸들이 닫히며 보조 프로세스도 끝난다.
    gJob = CreateJobObjectW(nullptr, nullptr);
    if (gJob)
    {
        JOBOBJECT_EXTENDED_LIMIT_INFORMATION limits{};
        limits.BasicLimitInformation.LimitFlags = JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE;
        SetInformationJobObject(gJob, JobObjectExtendedLimitInformation, &limits, sizeof(limits));
        AssignProcessToJobObject(gJob, info.hProcess);
    }
    ResumeThread(info.hThread);
    CloseHandle(info.hThread);
    gProcess = info.hProcess;
    return "running";
}

void Close()
{
    if (gJob)
    {
        TerminateJobObject(gJob, 0);
        CloseHandle(gJob);
        gJob = nullptr;
    }
    else if (gProcess)
    {
        TerminateProcess(gProcess, 0);
    }
    if (gProcess)
    {
        CloseHandle(gProcess);
        gProcess = nullptr;
    }
}
} // namespace

std::string TtsHelper::Start()
{
    std::lock_guard lock(gLock);
    if (gProcess)
        return gStatus;
    gStatus = Launch(false);
    return gStatus;
}

void TtsHelper::Stop()
{
    std::lock_guard lock(gLock);
    Close();
    gStatus = "not_started";
}

std::string TtsHelper::Restart()
{
    std::lock_guard lock(gLock);
    const bool own = gProcess != nullptr;
    Close();
    gStatus = Launch(own);
    return gStatus;
}

std::string TtsHelper::Status()
{
    std::lock_guard lock(gLock);
    if (gProcess)
    {
        DWORD code = STILL_ACTIVE;
        if (GetExitCodeProcess(gProcess, &code) && code != STILL_ACTIVE)
        {
            Close();
            gStatus = "exited:" + std::to_string(code);
        }
    }
    return gStatus;
}
} // namespace anpc
