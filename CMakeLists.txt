cmake_minimum_required(VERSION 3.14)

project(tjs LANGUAGES C)

if("${DEPS_SOURCE_DIRS}" STREQUAL "")
  if(NOT ("$ENV{DEPS_SOURCE_DIRS}" STREQUAL ""))
    set(DEPS_SOURCE_DIRS $ENV{DEPS_SOURCE_DIRS})
  else()
    get_filename_component(DEPS_SOURCE_DIRS ../deps ABSOLUTE)
  endif()
endif()



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
add_subdirectory(deps/mbedtls EXCLUDE_FROM_ALL)

if(NOT TARGET uv_a)
add_subdirectory(${DEPS_SOURCE_DIRS}/libuv ./build_libuv EXCLUDE_FROM_ALL)
endif()




add_library(tjs STATIC
    src/error.c
    src/eval.c
    src/mem.c
    src/modules.c
    src/signals.c
    src/timers.c
    src/utils.c
    src/version.c
    src/vm.c
    src/worker.c
    src/mod_dns.c
    src/mod_engine.c
    src/mod_fs.c
    src/mod_fswatch.c
    src/mod_os.c
    src/mod_process.c
    src/mod_streams.c
    src/mod_sys.c
    src/mod_udp.c
)


add_library(ffi-test SHARED
    tests/fixtures/ffi-test-lib.c
)


if(NOT TARGET ffi_static)
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
target_include_directories(tjs PRIVATE src)
target_include_directories(tjs PUBLIC include)

set(TJS_DEPLIBS qjs uv_a mbedtls)
target_link_libraries(tjs ${TJS_DEPLIBS})

add_custom_command(TARGET tjs POST_BUILD
    COMMAND ${CMAKE_COMMAND} -E copy_directory
        ${CMAKE_CURRENT_SOURCE_DIR}/src/js 
        $<TARGET_FILE_DIR:tjs>/tjs-initialize
    COMMENT "Copying js initialize files to target output directory..."
)

add_executable(tjs-cli
    src/cli.c
)
target_link_libraries(tjs-cli tjs)

add_executable(tjsc EXCLUDE_FROM_ALL
    src/qjsc.c
)
target_link_libraries(tjsc qjs)
