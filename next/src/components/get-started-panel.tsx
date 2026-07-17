"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ExternalLink, Loader2, Check } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
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
      await refreshStatus();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Disconnect failed");
    } finally {
      setDisconnecting(false);
    }
  }

  const step1Done = status.connected;
  const step2Done =
    status.connected &&
    status.balance != null &&
    Number.parseFloat(status.balance) > 0;
  const step3Done = status.liveEnabled;

  return (
    <div className="mx-auto max-w-xl space-y-8">
      <div>
        <h1 className="text-lg font-semibold">Get started with Zero</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Connect a{" "}
          <a
            href="https://www.zero.xyz"
            target="_blank"
            rel="noreferrer"
            className="underline underline-offset-2"
          >
            zero.xyz
          </a>{" "}
          account so Roster can discover and pay for recruiting data services.
          You can keep using demo mode until you go live.
        </p>
      </div>

      <ol className="space-y-4">
        <Step
          n={1}
          title="Connect Zero"
          done={step1Done}
          active={!step1Done || Boolean(device)}
        >
          {step1Done && !device ? (
            <div className="space-y-2 text-sm">
              <p>
                Connected as{" "}
                <span className="font-medium">
                  {status.zeroEmail || status.zeroUserId || "Zero user"}
                </span>
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
          ) : (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Authorize Roster in your browser. First sign-in creates a Zero
                account automatically.
              </p>
              {device ? (
                <div className="rounded-lg border border-border p-3 text-sm space-y-2">
                  <p>
                    Code:{" "}
                    <span className="font-mono text-base tracking-wider">
                      {device.userCode}
                    </span>
                  </p>
                  <a
                    href={device.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-sm underline underline-offset-2"
                  >
                    Open authorization page
                    <ExternalLink className="size-3.5" />
                  </a>
                  <p className="flex items-center gap-2 text-muted-foreground">
                    <Loader2 className="size-3.5 animate-spin" />
                    Waiting for authorization…
                  </p>
                </div>
              ) : (
                <Button
                  size="sm"
                  disabled={connecting}
                  onClick={() => void startConnect()}
                >
                  {connecting ? <Loader2 className="animate-spin" /> : null}
                  Connect Zero account
                </Button>
              )}
            </div>
          )}
        </Step>

        <Step
          n={2}
          title="Fund wallet"
          done={step2Done}
          active={step1Done && !step3Done}
        >
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              Paid enrichment draws USDC from your Zero wallet. New accounts
              often start with welcome credit.
            </p>
            <p>
              Balance:{" "}
              <span className="font-medium tabular-nums">
                {status.connected
                  ? status.balance != null
                    ? `$${Number.parseFloat(status.balance).toFixed(2)} USDC`
                    : "—"
                  : "Connect first"}
              </span>
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={!status.connected || funding}
                onClick={() => void fundWallet()}
              >
                {funding ? <Loader2 className="animate-spin" /> : null}
                Add funds
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!status.connected}
                onClick={() => void refreshStatus()}
              >
                Refresh balance
              </Button>
            </div>
          </div>
        </Step>

        <Step n={3} title="Go live" done={step3Done} active={step1Done}>
          <div className="space-y-3 text-sm">
            <p className="text-muted-foreground">
              When live, research calls use Zero search/fetch and settle
              payments. Contact unlock and outreach still require Approvals.
            </p>
            {status.demoMode ? (
              <p className="rounded-lg border border-border px-3 py-2 text-muted-foreground">
                Global <code className="text-xs">DEMO_MODE=true</code> is on.
                Set <code className="text-xs">DEMO_MODE=false</code> in{" "}
                <code className="text-xs">.env</code> to enable live calls.
              </p>
            ) : null}
            <div className="flex flex-wrap gap-2">
              {status.liveEnabled ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={togglingLive || !status.connected}
                  onClick={() => void setLive(false)}
                >
                  {togglingLive ? <Loader2 className="animate-spin" /> : null}
                  Disable live
                </Button>
              ) : (
                <Button
                  size="sm"
                  disabled={
                    togglingLive || !status.connected || status.demoMode
                  }
                  onClick={() => void setLive(true)}
                >
                  {togglingLive ? <Loader2 className="animate-spin" /> : null}
                  Enable live Zero
                </Button>
              )}
              <Button variant="outline" size="sm" nativeButton={false} render={<Link href="/new" />}>
                Create a role
              </Button>
              <Button
                variant="ghost"
                size="sm"
                nativeButton={false}
                render={<Link href="/tools" />}
              >
                Browse tools
              </Button>
            </div>
          </div>
        </Step>
      </ol>
    </div>
  );
}

function Step({
  n,
  title,
  done,
  active,
  children,
}: {
  n: number;
  title: string;
  done: boolean;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <li
      className={cn(
        "rounded-lg border border-border p-4",
        active && !done && "border-foreground/30",
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <span
          className={cn(
            "flex size-6 items-center justify-center rounded-full text-xs font-medium",
            done
              ? "bg-primary text-primary-foreground"
              : "bg-muted text-muted-foreground",
          )}
        >
          {done ? <Check className="size-3.5" /> : n}
        </span>
        <h2 className="text-sm font-medium">{title}</h2>
      </div>
      {children}
    </li>
  );
}
