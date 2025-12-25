if(NOT TARGET react-native-reanimated::reanimated)
add_library(react-native-reanimated::reanimated SHARED IMPORTED)
set_target_properties(react-native-reanimated::reanimated PROPERTIES
    IMPORTED_LOCATION "D:/MyProjects/CityTransportManagementSystem/node_modules/react-native-reanimated/android/build/intermediates/cxx/Debug/a6l4c3w5/obj/x86/libreanimated.so"
    INTERFACE_INCLUDE_DIRECTORIES "D:/MyProjects/CityTransportManagementSystem/node_modules/react-native-reanimated/android/build/prefab-headers/reanimated"
    INTERFACE_LINK_LIBRARIES ""
)
endif()

