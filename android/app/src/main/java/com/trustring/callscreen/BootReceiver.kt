package com.trustring.callscreen

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent

class BootReceiver : BroadcastReceiver() {
    override fun onReceive(context: Context, intent: Intent) {
        if (intent.action == Intent.ACTION_BOOT_COMPLETED) {
            // Re-apply preferences on boot - the CallScreeningService
            // will automatically be active if set as default call screening app
            val prefs = context.getSharedPreferences("TrustRingPrefs", Context.MODE_PRIVATE)
            // Ensure blocking state persists across reboots
            prefs.edit().putBoolean("service_active", true).apply()
        }
    }
}
