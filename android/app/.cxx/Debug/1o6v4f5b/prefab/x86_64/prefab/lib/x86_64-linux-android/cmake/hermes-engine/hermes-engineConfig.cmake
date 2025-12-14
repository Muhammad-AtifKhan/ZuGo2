if(NOT TARGET hermes-engine::hermesvm)
add_library(hermes-engine::hermesvm SHARED IMPORTED)
set_target_properties(hermes-engine::hermesvm PROPERTIES
    IMPORTED_LOCATION "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/ea7ca9303213bf502e5072c15031ac4c/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/libs/android.x86_64/libhermesvm.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/ea7ca9303213bf502e5072c15031ac4c/transformed/hermes-android-0.14.0-debug/prefab/modules/hermesvm/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

