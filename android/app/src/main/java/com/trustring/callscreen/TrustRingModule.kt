package com.trustring.callscreen

import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import org.json.JSONArray
import org.json.JSONObject

class TrustRingModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "TrustRingModule"

    private fun getPrefs() =
        reactApplicationContext.getSharedPreferences("TrustRingPrefs", Context.MODE_PRIVATE)

    @ReactMethod
    fun setBlockingEnabled(enabled: Boolean, promise: Promise) {
        getPrefs().edit().putBoolean("blocking_enabled", enabled).apply()
        promise.resolve(enabled)
    }

    @ReactMethod
    fun isBlockingEnabled(promise: Promise) {
        promise.resolve(getPrefs().getBoolean("blocking_enabled", false))
    }

    @ReactMethod
    fun setSchedule(
        startHour: Int,
        startMinute: Int,
        endHour: Int,
        endMinute: Int,
        activeDays: String,
        promise: Promise
    ) {
        val schedule = JSONObject().apply {
            put("startHour", startHour)
            put("startMinute", startMinute)
            put("endHour", endHour)
            put("endMinute", endMinute)
            put("activeDays", activeDays)
        }
        getPrefs().edit().putString("schedule", schedule.toString()).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getSchedule(promise: Promise) {
        val scheduleJson = getPrefs().getString("schedule", null)
        if (scheduleJson == null) {
            promise.resolve(null)
        } else {
            val map = Arguments.createMap()
            val schedule = JSONObject(scheduleJson)
            map.putInt("startHour", schedule.optInt("startHour", 9))
            map.putInt("startMinute", schedule.optInt("startMinute", 0))
            map.putInt("endHour", schedule.optInt("endHour", 20))
            map.putInt("endMinute", schedule.optInt("endMinute", 0))
            map.putString("activeDays", schedule.optString("activeDays", "0,1,2,3,4,5,6"))
            promise.resolve(map)
        }
    }

    @ReactMethod
    fun getBlockedCallLog(promise: Promise) {
        val logJson = getPrefs().getString("blocked_log", "[]") ?: "[]"
        val logArray = JSONArray(logJson)
        val result = Arguments.createArray()
        for (i in 0 until logArray.length()) {
            val entry = logArray.getJSONObject(i)
            val map = Arguments.createMap()
            map.putString("number", entry.optString("number"))
            map.putDouble("timestamp", entry.optLong("timestamp").toDouble())
            result.pushMap(map)
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun clearBlockedCallLog(promise: Promise) {
        getPrefs().edit()
            .putString("blocked_log", "[]")
            .putInt("blocked_count", 0)
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun removeBlockedCallEntries(numbers: ReadableArray, promise: Promise) {
        val prefs = getPrefs()
        val logJson = prefs.getString("blocked_log", "[]") ?: "[]"
        val logArray = JSONArray(logJson)
        val numbersToRemove = mutableSetOf<String>()
        for (i in 0 until numbers.size()) {
            numbersToRemove.add(numbers.getString(i))
        }
        val newLog = JSONArray()
        for (i in 0 until logArray.length()) {
            val entry = logArray.getJSONObject(i)
            if (!numbersToRemove.contains(entry.optString("number"))) {
                newLog.put(entry)
            }
        }
        prefs.edit()
            .putString("blocked_log", newLog.toString())
            .putInt("blocked_count", newLog.length())
            .apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getBlockedCount(promise: Promise) {
        promise.resolve(getPrefs().getInt("blocked_count", 0))
    }

    @ReactMethod
    fun addToWhitelist(numbers: ReadableArray, promise: Promise) {
        val prefs = getPrefs()
        val existing = prefs.getString("whitelist", "[]") ?: "[]"
        val whitelistArray = JSONArray(existing)
        val existingSet = mutableSetOf<String>()
        for (i in 0 until whitelistArray.length()) {
            existingSet.add(whitelistArray.getString(i))
        }
        for (i in 0 until numbers.size()) {
            val num = numbers.getString(i)
            if (!existingSet.contains(num)) {
                whitelistArray.put(num)
                existingSet.add(num)
            }
        }
        prefs.edit().putString("whitelist", whitelistArray.toString()).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun removeFromWhitelist(numbers: ReadableArray, promise: Promise) {
        val prefs = getPrefs()
        val existing = prefs.getString("whitelist", "[]") ?: "[]"
        val whitelistArray = JSONArray(existing)
        val toRemove = mutableSetOf<String>()
        for (i in 0 until numbers.size()) {
            toRemove.add(numbers.getString(i))
        }
        val newList = JSONArray()
        for (i in 0 until whitelistArray.length()) {
            val num = whitelistArray.getString(i)
            if (!toRemove.contains(num)) {
                newList.put(num)
            }
        }
        prefs.edit().putString("whitelist", newList.toString()).apply()
        promise.resolve(true)
    }

    @ReactMethod
    fun getWhitelist(promise: Promise) {
        val existing = getPrefs().getString("whitelist", "[]") ?: "[]"
        val whitelistArray = JSONArray(existing)
        val result = Arguments.createArray()
        for (i in 0 until whitelistArray.length()) {
            result.pushString(whitelistArray.getString(i))
        }
        promise.resolve(result)
    }

    @ReactMethod
    fun requestCallScreeningRole(promise: Promise) {
        val activity = currentActivity
        if (activity == null) {
            promise.reject("NO_ACTIVITY", "No activity available")
            return
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = activity.getSystemService(Context.ROLE_SERVICE) as RoleManager
            if (roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING)) {
                if (!roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
                    val intent = roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING)
                    activity.startActivityForResult(intent, 1001)
                    promise.resolve("requested")
                } else {
                    promise.resolve("already_held")
                }
            } else {
                promise.reject("ROLE_UNAVAILABLE", "Call screening role not available")
            }
        } else {
            promise.reject("VERSION_LOW", "Requires Android 10+")
        }
    }

    @ReactMethod
    fun isCallScreeningRoleHeld(promise: Promise) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            val roleManager = reactApplicationContext.getSystemService(Context.ROLE_SERVICE) as RoleManager
            promise.resolve(roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING))
        } else {
            promise.resolve(false)
        }
    }
}
