import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
  Alert,
  Linking,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TrustRingService from '../services/TrustRingService';
import { checkPermissions, requestAllPermissions } from '../utils/permissions';
import { COLORS } from '../constants';

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
      Alert.alert('Already Set', 'TrustRing is already your call screening app.');
    }
    loadSettings();
  };

  const handleRequestPermissions = async () => {
    const result = await requestAllPermissions();
    setPermissions(result);
  };

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
      <Text style={styles.permIcon}>{icon}</Text>
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
          {granted ? '✓ Granted' : '✗ Required'}
        </Text>
      </View>
    </View>
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Call Screening Role */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>🔑 Call Screening Role</Text>
        <Text style={styles.sectionDesc}>
          TrustRing must be set as the default call screening app to block calls.
        </Text>
        <View style={styles.roleCard}>
          <View style={styles.roleStatus}>
            <Text style={styles.roleStatusIcon}>
              {hasRole ? '✅' : '⚠️'}
            </Text>
            <Text style={styles.roleStatusText}>
              {hasRole
                ? 'TrustRing is your call screening app'
                : 'Not set as call screening app'}
            </Text>
          </View>
          {!hasRole && (
            <TouchableOpacity style={styles.roleBtn} onPress={handleRequestRole}>
              <Text style={styles.roleBtnText}>Set as Default</Text>
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Permissions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📱 Permissions</Text>
        <Text style={styles.sectionDesc}>
          Required permissions for TrustRing to work properly.
        </Text>
        <View style={styles.permCard}>
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
        {(!permissions.contacts || !permissions.phone || !permissions.callLog) && (
          <TouchableOpacity
            style={styles.grantBtn}
            onPress={handleRequestPermissions}>
            <Text style={styles.grantBtnText}>Grant Permissions</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* About */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ℹ️ About TrustRing</Text>
        <View style={styles.aboutCard}>
          <Text style={styles.aboutName}>TrustRing</Text>
          <Text style={styles.aboutVersion}>Version 1.0.0</Text>
          <Text style={styles.aboutDesc}>
            Block calls from numbers not in your phonebook during scheduled hours.
            Only your trusted circle gets through.
          </Text>
        </View>
      </View>

      {/* Open System Settings */}
      <TouchableOpacity
        style={styles.systemBtn}
        onPress={() => Linking.openSettings()}>
        <Text style={styles.systemBtnText}>📱 Open System Settings</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  content: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 24 },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 4,
  },
  sectionDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 12,
    lineHeight: 18,
  },
  roleCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  roleStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  roleStatusIcon: { fontSize: 24, marginRight: 10 },
  roleStatusText: {
    fontSize: 14,
    color: COLORS.text,
    fontWeight: '600',
    flex: 1,
  },
  roleBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
  },
  roleBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  permCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 4,
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  permRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.surfaceAlt,
  },
  permIcon: { fontSize: 20, marginRight: 10 },
  permLabel: { flex: 1, fontSize: 14, fontWeight: '600', color: COLORS.text },
  permBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  permBadgeGranted: { backgroundColor: '#DCFCE7' },
  permBadgeDenied: { backgroundColor: '#FEE2E2' },
  permBadgeText: { fontSize: 12, fontWeight: '600' },
  permBadgeTextGranted: { color: '#16A34A' },
  permBadgeTextDenied: { color: '#DC2626' },
  grantBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 10,
    padding: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  grantBtnText: { color: COLORS.white, fontWeight: '700', fontSize: 14 },
  aboutCard: {
    backgroundColor: COLORS.surface,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    elevation: 2,
    shadowColor: COLORS.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  aboutName: {
    fontSize: 22,
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: 4,
  },
  aboutVersion: {
    fontSize: 13,
    color: COLORS.textSecondary,
    marginBottom: 10,
  },
  aboutDesc: {
    fontSize: 13,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 19,
  },
  systemBtn: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
    backgroundColor: COLORS.surface,
  },
  systemBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.textSecondary,
  },
});
