#include "Credentials.hpp"

#include <Windows.h>
#include <wincred.h>

#include "Provider.hpp"

namespace anpc
{
namespace
{
std::wstring TargetName(std::string_view aProvider)
{
    std::wstring target = L"ANPC/";
    target.append(aProvider.begin(), aProvider.end());
    return target;
}
} // namespace

bool IsKnownProvider(std::string_view aProvider)
{
    return FindEndpoint(aProvider).has_value();
}

bool HasApiKey(std::string_view aProvider)
{
    if (!IsKnownProvider(aProvider))
        return false;

    PCREDENTIALW credential = nullptr;
    const auto target = TargetName(aProvider);
    if (!CredReadW(target.c_str(), CRED_TYPE_GENERIC, 0, &credential))
        return false;

    const bool present = credential->CredentialBlobSize > 0;
    CredFree(credential);
    return present;
}

bool SaveApiKey(std::string_view aProvider, std::string_view aKey)
{
    if (!IsKnownProvider(aProvider) || aKey.empty() || aKey.size() > 512)
        return false;

    auto target = TargetName(aProvider);
    std::wstring user = L"ANPC";
    std::string blob(aKey);

    CREDENTIALW credential{};
    credential.Type = CRED_TYPE_GENERIC;
    credential.TargetName = target.data();
    credential.UserName = user.data();
    credential.CredentialBlobSize = static_cast<DWORD>(blob.size());
    credential.CredentialBlob = reinterpret_cast<LPBYTE>(blob.data());
    credential.Persist = CRED_PERSIST_LOCAL_MACHINE;

    const bool saved = CredWriteW(&credential, 0) == TRUE;
    SecureZeroMemory(blob.data(), blob.size());
    return saved;
}

bool DeleteApiKey(std::string_view aProvider)
{
    if (!IsKnownProvider(aProvider))
        return false;

    const auto target = TargetName(aProvider);
    return CredDeleteW(target.c_str(), CRED_TYPE_GENERIC, 0) == TRUE || GetLastError() == ERROR_NOT_FOUND;
}

std::optional<std::string> ReadApiKey(std::string_view aProvider)
{
    if (!IsKnownProvider(aProvider))
        return std::nullopt;

    PCREDENTIALW credential = nullptr;
    const auto target = TargetName(aProvider);
    if (!CredReadW(target.c_str(), CRED_TYPE_GENERIC, 0, &credential))
        return std::nullopt;

    std::optional<std::string> key;
    if (credential->CredentialBlobSize > 0)
    {
        key.emplace(reinterpret_cast<const char*>(credential->CredentialBlob), credential->CredentialBlobSize);
        SecureZeroMemory(credential->CredentialBlob, credential->CredentialBlobSize);
    }
    CredFree(credential);
    return key;
}
} // namespace anpc
