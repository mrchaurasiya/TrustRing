import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import TrustRingService, { BlockedCallEntry } from '../services/TrustRingService';
import { COLORS } from '../constants';
import { formatTimestamp, formatPhoneNumber } from '../utils/formatters';

export default function LogScreen() {
  const [blockedCalls, setBlockedCalls] = useState<BlockedCallEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadLog();
    }, []),
  );

  const loadLog = async () => {
    const log = await TrustRingService.getBlockedCallLog();
    // Sort by timestamp descending (newest first)
    setBlockedCalls(log.sort((a, b) => b.timestamp - a.timestamp));
  };

  const clearLog = () => {
    Alert.alert(
      'Clear Blocked Call Log',
      'Are you sure you want to clear all blocked call history?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await TrustRingService.clearBlockedCallLog();
            setBlockedCalls([]);
          },
        },
      ],
    );
  };

  const renderItem = ({ item }: { item: BlockedCallEntry }) => (
    <View style={styles.callItem}>
      <View style={styles.callIcon}>
        <Text style={styles.callIconText}>🚫</Text>
      </View>
      <View style={styles.callInfo}>
        <Text style={styles.callNumber}>
          {formatPhoneNumber(item.number)}
        </Text>
        <Text style={styles.callTime}>{formatTimestamp(item.timestamp)}</Text>
      </View>
      <View style={styles.callBadge}>
        <Text style={styles.callBadgeText}>Blocked</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyIcon}>✅</Text>
      <Text style={styles.emptyTitle}>No Blocked Calls</Text>
      <Text style={styles.emptySubtitle}>
        When TrustRing blocks an unknown caller, it will appear here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {blockedCalls.length > 0 && (
        <View style={styles.header}>
          <Text style={styles.headerCount}>
            {blockedCalls.length} blocked call{blockedCalls.length !== 1 ? 's' : ''}
          </Text>
          <TouchableOpacity onPress={clearLog}>
            <Text style={styles.clearBtn}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}
      <FlatList
        data={blockedCalls}
        renderItem={renderItem}
        keyExtractor={(item, index) => `${item.timestamp}-${index}`}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          blockedCalls.length === 0 ? styles.emptyList : styles.list
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingBottom: 8,
  },
  headerCount: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  clearBtn: {
    fontSize: 14,
    color: COLORS.danger,
    fontWeight: '600',
  },
  list: { padding: 16 },
  emptyList: { flex: 1, justifyContent: 'center', padding: 16 },
  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.surface,
    padding: 14,
    borderRadius: 12,
  },
  callIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  callIconText: { fontSize: 20 },
  callInfo: { flex: 1 },
  callNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
  },
  callTime: {
    fontSize: 12,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  callBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  callBadgeText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
  },
  separator: { height: 8 },
  emptyContainer: { alignItems: 'center', padding: 40 },
  emptyIcon: { fontSize: 48, marginBottom: 16 },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});
