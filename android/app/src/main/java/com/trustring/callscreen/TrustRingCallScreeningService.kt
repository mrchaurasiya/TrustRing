package com.trustring.callscreen

import android.content.ContentResolver
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.telecom.Call
import android.telecom.CallScreeningService
import android.content.SharedPreferences
import org.json.JSONObject
import java.util.Calendar

class TrustRingCallScreeningService : CallScreeningService() {

    override fun onScreenCall(callDetails: Call.Details) {
        val handle = callDetails.handle
        val phoneNumber = handle?.schemeSpecificPart ?: ""

        val prefs = getSharedPreferences("TrustRingPrefs", MODE_PRIVATE)
        val isEnabled = prefs.getBoolean("blocking_enabled", false)

        if (!isEnabled || phoneNumber.isEmpty()) {
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val isInSchedule = isWithinSchedule(prefs)
        if (!isInSchedule) {
            respondToCall(callDetails, CallResponse.Builder().build())
            return
        }

        val isKnown = isNumberInContacts(phoneNumber)

        if (isKnown) {
            // Allow the call
            respondToCall(callDetails, CallResponse.Builder().build())
        } else {
            // Block the call
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

            currentTime in startTime..endTime
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
