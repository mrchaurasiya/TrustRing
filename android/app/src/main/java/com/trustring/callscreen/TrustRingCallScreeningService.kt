package com.trustring.callscreen

import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
import android.provider.CallLog
import android.provider.ContactsContract
import android.telecom.Call
import android.telecom.CallScreeningService
import android.telecom.PhoneAccountHandle
import android.telecom.TelecomManager
import android.telephony.SubscriptionManager
import android.telephony.TelephonyManager
import org.json.JSONObject
import java.util.Calendar

class TrustRingCallScreeningService : CallScreeningService() {

    private enum class SimSlot {
        SIM_1, // Slot index 0
        SIM_2, // Slot index 1
        UNKNOWN
    }

    override fun onCreate() {
        super.onCreate()
        // Ensure SimCallTracker is initialized even if app was killed and service restarted
        try {
            SimCallTracker.initialize(this)
        } catch (e: Exception) {
            android.util.Log.d("TrustRing", "SimCallTracker init in service: ${e.message}")
        }
    }

    override fun onScreenCall(callDetails: Call.Details) {
        val handle = callDetails.handle
        val phoneNumber = handle?.schemeSpecificPart ?: ""

        val prefs = getSharedPreferences("TrustRingPrefs", MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("blocking_enabled", true)

        if (!isEnabled || phoneNumber.isEmpty()) {
            android.util.Log.d("TrustRing", "Call allowed: blocking_enabled=$isEnabled, phoneNumber='$phoneNumber'")
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val simPref = prefs.getString("sim_blocking_preference", "BOTH") ?: "BOTH"
        val callSimSlot = getSimSlotForCall(callDetails)

        android.util.Log.d("TrustRing", "onScreenCall: simPref='$simPref', callSimSlot=$callSimSlot, phoneNumber='$phoneNumber'")

        val shouldApplyBlocking = when (simPref) {
            "SIM_1" -> callSimSlot == SimSlot.SIM_1 || (callSimSlot == SimSlot.UNKNOWN && getActiveSimCount() <= 1)
            "SIM_2" -> callSimSlot == SimSlot.SIM_2 || (callSimSlot == SimSlot.UNKNOWN && getActiveSimCount() <= 1)
            else -> true // "BOTH"
        }

        if (!shouldApplyBlocking) {
            android.util.Log.d("TrustRing", "Call allowed: simPref '$simPref' doesn't match '$callSimSlot'")
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val isInSchedule = isWithinSchedule(prefs)
        if (!isInSchedule) {
            android.util.Log.d("TrustRing", "Call allowed: outside schedule")
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val isKnown = isNumberInContacts(phoneNumber)
        val isWhitelisted = isNumberWhitelisted(prefs, phoneNumber)

        if (isKnown || isWhitelisted) {
            android.util.Log.d("TrustRing", "Call allowed: contact=$isKnown whitelist=$isWhitelisted")
            respondToCall(callDetails, CallResponse.Builder().build())
        } else {
            android.util.Log.d("TrustRing", "Call BLOCKED on $callSimSlot (simPref=$simPref)")
            val response = CallResponse.Builder()
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipCallLog(false)
                .setSkipNotification(false)
                .build()
            respondToCall(callDetails, response)
            logBlockedCall(prefs, phoneNumber, callSimSlot, simPref)
        }
    }

    private fun getSimSlotForCall(callDetails: Call.Details): SimSlot {
        val accountHandle: PhoneAccountHandle? = callDetails.accountHandle
        android.util.Log.d("TrustRing", "SIM_DETECT: accountHandle=${accountHandle?.id ?: "NULL"}")

        // ==================== STRATEGY 0: SimCallTracker (PhoneStateListener) ====================
        // This is the PRIMARY strategy. SimCallTracker registers per-subscription listeners
        // in MainApplication.onCreate(). The PhoneStateListener fires with RINGING state
        // BEFORE onScreenCall() is called, so this data is already available.
        val trackerSlot = SimCallTracker.getRingingSlotIndex(this)
        val trackerSubId = SimCallTracker.getRingingSubId(this)
        android.util.Log.d("TrustRing", "SIM_DETECT: SimCallTracker slot=$trackerSlot subId=$trackerSubId")
        if (trackerSlot >= 0) {
            val simSlot = if (trackerSlot == 0) SimSlot.SIM_1 else SimSlot.SIM_2
            android.util.Log.d("TrustRing", "SIM_DETECT: ✓ TRACKER HIT -> $simSlot (subId=$trackerSubId)")
            return simSlot
        }

        // --- Fallback strategies for devices where accountHandle IS available ---

        val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager
        val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager

        val activeSubscriptions = try {
            subscriptionManager?.activeSubscriptionInfoList
        } catch (e: Exception) { null }

        val phoneAccounts = try {
            telecomManager?.callCapablePhoneAccounts
        } catch (e: Exception) { null }

        // ==================== STRATEGY 1: accountHandle matching ====================
        if (accountHandle != null && phoneAccounts != null && phoneAccounts.isNotEmpty()) {
            for (i in phoneAccounts.indices) {
                if (phoneAccounts[i] == accountHandle || phoneAccounts[i].id == accountHandle.id) {
                    val slot = if (i == 0) SimSlot.SIM_1 else SimSlot.SIM_2
                    android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S1 HIT -> $slot")
                    return slot
                }
            }
        }

        if (accountHandle != null && activeSubscriptions != null) {
            val parsedSubId = accountHandle.id?.toIntOrNull()
            for (info in activeSubscriptions) {
                if (parsedSubId != null && info.subscriptionId == parsedSubId) {
                    val slot = if (info.simSlotIndex == 0) SimSlot.SIM_1 else SimSlot.SIM_2
                    android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S1b HIT -> $slot")
                    return slot
                }
            }
        }

        // ==================== STRATEGY 2: extras/intentExtras ====================
        val allBundles = listOfNotNull(callDetails.intentExtras, callDetails.extras).filter { it.size() > 0 }
        if (activeSubscriptions != null && allBundles.isNotEmpty()) {
            for (bundle in allBundles) {
                try {
                    val extraHandle: PhoneAccountHandle? = try {
                        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
                            bundle.getParcelable("android.telecom.extra.PHONE_ACCOUNT_HANDLE", PhoneAccountHandle::class.java)
                        } else {
                            @Suppress("DEPRECATION")
                            bundle.getParcelable("android.telecom.extra.PHONE_ACCOUNT_HANDLE")
                        }
                    } catch (e: Exception) { null }

                    if (extraHandle != null && phoneAccounts != null) {
                        for (i in phoneAccounts.indices) {
                            if (phoneAccounts[i].id == extraHandle.id) {
                                val slot = if (i == 0) SimSlot.SIM_1 else SimSlot.SIM_2
                                android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S2 HIT -> $slot")
                                return slot
                            }
                        }
                    }

                    for (key in bundle.keySet()) {
                        val value = bundle.get(key)
                        if (value is Int) {
                            for (info in activeSubscriptions) {
                                if (value == info.subscriptionId) {
                                    val slot = if (info.simSlotIndex == 0) SimSlot.SIM_1 else SimSlot.SIM_2
                                    android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S2 HIT extra '$key'=$value -> $slot")
                                    return slot
                                }
                            }
                        }
                    }
                } catch (e: Exception) { }
            }
        }

        // ==================== STRATEGY 3: handleId pattern ====================
        if (accountHandle != null) {
            val h = (accountHandle.id ?: "").lowercase()
            if (h == "0" || h.endsWith(":0") || h.endsWith("_0") || h.contains("slot0") || h.contains("sim1")) {
                android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S3 HIT -> SIM_1")
                return SimSlot.SIM_1
            }
            if (h == "1" || h.endsWith(":1") || h.endsWith("_1") || h.contains("slot1") || h.contains("sim2")) {
                android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S3 HIT -> SIM_2")
                return SimSlot.SIM_2
            }
        }

        // ==================== STRATEGY 4: Single SIM fallback ====================
        if (activeSubscriptions != null && activeSubscriptions.size == 1) {
            val slot = if (activeSubscriptions[0].simSlotIndex == 0) SimSlot.SIM_1 else SimSlot.SIM_2
            android.util.Log.d("TrustRing", "SIM_DETECT: ✓ S4 HIT single SIM -> $slot")
            return slot
        }

        android.util.Log.d("TrustRing", "SIM_DETECT: ✗ ALL FAILED -> UNKNOWN")
        return SimSlot.UNKNOWN
    }

    private fun getActiveSimCount(): Int {
        return try {
            val sm = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            sm?.activeSubscriptionInfoList?.size ?: 0
        } catch (e: Exception) { 0 }
    }

    private fun isNumberInContacts(phoneNumber: String): Boolean {
        val uri = Uri.withAppendedPath(
            ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
            Uri.encode(phoneNumber)
        )
        var cursor: android.database.Cursor? = null
        return try {
            cursor = contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup._ID), null, null, null)
            cursor != null && cursor.moveToFirst()
        } catch (e: Exception) { false }
        finally { cursor?.close() }
    }

    private fun isNumberWhitelisted(prefs: SharedPreferences, phoneNumber: String): Boolean {
        val whitelistJson = prefs.getString("whitelist", "[]") ?: "[]"
        return try {
            val whitelist = org.json.JSONArray(whitelistJson)
            val cleaned = phoneNumber.replace(Regex("[^0-9+]"), "")
            for (i in 0 until whitelist.length()) {
                val whiteNum = whitelist.getString(i).replace(Regex("[^0-9+]"), "")
                if (cleaned.endsWith(whiteNum.takeLast(10)) || whiteNum.endsWith(cleaned.takeLast(10))) {
                    return true
                }
            }
            false
        } catch (e: Exception) { false }
    }

    private fun isWithinSchedule(prefs: SharedPreferences): Boolean {
        val scheduleJson = prefs.getString("schedule", null) ?: return true
        return try {
            val schedule = JSONObject(scheduleJson)
            val startHour = schedule.optInt("startHour", 0)
            val startMinute = schedule.optInt("startMinute", 0)
            val endHour = schedule.optInt("endHour", 23)
            val endMinute = schedule.optInt("endMinute", 59)
            val activeDays = schedule.optString("activeDays", "0,1,2,3,4,5,6")

            val calendar = Calendar.getInstance()
            val currentDay = (calendar.get(Calendar.DAY_OF_WEEK) + 5) % 7
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)

            val daysList = activeDays.split(",").mapNotNull { it.trim().toIntOrNull() }
            if (!daysList.contains(currentDay)) return false

            val currentTime = currentHour * 60 + currentMinute
            val startTime = startHour * 60 + startMinute
            val endTime = endHour * 60 + endMinute

            if (startTime <= endTime) currentTime in startTime..endTime
            else currentTime >= startTime || currentTime <= endTime
        } catch (e: Exception) { true }
    }

    private fun logBlockedCall(prefs: SharedPreferences, phoneNumber: String, simSlot: SimSlot, simPref: String) {
        val existing = prefs.getString("blocked_log", "[]") ?: "[]"
        val entry = JSONObject().apply {
            put("number", phoneNumber)
            put("timestamp", System.currentTimeMillis())
            put("simSlot", simSlot.name)
            put("targetSimPref", simPref)
        }
        val updatedLog = if (existing == "[]") "[$entry]" else existing.dropLast(1) + ",$entry]"
        prefs.edit().putString("blocked_log", updatedLog).apply()
        prefs.edit().putInt("blocked_count", prefs.getInt("blocked_count", 0) + 1).apply()
    }
}
