"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Activity,
  Briefcase,
  Building2,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  ShieldCheck,
  XIcon,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import {
  formatTimelineRange,
  personInitials,
} from "@/components/people/types";
import type { PipelineCandidate } from "@/components/pipeline/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

type CandidateDrawerProps = {
  candidate: PipelineCandidate | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

function FieldRow({
  icon: Icon,
  label,
  children,
}: {
  icon: ComponentType<{ className?: string }>;
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="flex gap-3">
      <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
        <Icon className="size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{label}</div>
        <div className="text-sm break-words">{children}</div>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/50 px-3 py-2">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm font-medium tabular-nums">{value}</div>
    </div>
  );
}

export function CandidateDrawer({
  candidate,
  open,
  onOpenChange,
}: CandidateDrawerProps) {
  const isMobile = useIsMobile();
  const person = candidate?.person ?? null;
  const displayName = person?.name ?? candidate?.name ?? "";
  const displayHeadline = person?.headline ?? candidate?.headline;
  const imageUrl = person?.imageUrl ?? null;

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem] data-[swipe-axis=x]:[--drawer-content-width:100%]">
        {candidate ? (
          <>
            <DrawerHeader className="relative border-b border-border pb-4">
              <div className="flex items-start gap-3 pr-8">
                <Avatar
                  size="lg"
                  className="size-14 after:rounded-full data-[size=lg]:size-14"
                >
                  {imageUrl ? (
                    <AvatarImage src={imageUrl} alt={displayName} />
                  ) : null}
                  <AvatarFallback className="text-base">
                    {personInitials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-lg">{displayName}</DrawerTitle>
                  {displayHeadline ? (
                    <DrawerDescription className="mt-1 text-left">
                      {displayHeadline}
                    </DrawerDescription>
                  ) : (
                    <DrawerDescription className="sr-only">
                      Candidate details
                    </DrawerDescription>
                  )}
                  <div className="mt-2">
                    <Badge variant="secondary" className="capitalize">
                      {candidate.stage}
                    </Badge>
                  </div>
                </div>
              </div>
              <DrawerClose
                render={
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="absolute top-3 right-3"
                    aria-label="Close"
                  />
                }
              >
                <XIcon className="size-4" />
              </DrawerClose>
            </DrawerHeader>

            <ScrollArea className="flex-1">
              <div className="space-y-6 p-4">
                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <Activity className="size-3.5" />
                    Candidate status
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    <Stat
                      label="Match"
                      value={`${(candidate.matchScore * 100).toFixed(0)}%`}
                    />
                    <Stat
                      label="Evidence"
                      value={`${(candidate.evidenceConfidence * 100).toFixed(0)}%`}
                    />
                    <Stat
                      label="Spend"
                      value={`$${(candidate.verificationSpendCents / 100).toFixed(2)}`}
                    />
                    <Stat
                      label="Freshness"
                      value={
                        candidate.freshnessDays != null
                          ? `${candidate.freshnessDays}d`
                          : "—"
                      }
                    />
                  </div>
                  <div className="space-y-3">
                    <FieldRow icon={ShieldCheck} label="Contact unlocked">
                      {candidate.contactUnlocked ? "Yes" : "No"}
                    </FieldRow>
                    {candidate.currentAction ? (
                      <FieldRow icon={Activity} label="Current action">
                        {candidate.currentAction}
                      </FieldRow>
                    ) : null}
                    {candidate.strongestSignal ? (
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          Strongest signal
                        </div>
                        <p className="text-sm">{candidate.strongestSignal}</p>
                      </div>
                    ) : null}
                    {candidate.missingRequirements.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          Missing requirements
                        </div>
                        <ul className="list-inside list-disc text-sm text-muted-foreground">
                          {candidate.missingRequirements.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {candidate.contradictions.length > 0 ? (
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          Contradictions
                        </div>
                        <ul className="list-inside list-disc text-sm text-destructive">
                          {candidate.contradictions.map((item) => (
                            <li key={item}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    {candidate.outreachDraft ? (
                      <div>
                        <div className="mb-1 text-xs text-muted-foreground">
                          Outreach draft
                        </div>
                        <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                          {candidate.outreachDraft}
                        </pre>
                      </div>
                    ) : null}
                  </div>
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Evidence
                  </h3>
                  {candidate.evidence.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No evidence yet
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {candidate.evidence.map((item) => (
                        <div
                          key={item.id}
                          className="space-y-2 rounded-lg border border-border p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-sm font-medium">
                              {item.claimLabel}
                            </span>
                            <Badge variant="secondary">{item.status}</Badge>
                          </div>
                          <div className="text-xs text-muted-foreground tabular-nums">
                            {(item.confidence * 100).toFixed(0)}% · $
                            {Number(item.costCents).toFixed(3)}
                            {item.newestEvidenceDays != null
                              ? ` · ${item.newestEvidenceDays}d`
                              : ""}
                          </div>
                          {item.sources.length > 0 ? (
                            <ul className="list-inside list-disc text-xs text-muted-foreground">
                              {item.sources.map((source, i) => (
                                <li key={`${item.id}-src-${i}`}>
                                  {source.url ? (
                                    <a
                                      href={source.url}
                                      target="_blank"
                                      rel="noreferrer"
                                      className="underline-offset-2 hover:underline"
                                    >
                                      {source.title}
                                    </a>
                                  ) : (
                                    source.title
                                  )}
                                </li>
                              ))}
                            </ul>
                          ) : null}
                          {item.supporting ? (
                            <p className="text-xs text-muted-foreground">
                              {item.supporting}
                            </p>
                          ) : null}
                          {item.contradicting ? (
                            <p className="text-xs text-destructive">
                              {item.contradicting}
                            </p>
                          ) : null}
                          {item.recommendation ? (
                            <p className="text-xs text-muted-foreground">
                              {item.recommendation}
                            </p>
                          ) : null}
                        </div>
                      ))}
                    </div>
                  )}
                </section>

                {person ? (
                  <>
                    <Separator />

                    <section className="space-y-3">
                      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Profile
                      </h3>
                      <div className="space-y-3">
                        {person.email ? (
                          <FieldRow icon={Mail} label="Email">
                            <a
                              href={`mailto:${person.email}`}
                              className="text-foreground underline-offset-2 hover:underline"
                            >
                              {person.email}
                            </a>
                          </FieldRow>
                        ) : null}
                        {person.location ? (
                          <FieldRow icon={MapPin} label="Location">
                            {person.location}
                          </FieldRow>
                        ) : null}
                        {person.links?.linkedin ? (
                          <FieldRow icon={Link2} label="LinkedIn">
                            <a
                              href={person.links.linkedin}
                              target="_blank"
                              rel="noreferrer"
                              className="text-foreground underline-offset-2 hover:underline"
                            >
                              {person.links.linkedin.replace(/^https?:\/\//, "")}
                            </a>
                          </FieldRow>
                        ) : null}
                        {Object.entries(person.links ?? {})
                          .filter(([key]) => key !== "linkedin")
                          .map(([key, url]) => (
                            <FieldRow key={key} icon={Link2} label={key}>
                              <a
                                href={url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-foreground underline-offset-2 hover:underline"
                              >
                                {url.replace(/^https?:\/\//, "")}
                              </a>
                            </FieldRow>
                          ))}
                      </div>
                    </section>

                    <Separator />

                    <section className="space-y-3">
                      <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <Briefcase className="size-3.5" />
                        Experience
                      </h3>
                      {person.experiences.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No experience recorded
                        </p>
                      ) : (
                        <ol className="relative ml-3 space-y-0 border-l border-border">
                          {person.experiences.map((exp) => (
                            <li
                              key={exp.id}
                              className="relative pb-5 pl-6 last:pb-0"
                            >
                              <span className="absolute top-1 -left-[9px] flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                                <Building2 className="size-2.5 text-muted-foreground" />
                              </span>
                              <div className="flex gap-3">
                                <CompanyLogo
                                  name={exp.companyName}
                                  domain={exp.companyDomain}
                                  size={36}
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="font-medium">{exp.title}</div>
                                  <div className="text-sm text-muted-foreground">
                                    {exp.companyName}
                                  </div>
                                  <div className="mt-0.5 text-xs text-muted-foreground">
                                    {formatTimelineRange(
                                      exp.startDate,
                                      exp.endDate,
                                      exp.isCurrent,
                                    )}
                                  </div>
                                  {exp.description ? (
                                    <p className="mt-1.5 text-sm text-muted-foreground">
                                      {exp.description}
                                    </p>
                                  ) : null}
                                </div>
                              </div>
                            </li>
                          ))}
                        </ol>
                      )}
                    </section>

                    <Separator />

                    <section className="space-y-3">
                      <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        <GraduationCap className="size-3.5" />
                        Education
                      </h3>
                      {person.education.length === 0 ? (
                        <p className="text-sm text-muted-foreground">
                          No education recorded
                        </p>
                      ) : (
                        <ol className="relative ml-3 space-y-0 border-l border-border">
                          {person.education.map((edu) => {
                            const degreeLine = [edu.degree, edu.field]
                              .filter(Boolean)
                              .join(", ");
                            return (
                              <li
                                key={edu.id}
                                className="relative pb-5 pl-6 last:pb-0"
                              >
                                <span className="absolute top-1 -left-[9px] flex size-4 items-center justify-center rounded-full bg-background ring-2 ring-border">
                                  <GraduationCap className="size-2.5 text-muted-foreground" />
                                </span>
                                <div className="flex gap-3">
                                  <CompanyLogo
                                    name={edu.schoolName}
                                    domain={edu.schoolDomain}
                                    size={36}
                                  />
                                  <div className="min-w-0 flex-1">
                                    <div className="font-medium">
                                      {edu.schoolName}
                                    </div>
                                    {degreeLine ? (
                                      <div className="text-sm text-muted-foreground">
                                        {degreeLine}
                                      </div>
                                    ) : null}
                                    <div className="mt-0.5 text-xs text-muted-foreground">
                                      {formatTimelineRange(
                                        edu.startDate,
                                        edu.endDate,
                                      )}
                                    </div>
                                    {edu.description ? (
                                      <p className="mt-1.5 text-sm text-muted-foreground">
                                        {edu.description}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                    </section>

                    {(person.rawText || person.notes) && (
                      <>
                        <Separator />
                        <section className="space-y-3">
                          <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                            Plain text
                          </h3>
                          {person.notes ? (
                            <div>
                              <div className="mb-1 text-xs text-muted-foreground">
                                Notes
                              </div>
                              <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                                {person.notes}
                              </pre>
                            </div>
                          ) : null}
                          {person.rawText ? (
                            <div>
                              <div className="mb-1 text-xs text-muted-foreground">
                                Source profile
                              </div>
                              <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                                {person.rawText}
                              </pre>
                            </div>
                          ) : null}
                        </section>
                      </>
                    )}
                  </>
                ) : null}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
