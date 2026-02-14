import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TrustRingService, { Schedule } from '../services/TrustRingService';
import { COLORS, DAYS_OF_WEEK, DEFAULT_SCHEDULE } from '../constants';
import { formatTime } from '../utils/formatters';

export default function ScheduleScreen() {
  const [schedule, setSchedule] = useState<Schedule>(DEFAULT_SCHEDULE);
  const [activeDays, setActiveDays] = useState<number[]>([0, 1, 2, 3, 4, 5, 6]);

  useFocusEffect(
    useCallback(() => {
      loadSchedule();
    }, []),
  );

  const loadSchedule = async () => {
    const sched = await TrustRingService.getSchedule();
    if (sched) {
      setSchedule(sched);
      setActiveDays(
        sched.activeDays
          .split(',')
          .map(d => parseInt(d.trim(), 10))
          .filter(d => !isNaN(d)),
      );
    }
  };

  const adjustTime = (
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
    delta: number,
  ) => {
    setSchedule(prev => {
      const newSched = { ...prev };
      if (field.includes('Hour')) {
        newSched[field] = ((prev[field] + delta + 24) % 24);
      } else {
        newSched[field] = ((prev[field] + delta + 60) % 60);
      }
      return newSched;
    });
  };

  const toggleDay = (dayId: number) => {
    setActiveDays(prev => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) return prev; // Keep at least 1 day
        return prev.filter(d => d !== dayId);
      }
      return [...prev, dayId].sort();
    });
  };

  const saveSchedule = async () => {
    const toSave: Schedule = {
      ...schedule,
      activeDays: activeDays.join(','),
    };
    await TrustRingService.setSchedule(toSave);
    Alert.alert('Saved!', 'Your blocking schedule has been updated.');
  };

  const setPreset = (startH: number, endH: number) => {
    setSchedule(prev => ({
      ...prev,
      startHour: startH,
      startMinute: 0,
      endHour: endH,
      endMinute: 0,
    }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.sectionTitle}>⏰ Blocking Hours</Text>
      <Text style={styles.sectionSubtitle}>
        Unknown calls will be blocked during these hours
      </Text>

      {/* Time Picker */}
      <View style={styles.timeContainer}>
        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>From</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeAdjuster}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('startHour', 1)}>
                <Text style={styles.timeBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {schedule.startHour.toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('startHour', -1)}>
                <Text style={styles.timeBtnText}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeAdjuster}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('startMinute', 15)}>
                <Text style={styles.timeBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {schedule.startMinute.toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('startMinute', -15)}>
                <Text style={styles.timeBtnText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.timeAmPm}>
            {formatTime(schedule.startHour, schedule.startMinute)}
          </Text>
        </View>

        <View style={styles.timeArrow}>
          <Text style={styles.timeArrowText}>→</Text>
        </View>

        <View style={styles.timeBlock}>
          <Text style={styles.timeLabel}>To</Text>
          <View style={styles.timeRow}>
            <View style={styles.timeAdjuster}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('endHour', 1)}>
                <Text style={styles.timeBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {schedule.endHour.toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('endHour', -1)}>
                <Text style={styles.timeBtnText}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.timeSeparator}>:</Text>
            <View style={styles.timeAdjuster}>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('endMinute', 15)}>
                <Text style={styles.timeBtnText}>▲</Text>
              </TouchableOpacity>
              <Text style={styles.timeValue}>
                {schedule.endMinute.toString().padStart(2, '0')}
              </Text>
              <TouchableOpacity
                style={styles.timeBtn}
                onPress={() => adjustTime('endMinute', -15)}>
                <Text style={styles.timeBtnText}>▼</Text>
              </TouchableOpacity>
            </View>
          </View>
          <Text style={styles.timeAmPm}>
            {formatTime(schedule.endHour, schedule.endMinute)}
          </Text>
        </View>
      </View>

      {/* Quick Presets */}
      <Text style={styles.sectionTitle}>⚡ Quick Presets</Text>
      <View style={styles.presetsRow}>
        <TouchableOpacity
          style={styles.presetBtn}
          onPress={() => setPreset(9, 17)}>
          <Text style={styles.presetBtnText}>Work Hours</Text>
          <Text style={styles.presetBtnSub}>9 AM – 5 PM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetBtn}
          onPress={() => setPreset(9, 20)}>
          <Text style={styles.presetBtnText}>Day Time</Text>
          <Text style={styles.presetBtnSub}>9 AM – 8 PM</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.presetBtn}
          onPress={() => setPreset(22, 7)}>
          <Text style={styles.presetBtnText}>Night</Text>
          <Text style={styles.presetBtnSub}>10 PM – 7 AM</Text>
        </TouchableOpacity>
      </View>

      {/* Active Days */}
      <Text style={styles.sectionTitle}>📅 Active Days</Text>
      <View style={styles.daysRow}>
        {DAYS_OF_WEEK.map(day => (
          <TouchableOpacity
            key={day.id}
            style={[
              styles.dayBtn,
              activeDays.includes(day.id) && styles.dayBtnActive,
            ]}
            onPress={() => toggleDay(day.id)}>
            <Text
              style={[
                styles.dayBtnText,
                activeDays.includes(day.id) && styles.dayBtnTextActive,
              ]}>
              {day.short}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Save Button */}
      <TouchableOpacity style={styles.saveBtn} onPress={saveSchedule}>
        <Text style={styles.saveBtnText}>💾 Save Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
    marginTop: 16,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 16,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 20,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  timeBlock: { alignItems: 'center', flex: 1 },
  timeLabel: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 8,
    fontWeight: '600',
  },
  timeRow: { flexDirection: 'row', alignItems: 'center' },
  timeAdjuster: { alignItems: 'center' },
  timeBtn: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: COLORS.surfaceAlt,
  },
  timeBtnText: { fontSize: 14, color: COLORS.primary, fontWeight: '700' },
  timeValue: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.text,
    marginVertical: 4,
    minWidth: 44,
    textAlign: 'center',
  },
  timeSeparator: {
    fontSize: 32,
    fontWeight: '700',
    color: COLORS.textMuted,
    marginHorizontal: 2,
  },
  timeAmPm: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 6,
  },
  timeArrow: { marginHorizontal: 12, paddingTop: 20 },
  timeArrowText: { fontSize: 24, color: COLORS.textMuted },
  presetsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 10,
  },
  presetBtn: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  presetBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.primary,
  },
  presetBtnSub: {
    fontSize: 11,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
    justifyContent: 'center',
  },
  dayBtn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.border,
  },
  dayBtnActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayBtnText: { fontSize: 12, fontWeight: '700', color: COLORS.textSecondary },
  dayBtnTextActive: { color: COLORS.white },
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    marginTop: 30,
    elevation: 3,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
  },
});
