if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/Muhammad_Atif_Khan/.gradle/caches/8.13/transforms/bccc52bdc6e8888139ebec8526b8a544/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/libs/android.x86/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Muhammad_Atif_Khan/.gradle/caches/8.13/transforms/bccc52bdc6e8888139ebec8526b8a544/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

