if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/68c7c4b5936897785c81b6f5aff27252/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.x86_64/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/68c7c4b5936897785c81b6f5aff27252/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

