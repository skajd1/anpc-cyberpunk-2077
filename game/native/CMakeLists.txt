cmake_minimum_required(VERSION 3.21)

project(ANPCNative VERSION 0.1.0 LANGUAGES CXX)

set(CMAKE_CXX_STANDARD 20)
set(CMAKE_CXX_STANDARD_REQUIRED ON)
# 게임 프로세스에 별도 VC++ 런타임 설치를 요구하지 않도록 정적 런타임을 쓴다.
set(CMAKE_MSVC_RUNTIME_LIBRARY "MultiThreaded$<$<CONFIG:Debug>:Debug>")

add_compile_definitions(NOMINMAX UNICODE _UNICODE)

set(RED4EXT_HEADER_ONLY ON CACHE BOOL "" FORCE)
add_subdirectory(deps/RED4ext.SDK)
add_subdirectory(deps/RedLib)
set(JSON_BuildTests OFF CACHE INTERNAL "")
set(JSON_Install OFF CACHE INTERNAL "")
add_subdirectory(deps/json)

add_library(ANPC.Native SHARED
  src/Main.cpp
  src/Credentials.cpp
  src/HttpWorker.cpp
  src/Provider.cpp
  src/TtsHelper.cpp
  src/UsageLog.cpp
)
target_link_libraries(ANPC.Native PRIVATE RED4ext::SDK RedLib nlohmann_json::nlohmann_json winhttp advapi32)
target_compile_options(ANPC.Native PRIVATE /W4 /utf-8 /permissive- /Zc:__cplusplus)
set_target_properties(ANPC.Native PROPERTIES OUTPUT_NAME "ANPC.Native")

include(CTest)
if(BUILD_TESTING)
    add_executable(ANPC.Provider.Tests tests/Provider.test.cpp src/Provider.cpp)
    target_include_directories(ANPC.Provider.Tests PRIVATE src)
    target_link_libraries(ANPC.Provider.Tests PRIVATE nlohmann_json::nlohmann_json)
    add_test(NAME provider-response COMMAND ANPC.Provider.Tests)
endif()
