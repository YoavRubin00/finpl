declare module "react-native-play-install-referrer" {
  export interface InstallReferrerInfo {
    installReferrer?: string;
    referrerClickTimestampSeconds?: number;
    installBeginTimestampSeconds?: number;
    referrerClickTimestampServerSeconds?: number;
    installBeginTimestampServerSeconds?: number;
    installVersion?: string;
    googlePlayInstantParam?: boolean;
  }

  export interface PlayInstallReferrerError {
    responseCode: number;
    message: string;
  }

  export const PlayInstallReferrer: {
    getInstallReferrerInfo(
      callback: (
        info: InstallReferrerInfo | null,
        error: PlayInstallReferrerError | null,
      ) => void,
    ): void;
  };
}
