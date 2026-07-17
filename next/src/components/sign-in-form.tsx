"use client";

import { useEffect, useMemo, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { readLastEmail, writeLastEmail } from "@/lib/auth/last-email";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Fingerprint, Loader2 } from "lucide-react";

type EmailStatus = "idle" | "checking" | "new" | "existing";

function isValidEmail(value: string) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

export function SignInForm() {
    const [email, setEmail] = useState("");
    const [rememberedEmail, setRememberedEmail] = useState<string | null>(null);
    const [status, setStatus] = useState<EmailStatus>("idle");
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const hostOk = useMemo(() => {
        if (typeof window === "undefined") return true;
        const host = window.location.hostname;
        return host === "localhost" || host === "127.0.0.1";
    }, []);

    const effectiveEmail = email.trim() || rememberedEmail || "";
    const usingRemembered = !email.trim() && Boolean(rememberedEmail);

    useEffect(() => {
        const last = readLastEmail();
        if (last && isValidEmail(last)) setRememberedEmail(last);
    }, []);

    useEffect(() => {
        if (!isValidEmail(effectiveEmail)) {
            setStatus("idle");
            return;
        }

        const handle = window.setTimeout(async () => {
            setStatus("checking");
            try {
                const res = await fetch("/api/auth/check-email", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ email: effectiveEmail.trim().toLowerCase() }),
                });
                const data = (await res.json()) as {
                    registered?: boolean;
                    hasPasskey?: boolean;
                };
                setStatus(data.registered && data.hasPasskey ? "existing" : "new");
            } catch {
                setStatus("idle");
            }
        }, 350);

        return () => window.clearTimeout(handle);
    }, [effectiveEmail]);

    async function continueWithPasskey() {
        const target = effectiveEmail.trim().toLowerCase();
        if (!isValidEmail(target) || busy) return;
        if (status !== "new" && status !== "existing") return;

        setBusy(true);
        setError(null);

        try {
            if (!hostOk) {
                setError("Open http://localhost:3000 — passkeys require matching origin.");
                return;
            }

            if (status === "existing") {
                const { error: err } = await authClient.signIn.passkey({
                    autoFill: false,
                });
                if (err) {
                    setError(err.message || "Sign-in failed");
                    return;
                }
                writeLastEmail(target);
                window.location.href = "/home";
                return;
            }

            const { error: err } = await authClient.passkey.addPasskey({
                name: target,
                context: target,
            });
            if (err) {
                setError(err.message || "Could not create passkey");
                return;
            }
            writeLastEmail(target);
            window.location.href = "/home";
        } catch (e) {
            setError(e instanceof Error ? e.message : "Failed");
        } finally {
            setBusy(false);
        }
    }

    const ready = isValidEmail(effectiveEmail) && (status === "new" || status === "existing");
    const label =
        status === "existing" ? "Sign in" : status === "new" ? "Create account" : "Sign in";

    return (
        <div className="mx-auto flex w-full max-w-sm flex-col gap-5">
            <h1 className="font-instrument text-2xl tracking-tight">Roster</h1>
            {!hostOk ? (
                <p className="text-center text-sm text-destructive">
                    Use http://localhost:3000 (not a LAN IP) for passkeys in Safari.
                </p>
            ) : null}
            <Input
                type="email"
                placeholder={rememberedEmail ?? "you@company.com"}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username webauthn"
                disabled={busy}
                onKeyDown={(e) => {
                    if (e.key === "Enter" && ready) {
                        e.preventDefault();
                        void continueWithPasskey();
                    }
                }}
            />

            <Button
                onClick={continueWithPasskey}
                disabled={!ready || busy}
                className="w-full gap-2"
            >
                {busy || status === "checking" ? (
                    <Loader2 className="size-4 animate-spin" />
                ) : (
                    <Fingerprint className="size-4" />
                )}
                {label}
            </Button>
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
    );
}
