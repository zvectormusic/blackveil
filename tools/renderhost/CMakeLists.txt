# Built as part of the VST3 SDK tree: add
#   add_subdirectory(<path to this folder> renderhost)
# to vst3sdk/public.sdk/samples/vst-hosting/CMakeLists.txt, then build the target "renderhost".

set(target renderhost)

# same extra hosting sources the SDK's validator compiles itself (Windows only)
add_executable(${target}
    main.cpp
    ${SDK_ROOT}/public.sdk/source/vst/hosting/plugprovider.cpp
    ${SDK_ROOT}/public.sdk/source/vst/hosting/module.cpp
    ${SDK_ROOT}/public.sdk/source/vst/hosting/module_win32.cpp
    ${SDK_ROOT}/public.sdk/source/vst/moduleinfo/moduleinfoparser.cpp
    ${SDK_ROOT}/public.sdk/source/common/memorystream.cpp
)
target_compile_features(${target} PUBLIC cxx_std_17)
target_link_libraries(${target} PRIVATE sdk_hosting)
