/**
 * useNetworkStatus — monitors internet connectivity using NetInfo.
 * Returns { isConnected, isInternetReachable }.
 */
import { useEffect, useState } from "react";
import NetInfo, { NetInfoState } from "@react-native-community/netinfo";

interface NetworkStatus {
  /** Device has a network connection (WiFi/cellular) */
  isConnected: boolean;
  /** Internet is actually reachable (not just local network) */
  isInternetReachable: boolean;
}

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: true,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? true,
      });
    });

    return unsubscribe;
  }, []);

  return status;
}
