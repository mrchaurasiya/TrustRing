package com.trustring.callscreen

import android.content.Context
import android.content.SharedPreferences
import android.os.Build
import android.telephony.PhoneStateListener
import android.telephony.SubscriptionManager
import android.telephony.TelephonyCallback
import android.telephony.TelephonyManager
import java.util.concurrent.ConcurrentHashMap

/**
 * Tracks which SIM subscription is currently ringing by registering per-subscription
 * PhoneStateListeners. This fires BEFORE CallScreeningService.onScreenCall(), so we can
 * store the ringing subscription ID for the service to read.
 *
 * On Motorola devices, CallScreeningService receives accountHandle=NULL and empty extras,
 * making it impossible to detect the SIM from within onScreenCall(). This tracker solves
 * that by capturing the ringing state before the screening service is invoked.
 */
object SimCallTracker {

    private const val TAG = "TrustRing"
    private const val PREFS_NAME = "TrustRingSimTracker"
    private const val KEY_RINGING_SUB_ID = "ringing_sub_id"
    private const val KEY_RINGING_SLOT_INDEX = "ringing_slot_index"
    private const val KEY_RINGING_TIMESTAMP = "ringing_timestamp"

    @Volatile
    private var initialized = false
    private val activeListeners = ConcurrentHashMap<Int, Any>() // subId -> listener

    fun initialize(context: Context) {
        if (initialized) return
        synchronized(this) {
            if (initialized) return
            android.util.Log.d(TAG, "SimCallTracker: Initializing...")
            registerListeners(context.applicationContext)
            initialized = true
        }
    }

    private fun registerListeners(context: Context) {
        val subscriptionManager = context.getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
        val telephonyManager = context.getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager

        if (subscriptionManager == null || telephonyManager == null) {
            android.util.Log.d(TAG, "SimCallTracker: SubscriptionManager or TelephonyManager null")
            return
        }

        val activeSubscriptions = try {
            subscriptionManager.activeSubscriptionInfoList
        } catch (e: Exception) {
            android.util.Log.d(TAG, "SimCallTracker: Error getting subscriptions: ${e.message}")
            null
        }

        if (activeSubscriptions == null || activeSubscriptions.isEmpty()) {
            android.util.Log.d(TAG, "SimCallTracker: No active subscriptions found")
            return
        }

        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

        for (info in activeSubscriptions) {
            val subId = info.subscriptionId
            val slotIndex = info.simSlotIndex
            android.util.Log.d(TAG, "SimCallTracker: Registering listener for sub=$subId slot=$slotIndex carrier=${info.carrierName}")

            try {
                val subTm = telephonyManager.createForSubscriptionId(subId)

                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
                    // Android 12+ uses TelephonyCallback
                    val callback = object : TelephonyCallback(), TelephonyCallback.CallStateListener {
                        override fun onCallStateChanged(state: Int) {
                            handleCallStateChange(prefs, subId, slotIndex, state)
                        }
                    }
                    subTm.registerTelephonyCallback(context.mainExecutor, callback)
                    activeListeners[subId] = callback
                } else {
                    // Android 7-11 uses PhoneStateListener
                    @Suppress("DEPRECATION")
                    val listener = object : PhoneStateListener() {
                        override fun onCallStateChanged(state: Int, phoneNumber: String?) {
                            handleCallStateChange(prefs, subId, slotIndex, state)
                        }
                    }
                    @Suppress("DEPRECATION")
                    subTm.listen(listener, PhoneStateListener.LISTEN_CALL_STATE)
                    activeListeners[subId] = listener
                }
            } catch (e: Exception) {
                android.util.Log.d(TAG, "SimCallTracker: Error registering listener for sub=$subId: ${e.message}")
            }
        }

        android.util.Log.d(TAG, "SimCallTracker: Registered ${activeListeners.size} listeners")
    }

    private fun handleCallStateChange(prefs: SharedPreferences, subId: Int, slotIndex: Int, state: Int) {
        val stateName = when (state) {
            TelephonyManager.CALL_STATE_IDLE -> "IDLE"
            TelephonyManager.CALL_STATE_RINGING -> "RINGING"
            TelephonyManager.CALL_STATE_OFFHOOK -> "OFFHOOK"
            else -> "UNKNOWN($state)"
        }
        android.util.Log.d(TAG, "SimCallTracker: sub=$subId slot=$slotIndex state=$stateName")

        if (state == TelephonyManager.CALL_STATE_RINGING) {
            prefs.edit()
                .putInt(KEY_RINGING_SUB_ID, subId)
                .putInt(KEY_RINGING_SLOT_INDEX, slotIndex)
                .putLong(KEY_RINGING_TIMESTAMP, System.currentTimeMillis())
                .commit() // Use commit() not apply() for immediate write
            android.util.Log.d(TAG, "SimCallTracker: *** RINGING on sub=$subId slot=$slotIndex ***")
        }
    }

    /**
     * Returns the slot index (0 or 1) of the SIM that is currently ringing,
     * or -1 if no recent ringing was detected.
     * Only returns a result if the ringing event was within the last 10 seconds.
     */
    fun getRingingSlotIndex(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val timestamp = prefs.getLong(KEY_RINGING_TIMESTAMP, 0)
        val age = System.currentTimeMillis() - timestamp

        if (age > 10_000) {
            // Stale data — ringing event was more than 10 seconds ago
            return -1
        }

        return prefs.getInt(KEY_RINGING_SLOT_INDEX, -1)
    }

    /**
     * Returns the subscription ID of the SIM that is currently ringing,
     * or -1 if no recent ringing was detected.
     */
    fun getRingingSubId(context: Context): Int {
        val prefs = context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)
        val timestamp = prefs.getLong(KEY_RINGING_TIMESTAMP, 0)
        val age = System.currentTimeMillis() - timestamp

        if (age > 10_000) {
            return -1
        }

        return prefs.getInt(KEY_RINGING_SUB_ID, -1)
    }
}
