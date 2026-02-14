import React from 'react';
import {NavigationContainer} from '@react-navigation/native';
import {createBottomTabNavigator} from '@react-navigation/bottom-tabs';
import {View, Text, StyleSheet, Platform} from 'react-native';
import HomeScreen from '../screens/HomeScreen';
import ScheduleScreen from '../screens/ScheduleScreen';
import LogScreen from '../screens/LogScreen';
import SettingsScreen from '../screens/SettingsScreen';
import {COLORS} from '../constants';

const Tab = createBottomTabNavigator();

const TabIcon = ({label, focused}: {label: string; focused: boolean}) => {
  const icons: Record<string, string> = {
    Recents: '📞',
    Shield: '🛡️',
    Schedule: '⏰',
    Settings: '⚙️',
  };
  return (
    <View style={styles.tabItem}>
      <View style={[styles.tabIconWrap, focused && styles.tabIconWrapActive]}>
        <Text style={[styles.tabIcon, focused && styles.tabIconActive]}>
          {icons[label] || '•'}
        </Text>
      </View>
      <Text style={[styles.tabLabel, focused && styles.tabLabelActive]}>
        {label}
      </Text>
    </View>
  );
};

export default function AppNavigator() {
  return (
    <NavigationContainer>
      <Tab.Navigator
        screenOptions={({route}) => ({
          headerShown: true,
          headerStyle: {
            backgroundColor: COLORS.headerGradientStart,
            elevation: 0,
            shadowOpacity: 0,
          },
          headerTintColor: COLORS.white,
          headerTitleStyle: {
            fontWeight: '800',
            fontSize: 20,
            letterSpacing: -0.3,
          },
          tabBarIcon: ({focused}) => (
            <TabIcon label={route.name} focused={focused} />
          ),
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: COLORS.surface,
            borderTopWidth: 0,
            height: Platform.OS === 'ios' ? 88 : 70,
            paddingBottom: Platform.OS === 'ios' ? 28 : 10,
            paddingTop: 8,
            elevation: 12,
            shadowColor: COLORS.shadow,
            shadowOffset: {width: 0, height: -4},
            shadowOpacity: 0.08,
            shadowRadius: 12,
          },
        })}>
        <Tab.Screen
          name="Recents"
          component={LogScreen}
          options={{title: 'TrustRing'}}
        />
        <Tab.Screen
          name="Shield"
          component={HomeScreen}
          options={{title: 'Protection'}}
        />
        <Tab.Screen
          name="Schedule"
          component={ScheduleScreen}
          options={{title: 'Schedule'}}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{title: 'Settings'}}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  tabItem: {
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 64,
  },
  tabIconWrap: {
    width: 40,
    height: 32,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 2,
  },
  tabIconWrapActive: {
    backgroundColor: COLORS.primaryGlow,
  },
  tabIcon: {
    fontSize: 20,
    opacity: 0.45,
  },
  tabIconActive: {
    opacity: 1,
  },
  tabLabel: {
    fontSize: 11,
    color: COLORS.textMuted,
    fontWeight: '500',
  },
  tabLabelActive: {
    color: COLORS.primary,
    fontWeight: '700',
  },
});
