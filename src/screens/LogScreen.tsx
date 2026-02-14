import React, {useState, useCallback} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService, {BlockedCallEntry} from '../services/TrustRingService';
import {COLORS} from '../constants';
import {formatTimestamp, formatPhoneNumber} from '../utils/formatters';

export default function LogScreen() {
  const [blockedCalls, setBlockedCalls] = useState<BlockedCallEntry[]>([]);

  useFocusEffect(
    useCallback(() => {
      loadLog();
    }, []),
  );

  const loadLog = async () => {
    const log = await TrustRingService.getBlockedCallLog();
    setBlockedCalls(log.sort((a, b) => b.timestamp - a.timestamp));
  };

  const clearLog = () => {
    Alert.alert(
      'Clear Log',
      'Remove all blocked call records? This cannot be undone.',
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            await TrustRingService.clearBlockedCallLog();
            setBlockedCalls([]);
          },
        },
      ],
    );
  };

  const renderItem = ({
    item,
    index,
  }: {
    item: BlockedCallEntry;
    index: number;
  }) => (
    <View style={[styles.callCard, index === 0 && styles.callCardFirst]}>
      <View style={styles.callIconWrap}>
        <View style={styles.callIconBg}>
          <Text style={styles.callIconText}>📵</Text>
        </View>
        {index < blockedCalls.length - 1 && (
          <View style={styles.callConnector} />
        )}
      </View>
      <View style={styles.callContent}>
        <View style={styles.callRow}>
          <Text style={styles.callNumber}>
            {formatPhoneNumber(item.number)}
          </Text>
          <View style={styles.callBadge}>
            <Text style={styles.callBadgeText}>Blocked</Text>
          </View>
        </View>
        <Text style={styles.callTime}>{formatTimestamp(item.timestamp)}</Text>
      </View>
    </View>
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconBg}>
        <Text style={styles.emptyIcon}>🛡️</Text>
      </View>
      <Text style={styles.emptyTitle}>All Clear</Text>
      <Text style={styles.emptySubtitle}>
        No blocked calls yet. When TrustRing blocks an unknown caller, it will
        appear here.
      </Text>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.headerGradientStart}
      />
      {blockedCalls.length > 0 && (
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.countBadge}>
              <Text style={styles.countText}>{blockedCalls.length}</Text>
            </View>
            <Text style={styles.headerLabel}>
              blocked call{blockedCalls.length !== 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.clearBtn}
            onPress={clearLog}
            activeOpacity={0.7}>
            <Text style={styles.clearBtnText}>Clear All</Text>
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
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  countBadge: {
    backgroundColor: COLORS.danger,
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  countText: {
    color: COLORS.white,
    fontSize: 13,
    fontWeight: '800',
  },
  headerLabel: {
    fontSize: 14,
    color: COLORS.textSecondary,
    fontWeight: '600',
  },
  clearBtn: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: COLORS.dangerLight,
  },
  clearBtnText: {
    fontSize: 13,
    color: COLORS.danger,
    fontWeight: '700',
  },

  // List
  list: {paddingHorizontal: 20, paddingBottom: 20},
  emptyList: {flex: 1, justifyContent: 'center', padding: 20},

  // Call Card
  callCard: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  callCardFirst: {marginTop: 4},
  callIconWrap: {
    alignItems: 'center',
    width: 48,
    paddingTop: 4,
  },
  callIconBg: {
    width: 40,
    height: 40,
    borderRadius: 14,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1,
  },
  callIconText: {fontSize: 18},
  callConnector: {
    width: 2,
    flex: 1,
    backgroundColor: COLORS.borderLight,
    marginTop: 4,
  },
  callContent: {
    flex: 1,
    backgroundColor: COLORS.surface,
    borderRadius: 16,
    padding: 16,
    marginLeft: 10,
    marginBottom: 8,
    elevation: 1,
    shadowColor: COLORS.shadow,
    shadowOffset: {width: 0, height: 1},
    shadowOpacity: 0.04,
    shadowRadius: 4,
  },
  callRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  callNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: COLORS.text,
    flex: 1,
  },
  callBadge: {
    backgroundColor: COLORS.dangerLight,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginLeft: 8,
  },
  callBadgeText: {
    fontSize: 11,
    color: COLORS.danger,
    fontWeight: '700',
  },
  callTime: {
    fontSize: 12,
    color: COLORS.textMuted,
  },

  // Empty
  emptyContainer: {alignItems: 'center', padding: 40},
  emptyIconBg: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: COLORS.accentGlow,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  emptyIcon: {fontSize: 36},
  emptyTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
});
