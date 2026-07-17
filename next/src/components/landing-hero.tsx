"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { GradientCanvas } from "@/components/gradient-canvas";
import { Button } from "@/components/ui/button";

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

  useEffect(() => {
    const id = window.setInterval(() => {
      setIndex((i) => (i + 1) % HEADLINES.length);
    }, ROTATE_MS);
    return () => window.clearInterval(id);
  }, [index]);

  const advance = () => {
    setIndex((i) => (i + 1) % HEADLINES.length);
  };

  return (
    <GradientCanvas className="h-svh overflow-hidden">
      <div className="relative flex h-full w-full flex-col items-center overflow-hidden">
        <p className="absolute top-10 left-1/2 -translate-x-1/2 font-instrument text-3xl tracking-tight text-white md:top-14">
          Roster
        </p>

        <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
          <button
            type="button"
            onClick={advance}
            className="cursor-pointer text-center outline-none focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label="Next headline"
          >
            <span className="relative flex h-10 w-[min(92vw,36rem)] items-center justify-center">
              <AnimatePresence mode="wait">
                <motion.h1
                  key={HEADLINES[index]}
                  initial={{ opacity: 0, filter: "blur(10px)" }}
                  animate={{ opacity: 1, filter: "blur(0px)" }}
                  exit={{ opacity: 0, filter: "blur(10px)" }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                  className="absolute inset-x-0 font-sans text-3xl font-medium tracking-wide text-white uppercase"
                >
                  {HEADLINES[index]}
                </motion.h1>
              </AnimatePresence>
            </span>
          </button>

          <Button
            nativeButton={false}
            render={<Link href="/sign-in" />}
            size="lg"
            className="bg-white text-neutral-900 hover:bg-white/90"
          >
            Get Started
          </Button>
        </div>
      </div>
    </GradientCanvas>
  );
}
