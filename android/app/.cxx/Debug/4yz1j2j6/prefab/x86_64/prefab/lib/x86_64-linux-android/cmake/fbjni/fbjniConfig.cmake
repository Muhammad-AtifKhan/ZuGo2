if(NOT TARGET fbjni::fbjni)
add_library(fbjni::fbjni SHARED IMPORTED)
set_target_properties(fbjni::fbjni PROPERTIES
    IMPORTED_LOCATION "C:/Users/Muhammad_Atif_Khan/.gradle/caches/8.13/transforms/b7dce72bff7fdb5c13643e891a8a1b5d/transformed/fbjni-0.7.0/prefab/modules/fbjni/libs/android.x86_64/libfbjni.so"
    INTERFACE_INCLUDE_DIRECTORIES "C:/Users/Muhammad_Atif_Khan/.gradle/caches/8.13/transforms/b7dce72bff7fdb5c13643e891a8a1b5d/transformed/fbjni-0.7.0/prefab/modules/fbjni/include"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

