import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Linking,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService from '../services/TrustRingService';
import {checkPermissions, requestAllPermissions} from '../utils/permissions';
import {COLORS} from '../constants';

const PermissionRow = ({
  label,
  granted,
  icon,
}: {
  label: string;
  granted: boolean;
  icon: string;
}) => (
  <View style={styles.permRow}>
    <View style={styles.permIconWrap}>
      <Text style={styles.permIcon}>{icon}</Text>
    </View>
    <Text style={styles.permLabel}>{label}</Text>
    <View
      style={[
        styles.permBadge,
        granted ? styles.permBadgeGranted : styles.permBadgeDenied,
      ]}>
      <Text
        style={[
          styles.permBadgeText,
          granted ? styles.permBadgeTextGranted : styles.permBadgeTextDenied,
        ]}>
        {granted ? '✓ Granted' : 'Required'}
      </Text>
    </View>
  </View>
);

export default function SettingsScreen() {
  const [hasRole, setHasRole] = useState(false);
  const [permissions, setPermissions] = useState({
    contacts: false,
    phone: false,
    callLog: false,
  });

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, []),
  );

  const loadSettings = async () => {
    const [roleHeld, perms] = await Promise.all([
      TrustRingService.isCallScreeningRoleHeld(),
      checkPermissions(),
    ]);
    setHasRole(roleHeld);
    setPermissions(perms);
  };

  const handleRequestRole = async () => {
    const result = await TrustRingService.requestCallScreeningRole();
    if (result === 'already_held') {
      Alert.alert(
        'Already Set',
        'TrustRing is already your call screening app.',
      );
    }
    loadSettings();
  };

  const handleRequestPermissions = async () => {
    const result = await requestAllPermissions();
    setPermissions(result);
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

      {/* Call Screening Role */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🔑</Text>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Call Screening Role</Text>
            <Text style={styles.cardSubtitle}>
              Required to block incoming calls
            </Text>
          </View>
        </View>
        <View
          style={[
            styles.roleStatus,
            hasRole ? styles.roleStatusOk : styles.roleStatusWarn,
          ]}>
          <Text style={styles.roleStatusEmoji}>{hasRole ? '✅' : '⚠️'}</Text>
          <Text
            style={[
              styles.roleStatusText,
              hasRole ? styles.roleStatusTextOk : styles.roleStatusTextWarn,
            ]}>
            {hasRole
              ? 'TrustRing is your call screening app'
              : 'Not set as call screening app'}
          </Text>
        </View>
        {!hasRole && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRequestRole}
            activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Set as Default</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Permissions */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardIcon}>🔐</Text>
          <View style={styles.cardHeaderText}>
            <Text style={styles.cardTitle}>Permissions</Text>
            <Text style={styles.cardSubtitle}>
              Required for TrustRing to work
            </Text>
          </View>
        </View>
        <View style={styles.permList}>
          <PermissionRow
            label="Contacts"
            granted={permissions.contacts}
            icon="👥"
          />
          <PermissionRow
            label="Phone State"
            granted={permissions.phone}
            icon="📞"
          />
          <PermissionRow
            label="Call Log"
            granted={permissions.callLog}
            icon="📋"
          />
        </View>
        {(!permissions.contacts ||
          !permissions.phone ||
          !permissions.callLog) && (
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={handleRequestPermissions}
            activeOpacity={0.8}>
            <Text style={styles.actionBtnText}>Grant Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* About */}
      <View style={styles.card}>
        <View style={styles.aboutSection}>
          <View style={styles.aboutIconBg}>
            <Text style={styles.aboutIcon}>🛡️</Text>
          </View>
          <Text style={styles.aboutName}>TrustRing</Text>
          <Text style={styles.aboutVersion}>Version 2.0.0</Text>
          <View style={styles.aboutDivider} />
          <Text style={styles.aboutDesc}>
            Block calls from numbers not in your phonebook during scheduled
            hours. Only your trusted circle gets through.
          </Text>
        </View>
      </View>

      {/* System Settings */}
      <TouchableOpacity
        style={styles.systemBtn}
        onPress={() => Linking.openSettings()}
        activeOpacity={0.7}>
        <Text style={styles.systemBtnIcon}>⚙️</Text>
        <Text style={styles.systemBtnText}>Open System Settings</Text>
        <Text style={styles.systemBtnArrow}>›</Text>
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
    marginBottom: 16,
  },
  cardIcon: {fontSize: 22, marginRight: 14},
  cardHeaderText: {flex: 1},
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

  // Role Status
  roleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 14,
    marginBottom: 4,
  },
  roleStatusOk: {backgroundColor: COLORS.successLight},
  roleStatusWarn: {backgroundColor: COLORS.warningLight},
  roleStatusEmoji: {fontSize: 20, marginRight: 12},
  roleStatusText: {fontSize: 13, fontWeight: '600', flex: 1},
  roleStatusTextOk: {color: '#065F46'},
  roleStatusTextWarn: {color: '#92400E'},

  // Action Button
  actionBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: 'center',
    marginTop: 12,
  },
  actionBtnText: {
    color: COLORS.white,
    fontWeight: '700',
    fontSize: 14,
  },

  // Permissions
  permList: {
    backgroundColor: COLORS.background,
    borderRadius: 14,
    overflow: 'hidden',
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.borderLight,
  },
  permIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: COLORS.surface,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  permIcon: {fontSize: 18},
  permLabel: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  permBadge: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 8,
  },
  permBadgeGranted: {backgroundColor: COLORS.successLight},
  permBadgeDenied: {backgroundColor: COLORS.dangerLight},
  permBadgeText: {fontSize: 12, fontWeight: '700'},
  permBadgeTextGranted: {color: '#059669'},
  permBadgeTextDenied: {color: COLORS.danger},

  // About
  aboutSection: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  aboutIconBg: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: COLORS.primaryGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },
  aboutIcon: {fontSize: 30},
  aboutName: {
    fontSize: 24,
    fontWeight: '800',
    color: COLORS.primary,
    marginBottom: 4,
    letterSpacing: -0.5,
  },
  aboutVersion: {
    fontSize: 13,
    color: COLORS.textMuted,
    fontWeight: '500',
    marginBottom: 16,
  },
  aboutDivider: {
    width: 40,
    height: 3,
    backgroundColor: COLORS.borderLight,
    borderRadius: 2,
    marginBottom: 16,
  },
  aboutDesc: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 300,
  },

  // System Button
  systemBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 18,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  systemBtnIcon: {fontSize: 20, marginRight: 14},
  systemBtnText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.text,
  },
  systemBtnArrow: {
    fontSize: 24,
    color: COLORS.textMuted,
    fontWeight: '300',
  },
});
