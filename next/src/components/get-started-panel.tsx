"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, MotionConfig } from "motion/react";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ZeroStatus = {
  connected: boolean;
  liveEnabled: boolean;
  zeroUserId: string | null;
  zeroEmail: string | null;
  walletAddress: string | null;
  balance: string | null;
  demoMode: boolean;
};

type DeviceStart = {
  deviceCode: string;
  userCode: string;
  verificationUri: string;
  url: string;
  pollInterval: number;
};

type StepId = 1 | 2 | 3 | "done";

const STEPS = [
  { id: 1 as const, label: "Connect" },
  { id: 2 as const, label: "Fund" },
  { id: 3 as const, label: "Go live" },
];

function firstIncomplete(
  step1Done: boolean,
  step2Done: boolean,
  step3Done: boolean,
): StepId {
  if (!step1Done) return 1;
  if (!step2Done) return 2;
  if (!step3Done) return 3;
  return "done";
}

function isStepDone(
  id: 1 | 2 | 3,
  step1Done: boolean,
  step2Done: boolean,
  step3Done: boolean,
) {
  if (id === 1) return step1Done;
  if (id === 2) return step2Done;
  return step3Done;
}

export function GetStartedPanel({
  initialStatus,
}: {
  initialStatus: ZeroStatus;
}) {
  const [status, setStatus] = useState(initialStatus);
  const [device, setDevice] = useState<DeviceStart | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [funding, setFunding] = useState(false);
  const [togglingLive, setTogglingLive] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const step1Done = status.connected;
  const step2Done =
    status.connected &&
    status.balance != null &&
    Number.parseFloat(status.balance) > 0;
  const step3Done = status.liveEnabled;
  const doneCount = [step1Done, step2Done, step3Done].filter(Boolean).length;

  const [activeStep, setActiveStep] = useState<StepId>(() =>
    firstIncomplete(
      initialStatus.connected,
      initialStatus.connected &&
        initialStatus.balance != null &&
        Number.parseFloat(initialStatus.balance) > 0,
      initialStatus.liveEnabled,
    ),
  );
  const [pinned, setPinned] = useState(false);
  const directionRef = useRef(1);
  const prevDoneRef = useRef({ step1Done, step2Done, step3Done });

  useEffect(() => {
    const next = firstIncomplete(step1Done, step2Done, step3Done);
    const prev = prevDoneRef.current;
    prevDoneRef.current = { step1Done, step2Done, step3Done };

    const justCompleted =
      activeStep !== "done" &&
      !isStepDone(activeStep, prev.step1Done, prev.step2Done, prev.step3Done) &&
      isStepDone(activeStep, step1Done, step2Done, step3Done);

    if (justCompleted) {
      setPinned(false);
      directionRef.current =
        stepOrder(next) >= stepOrder(activeStep) ? 1 : -1;
      setActiveStep(next);
      return;
    }

    if (!pinned && activeStep !== next) {
      directionRef.current =
        stepOrder(next) >= stepOrder(activeStep) ? 1 : -1;
      setActiveStep(next);
    }
  }, [step1Done, step2Done, step3Done, pinned, activeStep]);

  const refreshStatus = useCallback(async () => {
    const res = await fetch("/api/zero/status");
    if (!res.ok) return;
    const data = (await res.json()) as ZeroStatus;
    setStatus(data);
  }, []);

  useEffect(() => {
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, []);

  function selectStep(id: 1 | 2 | 3) {
    const next = firstIncomplete(step1Done, step2Done, step3Done);
    const allowed =
      isStepDone(id, step1Done, step2Done, step3Done) || id === next;
    if (!allowed) return;
    directionRef.current = id >= (activeStep === "done" ? 3 : activeStep) ? 1 : -1;
    setPinned(true);
    setActiveStep(id);
  }

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
          await refreshStatus();
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
      toast.message("Complete funding in the new tab, then refresh balance.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Funding failed");
    } finally {
      setFunding(false);
    }
  }

  async function setLive(enabled: boolean) {
    setTogglingLive(true);
    try {
      const res = await fetch("/api/zero/live", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Could not update live mode");
      toast.success(enabled ? "Live Zero calls enabled" : "Back to demo mode");
      await refreshStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setTogglingLive(false);
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
      setPinned(false);
      await refreshStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const panelTitle =
    activeStep === "done"
      ? "Ready"
      : STEPS.find((s) => s.id === activeStep)?.label ?? "";

  return (
    <MotionConfig reducedMotion="user">
      <div className="mx-auto w-full max-w-md space-y-8">
        <div className="space-y-5">
          <h1 className="text-lg font-semibold tracking-tight">Get started</h1>

          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div
                className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted"
                role="progressbar"
                aria-valuenow={doneCount}
                aria-valuemin={0}
                aria-valuemax={3}
                aria-label="Setup progress"
              >
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${(doneCount / 3) * 100}%` }}
                  transition={{ type: "spring", stiffness: 260, damping: 28 }}
                />
              </div>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {doneCount} / 3
              </span>
            </div>

            <div className="flex items-center gap-1">
              {STEPS.map((step, i) => {
                const done = isStepDone(
                  step.id,
                  step1Done,
                  step2Done,
                  step3Done,
                );
                const next = firstIncomplete(step1Done, step2Done, step3Done);
                const selectable = done || step.id === next;
                const current =
                  activeStep === step.id ||
                  (activeStep === "done" && step.id === 3 && done);

                return (
                  <div key={step.id} className="flex min-w-0 flex-1 items-center">
                    {i > 0 ? (
                      <div
                        className={cn(
                          "mx-1 h-px flex-1",
                          done ||
                            isStepDone(
                              STEPS[i - 1]!.id,
                              step1Done,
                              step2Done,
                              step3Done,
                            )
                            ? "bg-primary/40"
                            : "bg-border",
                        )}
                      />
                    ) : null}
                    <button
                      type="button"
                      disabled={!selectable}
                      onClick={() => selectStep(step.id)}
                      className={cn(
                        "flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors",
                        selectable
                          ? "cursor-pointer"
                          : "cursor-not-allowed opacity-40",
                        current
                          ? "text-foreground"
                          : "text-muted-foreground",
                      )}
                    >
                      <span
                        className={cn(
                          "flex size-5 items-center justify-center rounded-full text-[10px] font-medium",
                          done
                            ? "bg-primary text-primary-foreground"
                            : current
                              ? "bg-foreground text-background"
                              : "bg-muted text-muted-foreground",
                        )}
                      >
                        {done ? (
                          <motion.span
                            key="check"
                            initial={{ scale: 0.5, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{
                              type: "spring",
                              stiffness: 400,
                              damping: 20,
                            }}
                            className="flex"
                          >
                            <Check className="size-3" />
                          </motion.span>
                        ) : (
                          step.id
                        )}
                      </span>
                      <span
                        className={cn(
                          "hidden sm:inline",
                          current && "font-medium",
                        )}
                      >
                        {step.label}
                      </span>
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        <div className="relative min-h-40">
          <AnimatePresence mode="wait" custom={directionRef.current}>
            <motion.div
              key={activeStep}
              custom={directionRef.current}
              variants={panelVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              className="space-y-5"
            >
              <h2 className="text-base font-medium">{panelTitle}</h2>

              {activeStep === 1 ? (
                step1Done && !device ? (
                  <div className="space-y-3">
                    <p className="text-sm font-medium">
                      {status.zeroEmail || status.zeroUserId || "Zero user"}
                    </p>
                    {status.walletAddress ? (
                      <p className="font-mono text-xs text-muted-foreground break-all">
                        {status.walletAddress}
                      </p>
                    ) : null}
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={disconnecting}
                      onClick={() => void disconnect()}
                    >
                      {disconnecting ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Disconnect
                    </Button>
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
                ) : (
                  <Button
                    disabled={connecting}
                    onClick={() => void startConnect()}
                  >
                    {connecting ? <Loader2 className="animate-spin" /> : null}
                    Connect
                  </Button>
                )
              ) : null}

              {activeStep === 2 ? (
                <div className="space-y-4">
                  <p className="text-sm tabular-nums">
                    <span className="text-muted-foreground">Balance </span>
                    <span className="font-medium">
                      {status.connected
                        ? status.balance != null
                          ? `$${Number.parseFloat(status.balance).toFixed(2)}`
                          : "—"
                        : "—"}
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      disabled={!status.connected || funding}
                      onClick={() => void fundWallet()}
                    >
                      {funding ? <Loader2 className="animate-spin" /> : null}
                      Add funds
                    </Button>
                    <Button
                      variant="outline"
                      disabled={!status.connected}
                      onClick={() => void refreshStatus()}
                    >
                      Refresh
                    </Button>
                  </div>
                </div>
              ) : null}

              {activeStep === 3 ? (
                <div className="space-y-4">
                  {status.demoMode ? (
                    <p className="text-sm text-muted-foreground">
                      Set <code className="text-xs">DEMO_MODE=false</code> in{" "}
                      <code className="text-xs">.env</code>
                    </p>
                  ) : null}
                  {status.liveEnabled ? (
                    <Button
                      variant="outline"
                      disabled={togglingLive || !status.connected}
                      onClick={() => void setLive(false)}
                    >
                      {togglingLive ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Disable live
                    </Button>
                  ) : (
                    <Button
                      disabled={
                        togglingLive || !status.connected || status.demoMode
                      }
                      onClick={() => void setLive(true)}
                    >
                      {togglingLive ? (
                        <Loader2 className="animate-spin" />
                      ) : null}
                      Enable live
                    </Button>
                  )}
                </div>
              ) : null}

              {activeStep === "done" ? (
                <div className="flex flex-wrap gap-2">
                  <Link
                    href="/new"
                    className={buttonVariants({ size: "default" })}
                  >
                    Create a role
                  </Link>
                  <Link
                    href="/tools"
                    className={buttonVariants({
                      variant: "outline",
                      size: "default",
                    })}
                  >
                    Browse tools
                  </Link>
                </div>
              ) : null}
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </MotionConfig>
  );
}

function stepOrder(step: StepId) {
  return step === "done" ? 4 : step;
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
