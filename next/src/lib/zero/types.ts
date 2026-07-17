export type ZeroPublicStatus = {
  connected: boolean;
  liveEnabled: boolean;
  zeroUserId: string | null;
  zeroEmail: string | null;
  walletAddress: string | null;
  balance: string | null;
  demoMode: boolean;
  balanceError: string | null;
};
