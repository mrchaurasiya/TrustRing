package com.trustring.callscreen

import android.content.ContentResolver
import android.content.Context
import android.content.SharedPreferences
import android.net.Uri
import android.os.Build
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

    override fun onScreenCall(callDetails: Call.Details) {
        val handle = callDetails.handle
        val phoneNumber = handle?.schemeSpecificPart ?: ""

        val prefs = getSharedPreferences("TrustRingPrefs", MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("blocking_enabled", false)

        // ALLOW REASON: Blocking is globally disabled in app settings or phone number is empty.
        if (!isEnabled || phoneNumber.isEmpty()) {
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        // --- PER-SIM BLOCKING EVALUATION ---
        // How SIM is identified:
        // 1. Reads user's per-SIM preference from SharedPreferences ("BOTH", "SIM_1", or "SIM_2").
        // 2. Extracts Call.Details.accountHandle (PhoneAccountHandle).
        // 3. Resolves subscription ID via TelecomManager, TelephonyManager.createForPhoneAccountHandle(),
        //    and SubscriptionManager to determine simSlotIndex (0 for SIM 1, 1 for SIM 2).
        val simPref = prefs.getString("sim_blocking_preference", "BOTH") ?: "BOTH"
        val callSimSlot = getSimSlotForCall(callDetails)

        android.util.Log.d("TrustRing", "onScreenCall: simPref='$simPref', callSimSlot=$callSimSlot, phoneNumber='$phoneNumber'")

        // Evaluate whether the call blocking rule applies to the SIM that received this call
        val shouldApplyBlocking = when (simPref) {
            "SIM_1" -> callSimSlot == SimSlot.SIM_1 || (callSimSlot == SimSlot.UNKNOWN && isSingleSimDevice())
            "SIM_2" -> callSimSlot == SimSlot.SIM_2
            else -> true // "BOTH" or default: applies to both SIMs
        }

        // ALLOW REASON: User configured call blocking to target the other SIM card.
        if (!shouldApplyBlocking) {
            android.util.Log.d("TrustRing", "Call allowed: target SIM preference '$simPref' does not match call SIM '$callSimSlot'")
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        // ALLOW REASON: Incoming call arrived outside active scheduled hours.
        val isInSchedule = isWithinSchedule(prefs)
        if (!isInSchedule) {
            android.util.Log.d("TrustRing", "Call allowed: outside schedule")
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val isKnown = isNumberInContacts(phoneNumber)
        val isWhitelisted = isNumberWhitelisted(prefs, phoneNumber)

        if (isKnown || isWhitelisted) {
            android.util.Log.d("TrustRing", "Call allowed: known contact or whitelisted")
            respondToCall(callDetails, CallResponse.Builder().build())
        } else {
            android.util.Log.d("TrustRing", "Call BLOCKED on $callSimSlot (Target SIM Pref: $simPref)")
            val response = CallResponse.Builder()
                .setDisallowCall(true)
                .setRejectCall(true)
                .setSkipCallLog(false)
                .setSkipNotification(false)
                .build()

            respondToCall(callDetails, response)
            logBlockedCall(prefs, phoneNumber)
        }
    }

    /**
     * Dynamically identifies which SIM slot (SIM 1 or SIM 2) received the incoming call.
     */
    private fun getSimSlotForCall(callDetails: Call.Details): SimSlot {
        val accountHandle: PhoneAccountHandle? = callDetails.accountHandle
        if (accountHandle == null) {
            android.util.Log.d("TrustRing", "getSimSlotForCall: accountHandle is null")
            return SimSlot.UNKNOWN
        }

        val handleId = accountHandle.id ?: ""
        android.util.Log.d("TrustRing", "getSimSlotForCall: accountHandle.id = '$handleId'")

        val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
        val telephonyManager = getSystemService(Context.TELEPHONY_SERVICE) as? TelephonyManager
        val telecomManager = getSystemService(Context.TELECOM_SERVICE) as? TelecomManager

        val activeSubscriptions = try {
            subscriptionManager?.activeSubscriptionInfoList
        } catch (e: SecurityException) {
            android.util.Log.d("TrustRing", "SecurityException reading activeSubscriptionInfoList: ${e.message}")
            null
        }

        // Method 1: Check accountHandle.id direct slot patterns (e.g. "0", "1", "sim1", "sim2", ":0", ":1")
        if (handleId == "0" || handleId.endsWith(":0") || handleId.endsWith("_0") ||
            handleId.contains("slot0", ignoreCase = true) || handleId.contains("sim1", ignoreCase = true) ||
            handleId.contains("sub0", ignoreCase = true)) {
            android.util.Log.d("TrustRing", "Matched SIM_1 via direct handleId pattern: '$handleId'")
            return SimSlot.SIM_1
        }
        if (handleId == "1" || handleId.endsWith(":1") || handleId.endsWith("_1") ||
            handleId.contains("slot1", ignoreCase = true) || handleId.contains("sim2", ignoreCase = true) ||
            handleId.contains("sub1", ignoreCase = true)) {
            android.util.Log.d("TrustRing", "Matched SIM_2 via direct handleId pattern: '$handleId'")
            return SimSlot.SIM_2
        }

        // Method 2: TelecomManager PhoneAccount inspection (Label/Description)
        try {
            if (telecomManager != null) {
                val phoneAccount = telecomManager.getPhoneAccount(accountHandle)
                val label = phoneAccount?.label?.toString() ?: ""
                val shortDesc = phoneAccount?.shortDescription?.toString() ?: ""
                android.util.Log.d("TrustRing", "PhoneAccount label='$label', shortDesc='$shortDesc'")

                if (label.contains("SIM 1", ignoreCase = true) || label.contains("SIM1", ignoreCase = true) ||
                    shortDesc.contains("SIM 1", ignoreCase = true) || shortDesc.contains("SIM1", ignoreCase = true)) {
                    android.util.Log.d("TrustRing", "Matched SIM_1 via PhoneAccount label/desc")
                    return SimSlot.SIM_1
                }
                if (label.contains("SIM 2", ignoreCase = true) || label.contains("SIM2", ignoreCase = true) ||
                    shortDesc.contains("SIM 2", ignoreCase = true) || shortDesc.contains("SIM2", ignoreCase = true)) {
                    android.util.Log.d("TrustRing", "Matched SIM_2 via PhoneAccount label/desc")
                    return SimSlot.SIM_2
                }
            }
        } catch (e: Exception) {
            android.util.Log.d("TrustRing", "Error querying PhoneAccount: ${e.message}")
        }

        // Method 3: Parse handleId as subId integer or match against ActiveSubscriptions
        val parsedSubId = handleId.toIntOrNull()
        if (parsedSubId != null && activeSubscriptions != null) {
            for (info in activeSubscriptions) {
                if (info.subscriptionId == parsedSubId) {
                    android.util.Log.d("TrustRing", "Matched subId $parsedSubId to simSlotIndex ${info.simSlotIndex}")
                    return when (info.simSlotIndex) {
                        0 -> SimSlot.SIM_1
                        1 -> SimSlot.SIM_2
                        else -> SimSlot.UNKNOWN
                    }
                }
            }
        }

        // Method 4: Pinned TelephonyManager (Android 8.0+)
        if (telephonyManager != null && Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            try {
                val pinnedTm = telephonyManager.createForPhoneAccountHandle(accountHandle)
                if (pinnedTm != null) {
                    val subId = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        pinnedTm.subscriptionId
                    } else {
                        parsedSubId ?: SubscriptionManager.INVALID_SUBSCRIPTION_ID
                    }
                    if (subId != SubscriptionManager.INVALID_SUBSCRIPTION_ID && activeSubscriptions != null) {
                        for (info in activeSubscriptions) {
                            if (info.subscriptionId == subId) {
                                android.util.Log.d("TrustRing", "Pinned TM matched subId $subId to slot ${info.simSlotIndex}")
                                return when (info.simSlotIndex) {
                                    0 -> SimSlot.SIM_1
                                    1 -> SimSlot.SIM_2
                                    else -> SimSlot.UNKNOWN
                                }
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                android.util.Log.d("TrustRing", "Pinned TM error: ${e.message}")
            }
        }

        // Method 5: Match substring/ICCID/carrier with active subscriptions
        if (activeSubscriptions != null) {
            for (info in activeSubscriptions) {
                val subIdStr = info.subscriptionId.toString()
                val iccId = info.iccId ?: ""
                val carrierName = info.carrierName?.toString() ?: ""

                if ((subIdStr.isNotEmpty() && handleId.contains(subIdStr)) ||
                    (iccId.isNotEmpty() && handleId.contains(iccId)) ||
                    (carrierName.isNotEmpty() && handleId.contains(carrierName, ignoreCase = true))) {
                    android.util.Log.d("TrustRing", "Matched subscription info for slot ${info.simSlotIndex}")
                    return when (info.simSlotIndex) {
                        0 -> SimSlot.SIM_1
                        1 -> SimSlot.SIM_2
                        else -> SimSlot.UNKNOWN
                    }
                }
            }
        }

        // Method 6: Single SIM fallback
        if (activeSubscriptions != null && activeSubscriptions.size == 1) {
            android.util.Log.d("TrustRing", "Single SIM fallback: slot ${activeSubscriptions[0].simSlotIndex}")
            return when (activeSubscriptions[0].simSlotIndex) {
                0 -> SimSlot.SIM_1
                1 -> SimSlot.SIM_2
                else -> SimSlot.SIM_1
            }
        }

        android.util.Log.d("TrustRing", "SIM Slot detection resulted in UNKNOWN")
        return SimSlot.UNKNOWN
    }

    private fun isSingleSimDevice(): Boolean {
        return try {
            val subscriptionManager = getSystemService(Context.TELEPHONY_SUBSCRIPTION_SERVICE) as? SubscriptionManager
            val activeSubscriptions = subscriptionManager?.activeSubscriptionInfoList
            activeSubscriptions?.size == 1
        } catch (e: Exception) {
            false
        }
    }

    private fun isNumberInContacts(phoneNumber: String): Boolean {
        val uri = Uri.withAppendedPath(
            ContactsContract.PhoneLookup.CONTENT_FILTER_URI,
            Uri.encode(phoneNumber)
        )
        val projection = arrayOf(ContactsContract.PhoneLookup._ID)
        var cursor: android.database.Cursor? = null
        return try {
            cursor = contentResolver.query(uri, projection, null, null, null)
            cursor != null && cursor.moveToFirst()
        } catch (e: Exception) {
            false
        } finally {
            cursor?.close()
        }
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
        } catch (e: Exception) {
            false
        }
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
            val currentDay = (calendar.get(Calendar.DAY_OF_WEEK) + 5) % 7 // Mon=0, Sun=6
            val currentHour = calendar.get(Calendar.HOUR_OF_DAY)
            val currentMinute = calendar.get(Calendar.MINUTE)

            val daysList = activeDays.split(",").map { it.trim().toIntOrNull() }.filterNotNull()
            if (!daysList.contains(currentDay)) return false

            val currentTime = currentHour * 60 + currentMinute
            val startTime = startHour * 60 + startMinute
            val endTime = endHour * 60 + endMinute

            if (startTime <= endTime) {
                // Same-day schedule (e.g., 9 AM to 5 PM)
                currentTime in startTime..endTime
            } else {
                // Overnight schedule (e.g., 10 PM to 7 AM)
                currentTime >= startTime || currentTime <= endTime
            }
        } catch (e: Exception) {
            true
        }
    }

    private fun logBlockedCall(prefs: SharedPreferences, phoneNumber: String) {
        val existing = prefs.getString("blocked_log", "[]") ?: "[]"
        val entry = JSONObject().apply {
            put("number", phoneNumber)
            put("timestamp", System.currentTimeMillis())
        }
        val updatedLog = if (existing == "[]") {
            "[$entry]"
        } else {
            existing.dropLast(1) + ",$entry]"
        }
        prefs.edit().putString("blocked_log", updatedLog).apply()

        val count = prefs.getInt("blocked_count", 0)
        prefs.edit().putInt("blocked_count", count + 1).apply()
    }
}
