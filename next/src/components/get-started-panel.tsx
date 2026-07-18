"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import {
  ExternalLink,
  Link2,
  Loader2,
  Plus,
  RefreshCw,
  Unplug,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ZeroPublicStatus } from "@/lib/zero/types";

type DeviceStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  url: string;
  pollInterval: number;
};

type StepId = 1 | 2;

function firstIncomplete(step1Done: boolean, step2Done: boolean): StepId {
  if (!step1Done) return 1;
  return 2;
}

function formatBalance(balance: string | null) {
  if (balance == null) return "—";
  const n = Number.parseFloat(balance);
  if (!Number.isFinite(n)) return "—";
  return `$${n.toFixed(2)}`;
}

export function GetStartedPanel({
  initialStatus,
}: {
  initialStatus: ZeroPublicStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step1Done = status.connected;
  const step2Done =
    status.connected &&
    status.balance != null &&
    Number.parseFloat(status.balance) > 0;
  const accountReady = step1Done && step2Done;
  const doneCount = [step1Done, step2Done].filter(Boolean).length;

  const [activeStep, setActiveStep] = useState<StepId>(() =>
    firstIncomplete(
      initialStatus.connected,
      initialStatus.connected &&
        initialStatus.balance != null &&
        Number.parseFloat(initialStatus.balance) > 0,
    ),
  );
  const directionRef = useRef(1);
  const prevDoneRef = useRef({ step1Done, step2Done });

  useEffect(() => {
    if (accountReady) return;

    const next = firstIncomplete(step1Done, step2Done);
    const prev = prevDoneRef.current;
    prevDoneRef.current = { step1Done, step2Done };

    const justCompleted =
      (activeStep === 1 && !prev.step1Done && step1Done) ||
      (activeStep === 2 && !prev.step2Done && step2Done);

    if (justCompleted || activeStep !== next) {
      directionRef.current = next >= activeStep ? 1 : -1;
      setActiveStep(next);
    }
  }, [step1Done, step2Done, accountReady, activeStep]);

  const refreshStatus = useCallback(async (opts?: { quiet?: boolean }) => {
    setRefreshing(true);
    try {
      const res = await fetch("/api/zero/status");
      const data = (await res.json()) as ZeroPublicStatus & { error?: string };
      if (!res.ok) {
        throw new Error(data.error || "Could not refresh status");
      }
      setStatus(data);
      if (data.balanceError) {
        if (!opts?.quiet) {
          toast.error(data.balanceError);
        }
        return data;
      }
      if (!opts?.quiet) {
        toast.success(
          data.balance != null
            ? `Balance ${formatBalance(data.balance)}`
            : "Balance updated",
        );
      }
      return data;
    } catch (err) {
      if (!opts?.quiet) {
        toast.error(err instanceof Error ? err.message : "Refresh failed");
      }
      return null;
    } finally {
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  async function startConnect() {
    setConnecting(true);
    try {
      const res = await fetch("/api/zero/auth/start", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not start login");

      const started = data as DeviceStart;
      setDevice(started);
      window.open(started.url, "_blank", "noopener,noreferrer");

      if (pollRef.current) clearInterval(pollRef.current);
      const intervalMs = Math.max(2, started.pollInterval || 5) * 1000;

      pollRef.current = setInterval(async () => {
        try {
          const finishRes = await fetch("/api/zero/auth/finish", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deviceCode: started.deviceCode }),
          });
          const finish = await finishRes.json();
          if (!finishRes.ok) {
            throw new Error(finish.error || "Poll failed");
          }
          if (finish.status === "pending") return;
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setDevice(null);
          setConnecting(false);
          if (finish.status === "expired") {
            toast.error("Authorization expired. Start again.");
            return;
          }
          toast.success("Zero account connected");
          await refreshStatus({ quiet: true });
        } catch (err) {
          if (pollRef.current) clearInterval(pollRef.current);
          pollRef.current = null;
          setConnecting(false);
          toast.error(err instanceof Error ? err.message : "Connect failed");
        }
      }, intervalMs);
    } catch (err) {
      setConnecting(false);
      toast.error(err instanceof Error ? err.message : "Connect failed");
    }
  }

  async function fundWallet() {
    setFunding(true);
    try {
      const res = await fetch("/api/zero/fund", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount: "10", provider: "coinbase" }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not create funding link");
      window.open(data.fundingUrl as string, "_blank", "noopener,noreferrer");
      toast.message("Complete funding in the new tab, then refresh.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Funding failed");
    } finally {
      setFunding(false);
    }
  }

  async function disconnect() {
    setDisconnecting(true);
    try {
      const res = await fetch("/api/zero/disconnect", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Disconnect failed");
      toast.success("Disconnected from Zero");
      setDevice(null);
      await refreshStatus({ quiet: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const panelTitle = activeStep === 1 ? "Connect" : "Fund";

  if (accountReady) {
    return (
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-full w-full flex-1 items-center justify-center">
          <div className="w-full max-w-sm">
            <Card className="min-h-64">
              <CardHeader className="pb-0">
                <CardTitle>Wallet</CardTitle>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col gap-4 py-5">
                <div className="space-y-3">
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Email</p>
                    <p className="text-sm font-medium">
                      {status.zeroEmail || "—"}
                    </p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs text-muted-foreground">Balance</p>
                    <p className="text-3xl font-medium tracking-tight tabular-nums">
                      {formatBalance(status.balance)}
                    </p>
                  </div>
                </div>
                <div className="mt-auto flex flex-wrap items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={disconnecting}
                    onClick={() => void disconnect()}
                  >
                    {disconnecting ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <Unplug />
                    )}
                    Disconnect
                  </Button>
                  <Button
                    size="sm"
                    disabled={funding}
                    onClick={() => void fundWallet()}
                  >
                    {funding ? <Loader2 className="animate-spin" /> : <Plus />}
                    Add funds
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={refreshing}
                    onClick={() => void refreshStatus()}
                  >
                    {refreshing ? (
                      <Loader2 className="animate-spin" />
                    ) : (
                      <RefreshCw />
                    )}
                    Refresh
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </MotionConfig>
    );
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="flex min-h-full w-full flex-1 items-center justify-center">
        <div className="w-full max-w-sm space-y-3">
          <div
            className="h-1.5 overflow-hidden rounded-full bg-muted"
            role="progressbar"
            aria-valuenow={doneCount}
            aria-valuemin={0}
            aria-valuemax={2}
            aria-label="Setup progress"
          >
            <motion.div
              className="h-full rounded-full bg-primary"
              initial={false}
              animate={{ width: `${(doneCount / 2) * 100}%` }}
              transition={{ type: "spring", stiffness: 260, damping: 28 }}
            />
          </div>

          <Card className="min-h-56">
            <AnimatePresence mode="wait" custom={directionRef.current}>
              <motion.div
                key={activeStep}
                custom={directionRef.current}
                variants={panelVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
                className="flex min-h-56 flex-1 flex-col"
              >
                <CardHeader className="pb-0">
                  <CardTitle>{panelTitle}</CardTitle>
                </CardHeader>

                <CardContent className="flex min-h-0 flex-1 flex-col gap-4 py-5">
                  <div className="flex flex-1 flex-col justify-center">
                    {activeStep === 1 ? (
                      step1Done && !device ? (
                        <div className="space-y-1.5">
                          <p className="text-sm font-medium">
                            {status.zeroEmail ||
                              status.zeroUserId ||
                              "Zero user"}
                          </p>
                          {status.walletAddress ? (
                            <p className="font-mono text-xs text-muted-foreground break-all">
                              {status.walletAddress}
                            </p>
                          ) : null}
                        </div>
                      ) : device ? (
                        <div className="space-y-3">
                          <p className="font-mono text-2xl tracking-[0.2em]">
                            {device.userCode}
                          </p>
                          <a
                            href={device.url}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
                          >
                            Open authorization
                            <ExternalLink className="size-3.5" />
                          </a>
                          <p className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Loader2 className="size-3.5 animate-spin" />
                            Waiting…
                          </p>
                        </div>
                      ) : null
                    ) : null}

                    {activeStep === 2 ? (
                      <p className="text-3xl font-medium tracking-tight tabular-nums">
                        {formatBalance(status.balance)}
                      </p>
                    ) : null}
                  </div>

                  {!(activeStep === 1 && device) ? (
                    <div className="mt-auto flex flex-wrap items-center gap-2">
                      {activeStep === 1 ? (
                        step1Done ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disconnecting}
                            onClick={() => void disconnect()}
                          >
                            {disconnecting ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Unplug />
                            )}
                            Disconnect
                          </Button>
                        ) : (
                          <Button
                            disabled={connecting}
                            onClick={() => void startConnect()}
                          >
                            {connecting ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Link2 />
                            )}
                            Connect
                          </Button>
                        )
                      ) : null}

                      {activeStep === 2 ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={disconnecting}
                            onClick={() => void disconnect()}
                          >
                            {disconnecting ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Unplug />
                            )}
                            Disconnect
                          </Button>
                          <Button
                            disabled={!status.connected || funding}
                            onClick={() => void fundWallet()}
                          >
                            {funding ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <Plus />
                            )}
                            Add funds
                          </Button>
                          <Button
                            variant="outline"
                            disabled={!status.connected || refreshing}
                            onClick={() => void refreshStatus()}
                          >
                            {refreshing ? (
                              <Loader2 className="animate-spin" />
                            ) : (
                              <RefreshCw />
                            )}
                            Refresh
                          </Button>
                        </>
                      ) : null}
                    </div>
                  ) : null}
                </CardContent>
              </motion.div>
            </AnimatePresence>
          </Card>
        </div>
      </div>
    </MotionConfig>
  );
}

const panelVariants = {
  enter: (direction: number) => ({
    opacity: 0,
    x: direction * 16,
  }),
  center: {
    opacity: 1,
    x: 0,
  },
  exit: (direction: number) => ({
    opacity: 0,
    x: direction * -16,
  }),
};
