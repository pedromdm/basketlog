import NetInfo from '@react-native-community/netinfo';
import type { Connectivity } from './sync';

const online = (s: { isConnected: boolean | null; isInternetReachable: boolean | null }) =>
  s.isConnected !== false && s.isInternetReachable !== false;

export const netInfoConnectivity: Connectivity = {
  async isOnline() {
    return online(await NetInfo.fetch());
  },
  subscribe(listener) {
    return NetInfo.addEventListener((s) => listener(online(s)));
  },
};
