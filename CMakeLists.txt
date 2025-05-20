cmake_minimum_required(VERSION 3.14)

project(tjs LANGUAGES C)

if((NOT DEFINED DEPS_SOURCE_DIRS) OR (${DEPS_SOURCE_DIRS} STREQUAL ""))
message(FATAL_ERROR "Variable DEPS_SOURCE_DIRS must be set to the root dir of project 'xplatj2' ")
endif()

set(CURL_USE_MBEDTLS ON)

if (NOT CMAKE_BUILD_TYPE)
    message(STATUS "No build type selected, default to Release")
    set(CMAKE_BUILD_TYPE "Release")
endif()
message(STATUS "Building in ${CMAKE_BUILD_TYPE} mode")
message(STATUS "Building with ${CMAKE_C_COMPILER_ID} ${CMAKE_C_COMPILER_VERSION} on ${CMAKE_SYSTEM}")

set(CMAKE_C_STANDARD_REQUIRED ON)
set(CMAKE_C_EXTENSIONS ON)
set(CMAKE_C_STANDARD 11)

set(CMAKE_EXPORT_COMPILE_COMMANDS ON)

list(APPEND tjs_cflags -Wall -g)
if (CMAKE_BUILD_TYPE MATCHES "Debug")
    list(APPEND tjs_cflags -ggdb -O0 -fno-omit-frame-pointer)
endif()

set(TJS__VERSION_MAJOR 24)
set(TJS__VERSION_MINOR 12)
set(TJS__VERSION_PATCH 0)
set(TJS__VERSION_SUFFIX "")
configure_file(
    "${CMAKE_CURRENT_SOURCE_DIR}/src/version.h.in"
    "${CMAKE_CURRENT_SOURCE_DIR}/src/version.h"
)

macro(cpr_option OPTION_NAME OPTION_TEXT OPTION_DEFAULT)
    option(${OPTION_NAME} ${OPTION_TEXT} ${OPTION_DEFAULT})
    if(DEFINED ENV{${OPTION_NAME}})
        # Allow setting the option through an environment variable
        set(${OPTION_NAME} $ENV{${OPTION_NAME}})
    endif()
    if(${OPTION_NAME})
        add_definitions(-D${OPTION_NAME})
    endif()
    message(STATUS "  ${OPTION_NAME}: ${${OPTION_NAME}}")
endmacro()

cpr_option(USE_EXTERNAL_FFI "Specify to use external ffi dependency" OFF)

add_subdirectory(deps/quickjs EXCLUDE_FROM_ALL)

if(NOT TARGET uv_a)
add_subdirectory(${DEPS_SOURCE_DIRS}/libuv ./build_libuv EXCLUDE_FROM_ALL)
endif()

add_subdirectory(deps/sqlite3 EXCLUDE_FROM_ALL)

set(BUILD_WASI "simple" CACHE STRING "WASI implementation")
add_subdirectory(deps/wasm3 EXCLUDE_FROM_ALL)


add_subdirectory(deps/curl EXCLUDE_FROM_ALL)


add_library(tjs STATIC
    src/builtins.c
    src/curl-utils.c
    src/curl-websocket.c
    src/error.c
    src/eval.c
    src/mem.c
    src/modules.c
    src/sha1.c
    src/signals.c
    src/timers.c
    src/utils.c
    src/version.c
    src/vm.c
    src/wasm.c
    src/worker.c
    src/ws.c
    src/xhr.c
    src/mod_dns.c
    src/mod_engine.c
    src/mod_ffi.c
    src/mod_fs.c
    src/mod_fswatch.c
    src/mod_os.c
    src/mod_process.c
    src/mod_sqlite3.c
    src/mod_streams.c
    src/mod_sys.c
    src/mod_udp.c
    src/bundles/c/core/core.c
    src/bundles/c/core/polyfills.c
    src/bundles/c/core/run-main.c
    src/bundles/c/core/run-repl.c
    src/bundles/c/core/worker-bootstrap.c
    deps/quickjs/cutils.c
)

if(UNIX)
    target_sources(tjs PUBLIC src/mod_posix-socket.c)
endif()

add_library(ffi-test SHARED
    tests/fixtures/ffi-test-lib.c
)

add_library(sqlite-test SHARED
    tests/fixtures/sqlite-test-ext.c
)

target_link_libraries(sqlite-test sqlite3)

if(NOT TARGET libffi)
add_subdirectory(${DEPS_SOURCE_DIRS}/libffi ./build_libffi)
endif()



set_target_properties(tjs PROPERTIES
    C_STANDARD 11
    C_STANDARD_REQUIRED ON
)

string(TOLOWER ${CMAKE_SYSTEM_NAME} TJS_PLATFORM)
target_compile_options(tjs PRIVATE ${tjs_cflags})
target_compile_definitions(tjs PRIVATE TJS__PLATFORM="${TJS_PLATFORM}")
if(WIN32)
target_compile_definitions(tjs PRIVATE WIN32_LEAN_AND_MEAN)
endif()
target_include_directories(tjs PUBLIC src)
target_link_libraries(tjs qjs uv_a m3 sqlite3 libcurl_static ffi_static)

add_executable(tjs-cli
    src/cli.c
)
target_link_libraries(tjs-cli tjs)
set_target_properties(tjs-cli
    PROPERTIES OUTPUT_NAME tjs
)

add_executable(tjsc EXCLUDE_FROM_ALL
    src/qjsc.c
)
target_link_libraries(tjsc qjs)
