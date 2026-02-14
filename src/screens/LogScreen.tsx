import React, {useState, useCallback, useRef, useEffect} from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  StatusBar,
  Animated,
  Vibration,
} from 'react-native';
import {useFocusEffect} from '@react-navigation/native';
import TrustRingService, {BlockedCallEntry} from '../services/TrustRingService';
import {COLORS} from '../constants';
import {formatTimestamp, formatPhoneNumber} from '../utils/formatters';

interface GroupedCall {
  number: string;
  count: number;
  lastTimestamp: number;
  timestamps: number[];
}

function groupCalls(calls: BlockedCallEntry[]): GroupedCall[] {
  const map = new Map<string, GroupedCall>();
  for (const call of calls) {
    const cleaned = call.number.replace(/\D/g, '');
    const key = cleaned.slice(-10) || call.number;
    const existing = map.get(key);
    if (existing) {
      existing.count++;
      existing.timestamps.push(call.timestamp);
      if (call.timestamp > existing.lastTimestamp) {
        existing.lastTimestamp = call.timestamp;
        existing.number = call.number;
      }
    } else {
      map.set(key, {
        number: call.number,
        count: 1,
        lastTimestamp: call.timestamp,
        timestamps: [call.timestamp],
      });
    }
  }
  return Array.from(map.values()).sort(
    (a, b) => b.lastTimestamp - a.lastTimestamp,
  );
}

function getAvatarColor(number: string): string {
  const colors = [
    '#EF4444',
    '#F97316',
    '#EAB308',
    '#22C55E',
    '#06B6D4',
    '#3B82F6',
    '#8B5CF6',
    '#EC4899',
    '#14B8A6',
    '#F43F5E',
    '#6366F1',
    '#0EA5E9',
  ];
  const hash = number
    .replace(/\D/g, '')
    .split('')
    .reduce((a, b) => a + parseInt(b, 10), 0);
  return colors[hash % colors.length];
}

function timeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) {
    return 'Just now';
  }
  if (mins < 60) {
    return `${mins}m ago`;
  }
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) {
    return `${hrs}h ago`;
  }
  const days = Math.floor(hrs / 24);
  if (days === 1) {
    return 'Yesterday';
  }
  if (days < 7) {
    return `${days}d ago`;
  }
  return new Date(timestamp).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

const CallItem = React.memo(
  ({
    item,
    isSelected,
    selectionMode,
    onPress,
    onLongPress,
    whitelist,
  }: {
    item: GroupedCall;
    isSelected: boolean;
    selectionMode: boolean;
    onPress: () => void;
    onLongPress: () => void;
    whitelist: Set<string>;
  }) => {
    const scaleAnim = useRef(new Animated.Value(1)).current;
    const isUnblocked = whitelist.has(
      item.number.replace(/\D/g, '').slice(-10),
    );

    const handlePressIn = () => {
      Animated.spring(scaleAnim, {
        toValue: 0.97,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    const handlePressOut = () => {
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        speed: 50,
        bounciness: 4,
      }).start();
    };

    const digits = item.number.replace(/\D/g, '');
    const initials = digits.length >= 2 ? digits.slice(-2) : digits || '#';

    return (
      <Animated.View style={{transform: [{scale: scaleAnim}]}}>
        <TouchableOpacity
          style={[styles.callItem, isSelected && styles.callItemSelected]}
          onPress={onPress}
          onLongPress={onLongPress}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          delayLongPress={300}>
          {selectionMode ? (
            <View
              style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
              {isSelected && <Text style={styles.checkmark}>✓</Text>}
            </View>
          ) : (
            <View
              style={[
                styles.avatar,
                {backgroundColor: getAvatarColor(item.number)},
              ]}>
              <Text style={styles.avatarText}>{initials}</Text>
            </View>
          )}

          <View style={styles.callInfo}>
            <View style={styles.callNameRow}>
              <Text style={styles.callNumber} numberOfLines={1}>
                {formatPhoneNumber(item.number)}
              </Text>
              {item.count > 1 && (
                <View style={styles.countChip}>
                  <Text style={styles.countChipText}>({item.count})</Text>
                </View>
              )}
            </View>
            <View style={styles.callMetaRow}>
              <Text style={styles.callBlockedIcon}>↙</Text>
              <Text style={styles.callMeta}>
                {isUnblocked ? 'Unblocked · ' : 'Blocked · '}
                {timeAgo(item.lastTimestamp)}
              </Text>
            </View>
          </View>

          {!selectionMode && (
            <View style={styles.callRight}>
              {isUnblocked ? (
                <View style={styles.unblockBadge}>
                  <Text style={styles.unblockBadgeText}>✓</Text>
                </View>
              ) : (
                <View style={styles.blockIndicator}>
                  <Text style={styles.blockIndicatorText}>🚫</Text>
                </View>
              )}
            </View>
          )}
        </TouchableOpacity>
      </Animated.View>
    );
  },
);

export default function LogScreen() {
  const [blockedCalls, setBlockedCalls] = useState<BlockedCallEntry[]>([]);
  const [whitelist, setWhitelist] = useState<Set<string>>(new Set());
  const [selectedNumbers, setSelectedNumbers] = useState<Set<string>>(
    new Set(),
  );
  const [selectionMode, setSelectionMode] = useState(false);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, []),
  );

  const loadData = async () => {
    const [log, wl] = await Promise.all([
      TrustRingService.getBlockedCallLog(),
      TrustRingService.getWhitelist(),
    ]);
    setBlockedCalls(log.sort((a, b) => b.timestamp - a.timestamp));
    setWhitelist(new Set(wl.map(n => n.replace(/\D/g, '').slice(-10))));
  };

  const groupedCalls = groupCalls(blockedCalls);

  const toggleSelection = (number: string) => {
    const newSet = new Set(selectedNumbers);
    if (newSet.has(number)) {
      newSet.delete(number);
    } else {
      newSet.add(number);
    }
    setSelectedNumbers(newSet);
    if (newSet.size === 0) {
      setSelectionMode(false);
    }
  };

  const startSelection = (number: string) => {
    Vibration.vibrate(20);
    setSelectionMode(true);
    setSelectedNumbers(new Set([number]));
  };

  const selectAll = () => {
    if (selectedNumbers.size === groupedCalls.length) {
      setSelectedNumbers(new Set());
      setSelectionMode(false);
    } else {
      setSelectedNumbers(new Set(groupedCalls.map(c => c.number)));
    }
  };

  const cancelSelection = () => {
    setSelectionMode(false);
    setSelectedNumbers(new Set());
  };

  const handleUnblock = () => {
    const count = selectedNumbers.size;
    Alert.alert(
      'Unblock Numbers',
      `Allow future calls from ${count} number${
        count > 1 ? 's' : ''
      }? They won't be blocked anymore.`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Unblock',
          onPress: async () => {
            const nums = Array.from(selectedNumbers);
            await TrustRingService.addToWhitelist(nums);
            setWhitelist(
              prev =>
                new Set([
                  ...prev,
                  ...nums.map(n => n.replace(/\D/g, '').slice(-10)),
                ]),
            );
            cancelSelection();
          },
        },
      ],
    );
  };

  const handleBlock = () => {
    const count = selectedNumbers.size;
    Alert.alert(
      'Block Again',
      `Re-block ${count} number${count > 1 ? 's' : ''}?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Block',
          style: 'destructive',
          onPress: async () => {
            const nums = Array.from(selectedNumbers);
            await TrustRingService.removeFromWhitelist(nums);
            setWhitelist(prev => {
              const next = new Set(prev);
              for (const n of nums) {
                next.delete(n.replace(/\D/g, '').slice(-10));
              }
              return next;
            });
            cancelSelection();
          },
        },
      ],
    );
  };

  const handleDelete = () => {
    const count = selectedNumbers.size;
    Alert.alert(
      'Delete Records',
      `Remove ${count} record${count > 1 ? 's' : ''} from log?`,
      [
        {text: 'Cancel', style: 'cancel'},
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const nums = Array.from(selectedNumbers);
            await TrustRingService.removeBlockedCallEntries(nums);
            await loadData();
            cancelSelection();
          },
        },
      ],
    );
  };

  const handleItemPress = (item: GroupedCall) => {
    if (selectionMode) {
      toggleSelection(item.number);
    } else {
      const isUnblocked = whitelist.has(
        item.number.replace(/\D/g, '').slice(-10),
      );
      Alert.alert(
        formatPhoneNumber(item.number),
        `Blocked ${item.count} time${
          item.count > 1 ? 's' : ''
        }\nLast: ${formatTimestamp(item.lastTimestamp)}${
          isUnblocked ? '\n\nStatus: Unblocked ✓' : ''
        }`,
        [
          {text: 'Close', style: 'cancel'},
          isUnblocked
            ? {
                text: 'Block Again',
                style: 'destructive',
                onPress: async () => {
                  await TrustRingService.removeFromWhitelist([item.number]);
                  await loadData();
                },
              }
            : {
                text: 'Unblock',
                onPress: async () => {
                  await TrustRingService.addToWhitelist([item.number]);
                  await loadData();
                },
              },
        ],
      );
    }
  };

  const selectedHasBlocked = Array.from(selectedNumbers).some(
    n => !whitelist.has(n.replace(/\D/g, '').slice(-10)),
  );
  const selectedHasUnblocked = Array.from(selectedNumbers).some(n =>
    whitelist.has(n.replace(/\D/g, '').slice(-10)),
  );

  const renderItem = ({item}: {item: GroupedCall}) => (
    <CallItem
      item={item}
      isSelected={selectedNumbers.has(item.number)}
      selectionMode={selectionMode}
      onPress={() => handleItemPress(item)}
      onLongPress={() => startSelection(item.number)}
      whitelist={whitelist}
    />
  );

  const renderEmpty = () => (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyIconCircle}>
        <Text style={styles.emptyIcon}>📱</Text>
      </View>
      <Text style={styles.emptyTitle}>No blocked calls</Text>
      <Text style={styles.emptySubtitle}>
        {'When TrustRing blocks a call, it\nwill show up here'}
      </Text>
    </View>
  );

  const allSelected =
    groupedCalls.length > 0 && selectedNumbers.size === groupedCalls.length;

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="light-content"
        backgroundColor={COLORS.headerGradientStart}
      />

      {selectionMode && (
        <View style={styles.selectionBar}>
          <TouchableOpacity
            style={styles.selBarClose}
            onPress={cancelSelection}>
            <Text style={styles.selBarCloseText}>✕</Text>
          </TouchableOpacity>
          <Text style={styles.selBarCount}>
            {selectedNumbers.size} selected
          </Text>
          <TouchableOpacity style={styles.selBarAction} onPress={selectAll}>
            <Text style={styles.selBarActionText}>
              {allSelected ? 'Deselect' : 'Select All'}
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {!selectionMode && blockedCalls.length > 0 && (
        <View style={styles.summaryStrip}>
          <View style={styles.summaryLeft}>
            <View style={styles.summaryDot} />
            <Text style={styles.summaryText}>
              {groupedCalls.length} number
              {groupedCalls.length !== 1 ? 's' : ''} · {blockedCalls.length}{' '}
              call
              {blockedCalls.length !== 1 ? 's' : ''} blocked
            </Text>
          </View>
          <Text style={styles.summaryHint}>Long press to select</Text>
        </View>
      )}

      <FlatList
        data={groupedCalls}
        renderItem={renderItem}
        keyExtractor={item => item.number}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={
          groupedCalls.length === 0 ? styles.emptyList : styles.list
        }
        showsVerticalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />

      {selectionMode && selectedNumbers.size > 0 && (
        <View style={styles.bottomBar}>
          {selectedHasBlocked && (
            <TouchableOpacity
              style={[styles.bottomAction, styles.bottomActionUnblock]}
              onPress={handleUnblock}
              activeOpacity={0.8}>
              <Text style={styles.bottomActionIcon}>✓</Text>
              <Text style={[styles.bottomActionLabel, {color: COLORS.success}]}>
                Unblock
              </Text>
            </TouchableOpacity>
          )}
          {selectedHasUnblocked && (
            <TouchableOpacity
              style={[styles.bottomAction, styles.bottomActionBlock]}
              onPress={handleBlock}
              activeOpacity={0.8}>
              <Text style={styles.bottomActionIcon}>🚫</Text>
              <Text style={[styles.bottomActionLabel, {color: COLORS.danger}]}>
                Block
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={[styles.bottomAction, styles.bottomActionDelete]}
            onPress={handleDelete}
            activeOpacity={0.8}>
            <Text style={styles.bottomActionIcon}>🗑️</Text>
            <Text style={styles.bottomActionLabel}>Delete</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {flex: 1, backgroundColor: COLORS.background},

  selectionBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  selBarClose: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  selBarCloseText: {color: COLORS.white, fontSize: 16, fontWeight: '700'},
  selBarCount: {
    flex: 1,
    color: COLORS.white,
    fontSize: 17,
    fontWeight: '700',
    marginLeft: 14,
  },
  selBarAction: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  selBarActionText: {color: COLORS.white, fontSize: 13, fontWeight: '700'},

  summaryStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: COLORS.borderLight,
  },
  summaryLeft: {flexDirection: 'row', alignItems: 'center'},
  summaryDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: COLORS.danger,
    marginRight: 10,
  },
  summaryText: {fontSize: 13, color: COLORS.textSecondary, fontWeight: '600'},
  summaryHint: {fontSize: 11, color: COLORS.textMuted},

  list: {paddingBottom: 100},
  emptyList: {flex: 1, justifyContent: 'center'},

  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.borderLight,
    marginLeft: 76,
  },

  callItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    backgroundColor: COLORS.surface,
  },
  callItemSelected: {
    backgroundColor: 'rgba(8, 145, 178, 0.08)',
  },

  checkbox: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 2,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
    backgroundColor: COLORS.surface,
  },
  checkboxChecked: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  checkmark: {color: COLORS.white, fontSize: 18, fontWeight: '800'},

  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 14,
  },
  avatarText: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 1,
  },

  callInfo: {flex: 1},
  callNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 3,
  },
  callNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.text,
    letterSpacing: 0.2,
  },
  countChip: {marginLeft: 6},
  countChipText: {
    fontSize: 12,
    color: COLORS.danger,
    fontWeight: '700',
  },
  callMetaRow: {flexDirection: 'row', alignItems: 'center'},
  callBlockedIcon: {
    fontSize: 12,
    color: COLORS.danger,
    marginRight: 4,
    fontWeight: '800',
  },
  callMeta: {fontSize: 12, color: COLORS.textMuted, fontWeight: '400'},

  callRight: {marginLeft: 12},
  blockIndicator: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.dangerLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  blockIndicatorText: {fontSize: 14},
  unblockBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: COLORS.successLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unblockBadgeText: {
    fontSize: 16,
    color: COLORS.success,
    fontWeight: '800',
  },

  emptyContainer: {alignItems: 'center', padding: 60},
  emptyIconCircle: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: COLORS.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: COLORS.borderLight,
  },
  emptyIcon: {fontSize: 40},
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.text,
    marginBottom: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: COLORS.textMuted,
    textAlign: 'center',
    lineHeight: 22,
  },

  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    backgroundColor: COLORS.surface,
    paddingHorizontal: 12,
    paddingVertical: 10,
    paddingBottom: 20,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: COLORS.border,
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: {width: 0, height: -4},
    shadowOpacity: 0.15,
    shadowRadius: 12,
    gap: 8,
  },
  bottomAction: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 14,
    gap: 6,
  },
  bottomActionUnblock: {
    backgroundColor: COLORS.successLight,
  },
  bottomActionBlock: {
    backgroundColor: COLORS.dangerLight,
  },
  bottomActionDelete: {
    backgroundColor: COLORS.surfaceAlt,
  },
  bottomActionIcon: {fontSize: 16},
  bottomActionLabel: {fontSize: 13, fontWeight: '700', color: COLORS.text},
});
