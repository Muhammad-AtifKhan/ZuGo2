if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/832dff8aa6cc6eabc8a3aa29672ff21a/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.x86/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Muhammad_Atif_Khan/.gradle/caches/9.0.0/transforms/832dff8aa6cc6eabc8a3aa29672ff21a/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

