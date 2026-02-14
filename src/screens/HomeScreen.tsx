import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Switch,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TrustRingService from '../services/TrustRingService';
import { COLORS, DEFAULT_SCHEDULE } from '../constants';
import { formatTime } from '../utils/formatters';
import { requestAllPermissions, checkPermissions } from '../utils/permissions';

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
          { text: 'Cancel', style: 'cancel' },
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
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const scheduleActive = isScheduleActive();

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Status Card */}
      <View
        style={[
          styles.statusCard,
          isEnabled ? styles.statusCardActive : styles.statusCardInactive,
        ]}>
        <View style={styles.statusHeader}>
          <Text style={styles.statusEmoji}>
            {isEnabled ? '🛡️' : '🔓'}
          </Text>
          <View style={styles.statusInfo}>
            <Text style={styles.statusTitle}>
              {isEnabled ? 'Protection Active' : 'Protection Off'}
            </Text>
            <Text style={styles.statusSubtitle}>
              {isEnabled
                ? scheduleActive
                  ? 'Currently blocking unknown callers'
                  : 'Outside scheduled hours'
                : 'Unknown callers can reach you'}
            </Text>
          </View>
        </View>
        <Switch
          value={isEnabled}
          onValueChange={toggleBlocking}
          trackColor={{ false: '#D1D5DB', true: COLORS.primaryLight }}
          thumbColor={isEnabled ? COLORS.white : '#F3F4F6'}
        />
      </View>

      {/* Stats Row */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{blockedCount}</Text>
          <Text style={styles.statLabel}>Calls Blocked</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {formatTime(schedule.startHour, schedule.startMinute)}
          </Text>
          <Text style={styles.statLabel}>Start Time</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {formatTime(schedule.endHour, schedule.endMinute)}
          </Text>
          <Text style={styles.statLabel}>End Time</Text>
        </View>
      </View>

      {/* Schedule Status */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>📅 Schedule</Text>
        <Text style={styles.infoText}>
          Blocking active from{' '}
          <Text style={styles.bold}>
            {formatTime(schedule.startHour, schedule.startMinute)}
          </Text>{' '}
          to{' '}
          <Text style={styles.bold}>
            {formatTime(schedule.endHour, schedule.endMinute)}
          </Text>
        </Text>
        <View
          style={[
            styles.scheduleStatus,
            scheduleActive
              ? styles.scheduleStatusActive
              : styles.scheduleStatusInactive,
          ]}>
          <Text
            style={[
              styles.scheduleStatusText,
              scheduleActive
                ? styles.scheduleStatusTextActive
                : styles.scheduleStatusTextInactive,
            ]}>
            {scheduleActive ? '● Currently in schedule' : '○ Outside schedule'}
          </Text>
        </View>
      </View>

      {/* How it works */}
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>💡 How TrustRing Works</Text>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksNumber}>1</Text>
          <Text style={styles.howItWorksText}>
            Reads your phonebook contacts
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksNumber}>2</Text>
          <Text style={styles.howItWorksText}>
            When a call comes in, checks if the number is in your contacts
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksNumber}>3</Text>
          <Text style={styles.howItWorksText}>
            If unknown and within schedule, the call is silently blocked
          </Text>
        </View>
        <View style={styles.howItWorksItem}>
          <Text style={styles.howItWorksNumber}>4</Text>
          <Text style={styles.howItWorksText}>
            All blocked calls are logged for your review
          </Text>
        </View>
      </View>

      {/* Permission Status */}
      {!hasRole && (
        <TouchableOpacity
          style={styles.permissionBanner}
          onPress={async () => {
            await TrustRingService.requestCallScreeningRole();
            loadData();
          }}>
          <Text style={styles.permissionBannerText}>
            ⚠️ Tap to set TrustRing as your call screener
          </Text>
        </TouchableOpacity>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 32 },
  statusCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 20,
    borderRadius: 16,
    marginBottom: 16,
    elevation: 3,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statusCardActive: { backgroundColor: COLORS.primary },
  statusCardInactive: { backgroundColor: COLORS.surface },
  statusHeader: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  statusEmoji: { fontSize: 36, marginRight: 14 },
  statusInfo: { flex: 1 },
  statusTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.white,
    marginBottom: 2,
  },
  statusSubtitle: { fontSize: 13, color: 'rgba(255,255,255,0.8)' },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  statNumber: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  statLabel: { fontSize: 11, color: COLORS.textSecondary },
  infoCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 10,
  },
  infoText: { fontSize: 14, color: COLORS.textSecondary, lineHeight: 20 },
  bold: { fontWeight: '700', color: COLORS.text },
  scheduleStatus: {
    marginTop: 10,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  scheduleStatusActive: { backgroundColor: '#DCFCE7' },
  scheduleStatusInactive: { backgroundColor: '#FEF3C7' },
  scheduleStatusText: { fontSize: 13, fontWeight: '600' },
  scheduleStatusTextActive: { color: '#16A34A' },
  scheduleStatusTextInactive: { color: '#D97706' },
  howItWorksItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  howItWorksNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: COLORS.primaryLight,
    color: COLORS.white,
    textAlign: 'center',
    lineHeight: 24,
    fontSize: 13,
    fontWeight: '700',
    marginRight: 10,
    overflow: 'hidden',
  },
  howItWorksText: { flex: 1, fontSize: 14, color: COLORS.textSecondary, lineHeight: 21 },
  permissionBanner: {
    backgroundColor: '#FEF3C7',
    padding: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  permissionBannerText: {
    color: '#92400E',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
});
