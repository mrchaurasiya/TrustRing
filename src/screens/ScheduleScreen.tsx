import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService, {Schedule} from '../services/TrustRingService';
import {COLORS, DAYS_OF_WEEK, DEFAULT_SCHEDULE} from '../constants';
import {formatTime} from '../utils/formatters';
const TimeAdjuster = ({
  label,
  hourField,
  minuteField,
  schedule,
  adjustTime,
}: {
  label: string;
  hourField: 'startHour' | 'endHour';
  minuteField: 'startMinute' | 'endMinute';
  schedule: Schedule;
  adjustTime: (
    field: 'startHour' | 'startMinute' | 'endHour' | 'endMinute',
    delta: number,
  ) => void;
}) => (
  <View style={styles.timeBlock}>
    <Text style={styles.timeLabel}>{label}</Text>
    <View style={styles.timeDisplay}>
      <View style={styles.timeColumn}>
        <TouchableOpacity
          style={styles.timeArrowBtn}
          onPress={() => adjustTime(hourField, 1)}
          activeOpacity={0.6}>
          <Text style={styles.timeArrowText}>{'▲'}</Text>
        </TouchableOpacity>
        <Text style={styles.timeDigit}>
          {schedule[hourField].toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity
          style={styles.timeArrowBtn}
          onPress={() => adjustTime(hourField, -1)}
          activeOpacity={0.6}>
          <Text style={styles.timeArrowText}>{'▼'}</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.timeColon}>:</Text>
      <View style={styles.timeColumn}>
        <TouchableOpacity
          style={styles.timeArrowBtn}
          onPress={() => adjustTime(minuteField, 15)}
          activeOpacity={0.6}>
          <Text style={styles.timeArrowText}>{'▲'}</Text>
        </TouchableOpacity>
        <Text style={styles.timeDigit}>
          {schedule[minuteField].toString().padStart(2, '0')}
        </Text>
        <TouchableOpacity
          style={styles.timeArrowBtn}
          onPress={() => adjustTime(minuteField, -15)}
          activeOpacity={0.6}>
          <Text style={styles.timeArrowText}>{'▼'}</Text>
        </TouchableOpacity>
      </View>
    </View>
    <Text style={styles.timeFormatted}>
      {formatTime(schedule[hourField], schedule[minuteField])}
    </Text>
  </View>
);
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
      const newSched = {...prev};
      if (field.includes('Hour')) {
        newSched[field] = (prev[field] + delta + 24) % 24;
      } else {
        newSched[field] = (prev[field] + delta + 60) % 60;
      }
      return newSched;
    });
  };

  const toggleDay = (dayId: number) => {
    setActiveDays(prev => {
      if (prev.includes(dayId)) {
        if (prev.length === 1) {
          return prev;
        }
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
    Alert.alert('Schedule Saved', 'Your blocking schedule has been updated.');
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
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.headerGradientStart}
      />

      {/* Time Picker Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>⏰</Text>
          <View>
            <Text style={styles.cardTitle}>Blocking Hours</Text>
            <Text style={styles.cardSubtitle}>
              Unknown calls blocked during this window
            </Text>
          </View>
        </View>

        <View style={styles.timeContainer}>
          <TimeAdjuster
            label="FROM"
            hourField="startHour"
            minuteField="startMinute"
            schedule={schedule}
            adjustTime={adjustTime}
          />
          <View style={styles.timeArrowCenter}>
            <View style={styles.arrowLine} />
            <Text style={styles.arrowIcon}>→</Text>
            <View style={styles.arrowLine} />
          </View>
          <TimeAdjuster
            label="TO"
            hourField="endHour"
            minuteField="endMinute"
            schedule={schedule}
            adjustTime={adjustTime}
          />
        </View>
      </View>

      {/* Quick Presets */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>⚡</Text>
          <Text style={styles.cardTitle}>Quick Presets</Text>
        </View>
        <View style={styles.presetsGrid}>
          {[
            {
              label: 'Work',
              sub: '9 AM – 5 PM',
              startH: 9,
              endH: 17,
              icon: '💼',
            },
            {
              label: 'Daytime',
              sub: '9 AM – 8 PM',
              startH: 9,
              endH: 20,
              icon: '☀️',
            },
            {
              label: 'Night',
              sub: '10 PM – 7 AM',
              startH: 22,
              endH: 7,
              icon: '🌙',
            },
            {
              label: 'All Day',
              sub: '12 AM – 12 AM',
              startH: 0,
              endH: 23,
              icon: '🔒',
            },
          ].map((preset, i) => (
            <TouchableOpacity
              key={i}
              style={styles.presetCard}
              onPress={() => setPreset(preset.startH, preset.endH)}
              activeOpacity={0.7}>
              <Text style={styles.presetIcon}>{preset.icon}</Text>
              <Text style={styles.presetLabel}>{preset.label}</Text>
              <Text style={styles.presetSub}>{preset.sub}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* Active Days */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>📅</Text>
          <View>
            <Text style={styles.cardTitle}>Active Days</Text>
            <Text style={styles.cardSubtitle}>
              {activeDays.length === 7
                ? 'Every day'
                : `${activeDays.length} days selected`}
            </Text>
          </View>
        </View>
        <View style={styles.daysRow}>
          {DAYS_OF_WEEK.map(day => {
            const isActive = activeDays.includes(day.id);
            return (
              <TouchableOpacity
                key={day.id}
                style={[styles.dayChip, isActive && styles.dayChipActive]}
                onPress={() => toggleDay(day.id)}
                activeOpacity={0.7}>
                <Text
                  style={[
                    styles.dayChipText,
                    isActive && styles.dayChipTextActive,
                  ]}>
                  {day.short}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveBtn}
        onPress={saveSchedule}
        activeOpacity={0.8}>
        <Text style={styles.saveBtnText}>Save Schedule</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {padding: 20, paddingBottom: 40},

  // Card
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 20,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 18,
  },
  cardIcon: {fontSize: 20, marginRight: 12},
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },
  cardSubtitle: {
    fontSize: 12,
    color: COLORS.textMuted,
    marginTop: 2,
  },

  // Time Picker
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  timeBlock: {alignItems: 'center', flex: 1},
  timeLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: COLORS.primary,
    letterSpacing: 1.5,
    marginBottom: 12,
  },
  timeDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 16,
    padding: 8,
  },
  timeColumn: {alignItems: 'center'},
  timeArrowBtn: {
    width: 36,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
  },
  timeArrowText: {
    fontSize: 12,
    color: COLORS.primary,
    fontWeight: '700',
  },
  timeDigit: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.text,
    minWidth: 48,
    textAlign: 'center',
    letterSpacing: -1,
  },
  timeColon: {
    fontSize: 36,
    fontWeight: '800',
    color: COLORS.textMuted,
    marginHorizontal: 2,
    marginBottom: 2,
  },
  timeFormatted: {
    fontSize: 13,
    color: COLORS.primary,
    fontWeight: '600',
    marginTop: 10,
  },
  timeArrowCenter: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 24,
    width: 50,
  },
  arrowLine: {
    width: 1,
    height: 0,
  },
  arrowIcon: {
    fontSize: 22,
    color: COLORS.textMuted,
    fontWeight: '300',
  },

  // Presets
  presetsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  presetCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: COLORS.background,
    borderRadius: 14,
    padding: 14,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: COLORS.borderLight,
  },
  presetIcon: {fontSize: 22, marginBottom: 6},
  presetLabel: {
    fontSize: 13,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 2,
  },
  presetSub: {
    fontSize: 11,
    color: COLORS.textMuted,
  },

  // Days
  daysRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
  dayChip: {
    width: 42,
    height: 42,
    borderRadius: 14,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  dayChipActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  dayChipText: {
    fontSize: 12,
    fontWeight: '700',
    color: COLORS.textMuted,
  },
  dayChipTextActive: {color: COLORS.white},

  // Save
  saveBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 8,
    elevation: 6,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.35,
    shadowRadius: 12,
  },
  saveBtnText: {
    color: COLORS.white,
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});
