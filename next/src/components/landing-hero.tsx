"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import useKeypress from "react-use-keypress";
import { GradientCanvas } from "@/components/gradient-canvas";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const HEADLINES = [
  "HIRE WITH REAL EVIDENCE",
  "FIND PROVEN TALENT FAST",
  "RECRUIT ON VERIFIED SIGNAL",
  "BUILD TEAMS YOU CAN TRUST",
  "EVIDENCE BACKED HIRING OPS",
] as const;

const ROTATE_MS = 3000;

export function LandingHero() {
  const [index, setIndex] = useState(0);

  const advance = () => {
    setIndex((i) => (i + 1) % HEADLINES.length);
  };

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HEADLINES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [index]);

  useKeypress(["Enter", " "], (event) => {
    const target = event.target as HTMLElement | null;
    if (target?.closest("a, input, textarea, select")) return;
    event.preventDefault();
    advance();
  });

  return (
    <GradientCanvas className="h-svh overflow-hidden">
      <div className="relative flex h-full w-full flex-col items-center overflow-hidden text-white">
        <Link
          href="/"
          className="absolute top-12 left-1/2 -translate-x-1/2 select-none font-instrument text-3xl tracking-tight text-white md:top-14 md:text-4xl"
        >
          Roster
        </Link>

        <div className="flex w-full max-w-5xl flex-1 flex-col items-center justify-center gap-10 px-6">
          <div
            role="presentation"
            onClick={advance}
            className="w-full cursor-pointer text-center text-white select-none"
          >
            <div className="relative flex min-h-14 w-full items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={HEADLINES[index]}
                  initial={{ opacity: 0, filter: "blur(10px)", y: 18 }}
                  animate={{ opacity: 1, filter: "blur(0px)", y: 0 }}
                  exit={{ opacity: 0, filter: "blur(10px)", y: -18 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="w-full text-center font-sans text-3xl font-medium tracking-normal whitespace-nowrap text-white uppercase md:text-4xl"
                >
                  {HEADLINES[index]}
                </motion.h1>
              </AnimatePresence>
            </div>
          </div>

          <Link
            href="/sign-in"
            className={cn(
              buttonVariants({ size: "lg" }),
              "bg-white text-neutral-900 hover:bg-white/90 hover:text-neutral-900",
            )}
          >
            Get Started
          </Link>
        </div>
      </div>
    </GradientCanvas>
  );
}
