package com.citytransportmanagementsystem

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint.fabricEnabled
import com.facebook.react.defaults.DefaultReactActivityDelegate
import android.os.Bundle  // <- Required for gesture handler

class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "CityTransportManagementSystem"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, fabricEnabled)

    // Required for react-native-gesture-handler
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(null)
    }
}
