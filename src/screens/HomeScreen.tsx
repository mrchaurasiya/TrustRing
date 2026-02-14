import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
  StatusBar,
  Animated,
  Dimensions,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService from '../services/TrustRingService';
import {COLORS, DEFAULT_SCHEDULE} from '../constants';
import {formatTime} from '../utils/formatters';
import {requestAllPermissions, checkPermissions} from '../utils/permissions';

const {width} = Dimensions.get('window');

export default function HomeScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasRole, setHasRole] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [permissions, setPermissions] = useState({
    contacts: false,
    phone: false,
    callLog: false,
  });

  const loadData = useCallback(async () => {
    try {
      const [enabled, roleHeld, count, sched, perms] = await Promise.all([
        TrustRingService.isBlockingEnabled(),
        TrustRingService.isCallScreeningRoleHeld(),
        TrustRingService.getBlockedCount(),
        TrustRingService.getSchedule(),
        checkPermissions(),
      ]);
      setIsEnabled(enabled);
      setHasRole(roleHeld);
      setBlockedCount(count);
      if (sched) setSchedule(sched);
      setPermissions(perms);
    } catch (e) {
      console.warn('Failed to load data:', e);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData]),
  );

  const toggleBlocking = async (value: boolean) => {
    if (value && !hasRole) {
      Alert.alert(
        'Permission Required',
        'TrustRing needs to be set as your Call Screening app to block calls. Grant this permission?',
        [
          {text: 'Cancel', style: 'cancel'},
          {
            text: 'Grant',
            onPress: async () => {
              await TrustRingService.requestCallScreeningRole();
              loadData();
            },
          },
        ],
      );
      return;
    }
    if (value && !permissions.contacts) {
      const result = await requestAllPermissions();
      setPermissions(result);
      if (!result.contacts) {
        Alert.alert(
          'Contacts Permission Required',
          'TrustRing needs access to your contacts to identify known callers.',
        );
        return;
      }
    }
    await TrustRingService.setBlockingEnabled(value);
    setIsEnabled(value);
  };

  const isScheduleActive = () => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = schedule.startHour * 60 + schedule.startMinute;
    const endMinutes = schedule.endHour * 60 + schedule.endMinute;
    if (startMinutes <= endMinutes) {
      return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
    } else {
      return currentMinutes >= startMinutes || currentMinutes <= endMinutes;
    }
  };

  const scheduleActive = isScheduleActive();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.headerGradientStart}
      />

      {/* Hero Status Card */}
      <View
        style={[
          styles.heroCard,
          isEnabled ? styles.heroActive : styles.heroInactive,
        ]}>
        <View style={styles.heroGlowCircle} />
        <View style={styles.heroContent}>
          <View style={styles.heroTop}>
            <View style={styles.heroIconBg}>
              <Text style={styles.heroIcon}>{isEnabled ? '🛡️' : '🔓'}</Text>
            </View>
            <Switch
              value={isEnabled}
              onValueChange={toggleBlocking}
              trackColor={{
                false: 'rgba(255,255,255,0.2)',
                true: 'rgba(0,212,170,0.4)',
              }}
              thumbColor={isEnabled ? '#00D4AA' : '#E2E8F0'}
              style={styles.heroSwitch}
            />
          </View>
          <Text style={styles.heroTitle}>
            {isEnabled ? 'Protection Active' : 'Protection Off'}
          </Text>
          <Text style={styles.heroSubtitle}>
            {isEnabled
              ? scheduleActive
                ? 'Blocking unknown callers now'
                : 'Waiting for schedule window'
              : 'Tap the switch to enable protection'}
          </Text>
          {isEnabled && (
            <View
              style={[
                styles.heroBadge,
                scheduleActive
                  ? styles.heroBadgeActive
                  : styles.heroBadgeWaiting,
              ]}>
              <View
                style={[
                  styles.heroDot,
                  scheduleActive ? styles.heroDotActive : styles.heroDotWaiting,
                ]}
              />
              <Text
                style={[
                  styles.heroBadgeText,
                  scheduleActive
                    ? styles.heroBadgeTextActive
                    : styles.heroBadgeTextWaiting,
                ]}>
                {scheduleActive ? 'In Schedule' : 'Outside Schedule'}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <View
            style={[styles.statIconBg, {backgroundColor: COLORS.dangerLight}]}>
            <Text style={styles.statIcon}>🚫</Text>
          </View>
          <Text style={styles.statNumber}>{blockedCount}</Text>
          <Text style={styles.statLabel}>Blocked</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[styles.statIconBg, {backgroundColor: COLORS.primaryGlow}]}>
            <Text style={styles.statIcon}>🌙</Text>
          </View>
          <Text style={styles.statNumber}>
            {formatTime(schedule.startHour, schedule.startMinute)}
          </Text>
          <Text style={styles.statLabel}>Start</Text>
        </View>
        <View style={styles.statCard}>
          <View
            style={[styles.statIconBg, {backgroundColor: COLORS.accentGlow}]}>
            <Text style={styles.statIcon}>☀️</Text>
          </View>
          <Text style={styles.statNumber}>
            {formatTime(schedule.endHour, schedule.endMinute)}
          </Text>
          <Text style={styles.statLabel}>End</Text>
        </View>
      </View>

      {/* Schedule Preview */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>📅</Text>
          <Text style={styles.sectionTitle}>Active Schedule</Text>
        </View>
        <View style={styles.scheduleBar}>
          <View style={styles.scheduleBarTrack}>
            <View
              style={[
                styles.scheduleBarFill,
                scheduleActive && styles.scheduleBarFillActive,
              ]}
            />
          </View>
        </View>
        <Text style={styles.scheduleText}>
          {formatTime(schedule.startHour, schedule.startMinute)}
          {'  →  '}
          {formatTime(schedule.endHour, schedule.endMinute)}
        </Text>
      </View>

      {/* How it Works */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionIcon}>✨</Text>
          <Text style={styles.sectionTitle}>How It Works</Text>
        </View>
        {[
          {
            num: '1',
            text: 'Reads your phonebook contacts',
            color: COLORS.primary,
          },
          {
            num: '2',
            text: 'Checks incoming calls against contacts',
            color: COLORS.primaryDark,
          },
          {
            num: '3',
            text: 'Silently blocks unknown numbers',
            color: COLORS.danger,
          },
          {
            num: '4',
            text: 'Logs every blocked call for review',
            color: COLORS.accent,
          },
        ].map((step, i) => (
          <View key={i} style={styles.stepRow}>
            <View style={[styles.stepNum, {backgroundColor: step.color}]}>
              <Text style={styles.stepNumText}>{step.num}</Text>
            </View>
            <Text style={styles.stepText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Permission Banner */}
      {!hasRole && (
        <TouchableOpacity
          style={styles.alertBanner}
          onPress={async () => {
            await TrustRingService.requestCallScreeningRole();
            loadData();
          }}
          activeOpacity={0.8}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Action Required</Text>
            <Text style={styles.alertDesc}>
              Tap to set TrustRing as your call screener
            </Text>
          </View>
          <Text style={styles.alertArrow}>›</Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},
  content: {padding: 20, paddingBottom: 40},

  // Hero
  heroCard: {
    borderRadius: 24,
    padding: 28,
    marginBottom: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 8},
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  heroActive: {backgroundColor: '#0C4A6E'},
  heroInactive: {backgroundColor: '#334155'},
  heroGlowCircle: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(0,212,170,0.08)',
  },
  heroContent: {position: 'relative'},
  heroTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  heroIconBg: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroIcon: {fontSize: 28},
  heroSwitch: {transform: [{scaleX: 1.1}, {scaleY: 1.1}]},
  heroTitle: {
    fontSize: 26,
    fontWeight: '800',
    color: COLORS.white,
    marginBottom: 6,
    letterSpacing: -0.5,
  },
  heroSubtitle: {
    fontSize: 14,
    color: 'rgba(226,232,240,0.7)',
    marginBottom: 16,
    lineHeight: 20,
  },
  heroBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 20,
  },
  heroBadgeActive: {backgroundColor: 'rgba(0,212,170,0.15)'},
  heroBadgeWaiting: {backgroundColor: 'rgba(245,158,11,0.15)'},
  heroDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  heroDotActive: {backgroundColor: '#00D4AA'},
  heroDotWaiting: {backgroundColor: '#F59E0B'},
  heroBadgeText: {fontSize: 13, fontWeight: '600'},
  heroBadgeTextActive: {color: '#00D4AA'},
  heroBadgeTextWaiting: {color: '#F59E0B'},

  // Stats
  statsRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 20,
    padding: 16,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 2},
    shadowOpacity: 0.06,
    shadowRadius: 8,
  },
  statIconBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  statIcon: {fontSize: 18},
  statNumber: {
    fontSize: 16,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  statLabel: {fontSize: 11, color: COLORS.textMuted, fontWeight: '500'},

  // Section Card
  sectionCard: {
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
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIcon: {fontSize: 18, marginRight: 10},
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
  },

  // Schedule
  scheduleBar: {marginBottom: 12},
  scheduleBarTrack: {
    height: 6,
    backgroundColor: COLORS.borderLight,
    borderRadius: 3,
    overflow: 'hidden',
  },
  scheduleBarFill: {
    height: '100%',
    width: '30%',
    backgroundColor: COLORS.textMuted,
    borderRadius: 3,
  },
  scheduleBarFillActive: {
    backgroundColor: COLORS.accent,
    width: '70%',
  },
  scheduleText: {
    fontSize: 15,
    color: COLORS.textSecondary,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 1,
  },

  // Steps
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  stepNum: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  stepNumText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  stepText: {
    flex: 1,
    fontSize: 14,
    color: COLORS.textSecondary,
    lineHeight: 20,
  },

  // Alert Banner
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.warningLight,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.2)',
  },
  alertIcon: {fontSize: 24, marginRight: 14},
  alertContent: {flex: 1},
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  alertDesc: {
    fontSize: 12,
    color: '#A16207',
  },
  alertArrow: {
    fontSize: 28,
    color: '#A16207',
    fontWeight: '300',
  },
});
