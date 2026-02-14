import React, {useState, useCallback, useRef, useEffect} from 'react';
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
  Easing,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService from '../services/TrustRingService';
import {COLORS, DEFAULT_SCHEDULE} from '../constants';
import {formatTime} from '../utils/formatters';
import {requestAllPermissions, checkPermissions} from '../utils/permissions';

export default function HomeScreen() {
  const [isEnabled, setIsEnabled] = useState(false);
  const [hasRole, setHasRole] = useState(false);
  const [blockedCount, setBlockedCount] = useState(0);
  const [whitelistCount, setWhitelistCount] = useState(0);
  const [schedule, setSchedule] = useState(DEFAULT_SCHEDULE);
  const [permissions, setPermissions] = useState({
    contacts: false,
    phone: false,
    callLog: false,
  });
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (isEnabled) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.05,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulse.start();
      return () => pulse.stop();
    } else {
      pulseAnim.setValue(1);
    }
  }, [isEnabled, pulseAnim]);

  const loadData = useCallback(async () => {
    try {
      const [enabled, roleHeld, count, sched, perms, wl] = await Promise.all([
        TrustRingService.isBlockingEnabled(),
        TrustRingService.isCallScreeningRoleHeld(),
        TrustRingService.getBlockedCount(),
        TrustRingService.getSchedule(),
        checkPermissions(),
        TrustRingService.getWhitelist(),
      ]);
      setIsEnabled(enabled);
      setHasRole(roleHeld);
      setBlockedCount(count);
      if (sched) {
        setSchedule(sched);
      }
      setPermissions(perms);
      setWhitelistCount(wl.length);
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
        'TrustRing needs to be set as your Call Screening app to block calls.',
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
          'Contacts Permission',
          'TrustRing needs contacts access to identify known callers.',
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

      {/* Big Shield - main toggle */}
      <Animated.View
        style={[styles.shieldSection, {transform: [{scale: pulseAnim}]}]}>
        <View
          style={[
            styles.shieldCircle,
            isEnabled ? styles.shieldActive : styles.shieldInactive,
          ]}>
          <Text style={styles.shieldEmoji}>{isEnabled ? '🛡️' : '🔓'}</Text>
        </View>
      </Animated.View>

      <View style={styles.statusSection}>
        <Text style={styles.statusTitle}>
          {isEnabled ? 'Protection Active' : 'Protection Off'}
        </Text>
        <Text style={styles.statusSubtitle}>
          {isEnabled
            ? scheduleActive
              ? 'Blocking unknown callers'
              : 'Outside schedule window'
            : 'Enable to start blocking'}
        </Text>
        <View style={styles.toggleRow}>
          <Switch
            value={isEnabled}
            onValueChange={toggleBlocking}
            trackColor={{
              false: COLORS.border,
              true: 'rgba(0,212,170,0.4)',
            }}
            thumbColor={isEnabled ? '#00D4AA' : '#E2E8F0'}
            style={styles.mainSwitch}
          />
        </View>
      </View>

      {/* Status pill */}
      {isEnabled && (
        <View
          style={[
            styles.statusPill,
            scheduleActive ? styles.statusPillActive : styles.statusPillWaiting,
          ]}>
          <View
            style={[
              styles.statusDot,
              scheduleActive ? styles.dotActive : styles.dotWaiting,
            ]}
          />
          <Text
            style={[
              styles.statusPillText,
              scheduleActive
                ? styles.statusPillTextActive
                : styles.statusPillTextWaiting,
            ]}>
            {scheduleActive ? 'In Schedule' : 'Outside Schedule'}
          </Text>
        </View>
      )}

      {/* Quick stats grid */}
      <View style={styles.statsGrid}>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>🚫</Text>
          <Text style={styles.statValue}>{blockedCount}</Text>
          <Text style={styles.statDesc}>Blocked</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>✅</Text>
          <Text style={styles.statValue}>{whitelistCount}</Text>
          <Text style={styles.statDesc}>Unblocked</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>🕐</Text>
          <Text style={styles.statValue}>
            {formatTime(schedule.startHour, schedule.startMinute)}
          </Text>
          <Text style={styles.statDesc}>From</Text>
        </View>
        <View style={styles.statTile}>
          <Text style={styles.statEmoji}>🕐</Text>
          <Text style={styles.statValue}>
            {formatTime(schedule.endHour, schedule.endMinute)}
          </Text>
          <Text style={styles.statDesc}>To</Text>
        </View>
      </View>

      {/* How it works card */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>How TrustRing works</Text>
        {[
          {icon: '📖', text: 'Reads your contacts list'},
          {icon: '📞', text: 'Screens every incoming call'},
          {icon: '🚫', text: 'Blocks numbers not in contacts'},
          {icon: '✓', text: 'You can unblock numbers anytime'},
        ].map((step, i) => (
          <View key={i} style={styles.infoRow}>
            <Text style={styles.infoRowIcon}>{step.icon}</Text>
            <Text style={styles.infoRowText}>{step.text}</Text>
          </View>
        ))}
      </View>

      {/* Permission alert */}
      {!hasRole && (
        <TouchableOpacity
          style={styles.alertCard}
          onPress={async () => {
            await TrustRingService.requestCallScreeningRole();
            loadData();
          }}
          activeOpacity={0.8}>
          <Text style={styles.alertEmoji}>⚠️</Text>
          <View style={styles.alertTextWrap}>
            <Text style={styles.alertTitle}>Setup Required</Text>
            <Text style={styles.alertDesc}>
              Tap to set TrustRing as call screener
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

  // Shield
  shieldSection: {
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 8,
  },
  shieldCircle: {
    width: 110,
    height: 110,
    borderRadius: 55,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 8,
    shadowColor: COLORS.primary,
    shadowOffset: {width: 0, height: 6},
    shadowOpacity: 0.3,
    shadowRadius: 16,
  },
  shieldActive: {backgroundColor: '#0C4A6E'},
  shieldInactive: {backgroundColor: '#475569'},
  shieldEmoji: {fontSize: 48},

  // Status text
  statusSection: {alignItems: 'center', marginBottom: 16},
  statusTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  statusSubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    marginBottom: 14,
  },
  toggleRow: {
    alignItems: 'center',
  },
  mainSwitch: {transform: [{scaleX: 1.3}, {scaleY: 1.3}]},

  // Status pill
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 24,
    marginBottom: 20,
  },
  statusPillActive: {backgroundColor: 'rgba(0,212,170,0.12)'},
  statusPillWaiting: {backgroundColor: 'rgba(245,158,11,0.12)'},
  statusDot: {width: 8, height: 8, borderRadius: 4, marginRight: 8},
  dotActive: {backgroundColor: '#00D4AA'},
  dotWaiting: {backgroundColor: '#F59E0B'},
  statusPillText: {fontSize: 13, fontWeight: '700'},
  statusPillTextActive: {color: '#00D4AA'},
  statusPillTextWaiting: {color: '#F59E0B'},

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statTile: {
    width: '48%' as any,
    flexGrow: 1,
    flexBasis: '45%',
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 16,
    alignItems: 'center',
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  statEmoji: {fontSize: 22, marginBottom: 8},
  statValue: {
    fontSize: 18,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 2,
  },
  statDesc: {fontSize: 11, color: COLORS.textMuted, fontWeight: '500'},

  // Info card
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 18,
    padding: 20,
    marginBottom: 16,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 14,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoRowIcon: {fontSize: 18, marginRight: 12, width: 28, textAlign: 'center'},
  infoRowText: {fontSize: 14, color: COLORS.textSecondary, flex: 1},

  // Alert
  alertCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(245,158,11,0.08)',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(245,158,11,0.15)',
  },
  alertEmoji: {fontSize: 24, marginRight: 14},
  alertTextWrap: {flex: 1},
  alertTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#92400E',
    marginBottom: 2,
  },
  alertDesc: {fontSize: 12, color: '#A16207'},
  alertArrow: {fontSize: 28, color: '#A16207', fontWeight: '300'},
});
