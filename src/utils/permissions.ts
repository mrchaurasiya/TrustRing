import { PermissionsAndroid, Platform } from 'react-native';

export async function requestAllPermissions(): Promise<{
  contacts: boolean;
  phone: boolean;
  callLog: boolean;
  notifications: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { contacts: false, phone: false, callLog: false, notifications: false };
  }

  const results = await PermissionsAndroid.requestMultiple([
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  ]);

  return {
    contacts: results['android.permission.READ_CONTACTS'] === 'granted',
    phone: results['android.permission.READ_PHONE_STATE'] === 'granted',
    callLog: results['android.permission.READ_CALL_LOG'] === 'granted',
    notifications: results['android.permission.POST_NOTIFICATIONS'] === 'granted',
  };
}

export async function checkPermissions(): Promise<{
  contacts: boolean;
  phone: boolean;
  callLog: boolean;
}> {
  if (Platform.OS !== 'android') {
    return { contacts: false, phone: false, callLog: false };
  }

  const contacts = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CONTACTS,
  );
  const phone = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_PHONE_STATE,
  );
  const callLog = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.READ_CALL_LOG,
  );

  return { contacts, phone, callLog };
}
