import {NativeModules, Platform} from 'react-native';

const {TrustRingModule} = NativeModules;

export type SimPreference = 'BOTH' | 'SIM_1' | 'SIM_2';

export interface SimSlotInfo {
  simCount: number;
  sim1Carrier: string;
  sim2Carrier: string;
}

export interface Schedule {
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  activeDays: string;
}

export interface BlockedCallEntry {
  number: string;
  timestamp: number;
  simSlot?: string;
  targetSimPref?: string;
}

class TrustRingService {
  async setBlockingEnabled(enabled: boolean): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.setBlockingEnabled(enabled);
  }

  async isBlockingEnabled(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.isBlockingEnabled();
  }

  async setSimBlockingPreference(preference: SimPreference): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    await TrustRingModule.setSimBlockingPreference(preference);
    return true;
  }

  async getSimBlockingPreference(): Promise<SimPreference> {
    if (Platform.OS !== 'android') {
      return 'BOTH';
    }
    return TrustRingModule.getSimBlockingPreference();
  }

  async getSimSlotInfo(): Promise<SimSlotInfo> {
    if (Platform.OS !== 'android') {
      return { simCount: 0, sim1Carrier: 'SIM 1', sim2Carrier: 'SIM 2' };
    }
    return TrustRingModule.getSimSlotInfo();
  }

  async setSchedule(schedule: Schedule): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.setSchedule(
      schedule.startHour,
      schedule.startMinute,
      schedule.endHour,
      schedule.endMinute,
      schedule.activeDays,
    );
  }

  async getSchedule(): Promise<Schedule | null> {
    if (Platform.OS !== 'android') {
      return null;
    }
    return TrustRingModule.getSchedule();
  }

  async getBlockedCallLog(): Promise<BlockedCallEntry[]> {
    if (Platform.OS !== 'android') {
      return [];
    }
    return TrustRingModule.getBlockedCallLog();
  }

  async clearBlockedCallLog(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.clearBlockedCallLog();
  }

  async removeBlockedCallEntries(numbers: string[]): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.removeBlockedCallEntries(numbers);
  }

  async getBlockedCount(): Promise<number> {
    if (Platform.OS !== 'android') {
      return 0;
    }
    return TrustRingModule.getBlockedCount();
  }

  async requestCallScreeningRole(): Promise<string> {
    if (Platform.OS !== 'android') {
      return 'unsupported';
    }
    return TrustRingModule.requestCallScreeningRole();
  }

  async isCallScreeningRoleHeld(): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.isCallScreeningRoleHeld();
  }

  async addToWhitelist(numbers: string[]): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.addToWhitelist(numbers);
  }

  async removeFromWhitelist(numbers: string[]): Promise<boolean> {
    if (Platform.OS !== 'android') {
      return false;
    }
    return TrustRingModule.removeFromWhitelist(numbers);
  }

  async getWhitelist(): Promise<string[]> {
    if (Platform.OS !== 'android') {
      return [];
    }
    return TrustRingModule.getWhitelist();
  }
}

export default new TrustRingService();
