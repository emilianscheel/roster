"use client";

import { useEffect, useState, type ComponentType, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Briefcase,
  Building2,
  Calendar,
  ExternalLink,
  GraduationCap,
  Loader2,
  Mail,
  MapPin,
  Sparkles,
  XIcon,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  type PersonListItem,
  formatTimelineRange,
  personInitials,
} from "@/components/people/types";
import { listPersonLinks } from "@/lib/people-links";
import { PERSON_ENRICH_TOOLS } from "@/lib/zero/mock-person-enrich";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

type PersonDrawerProps = {
  person: PersonListItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onPersonUpdated?: (person: PersonListItem) => void;
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

export function PersonDrawer({
  person,
  open,
  onOpenChange,
  onPersonUpdated,
}: PersonDrawerProps) {
  const isMobile = useIsMobile();
  const router = useRouter();
  const [localPerson, setLocalPerson] = useState<PersonListItem | null>(person);
  const [runningToolId, setRunningToolId] = useState<string | null>(null);
  const [enrichError, setEnrichError] = useState<string | null>(null);

  useEffect(() => {
    setLocalPerson(person);
    setEnrichError(null);
    setRunningToolId(null);
  }, [person]);

  async function runEnrich(toolId: string) {
    if (!localPerson || runningToolId) return;
    setRunningToolId(toolId);
    setEnrichError(null);
    try {
      const res = await fetch(`/api/people/${localPerson.id}/enrich`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toolId }),
      });
      const data = (await res.json()) as {
        person?: PersonListItem;
        error?: string;
      };
      if (!res.ok || !data.person) {
        setEnrichError(data.error || "Enrichment failed");
        return;
      }
      setLocalPerson(data.person);
      onPersonUpdated?.(data.person);
      router.refresh();
    } catch {
      setEnrichError("Enrichment failed");
    } finally {
      setRunningToolId(null);
    }
  }

  const links = listPersonLinks(localPerson?.links);

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem] data-[swipe-axis=x]:[--drawer-content-width:100%]">
        {localPerson ? (
          <>
            <DrawerHeader className="relative border-b border-border pb-4">
              <div className="flex items-start gap-3 pr-8">
                <Avatar
                  size="lg"
                  className="size-14 after:rounded-full data-[size=lg]:size-14"
                >
                  {localPerson.imageUrl ? (
                    <AvatarImage
                      src={localPerson.imageUrl}
                      alt={localPerson.name}
                    />
                  ) : null}
                  <AvatarFallback className="text-base">
                    {personInitials(localPerson.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-lg">
                    {localPerson.name}
                  </DrawerTitle>
                  {localPerson.headline ? (
                    <DrawerDescription className="mt-1 text-left">
                      {localPerson.headline}
                    </DrawerDescription>
                  ) : (
                    <DrawerDescription className="sr-only">
                      Person profile
                    </DrawerDescription>
                  )}
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
                    <Sparkles className="size-3.5" />
                    Enrich profile
                  </h3>
                  <div className="grid gap-2">
                    {PERSON_ENRICH_TOOLS.map((tool) => {
                      const running = runningToolId === tool.id;
                      return (
                        <button
                          key={tool.id}
                          type="button"
                          disabled={Boolean(runningToolId)}
                          onClick={() => void runEnrich(tool.id)}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/40 disabled:opacity-60",
                            running && "border-ring ring-1 ring-ring/40",
                          )}
                        >
                          <div className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                            {running ? (
                              <Loader2 className="size-4 animate-spin" />
                            ) : (
                              <Sparkles className="size-4" />
                            )}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-sm font-medium">{tool.name}</div>
                            <div className="mt-0.5 text-xs text-muted-foreground">
                              {running ? "Running…" : tool.blurb}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                  {enrichError ? (
                    <p className="text-sm text-destructive">{enrichError}</p>
                  ) : null}
                </section>

                <Separator />

                <section className="space-y-3">
                  <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    Profile
                  </h3>
                  <div className="space-y-3">
                    {localPerson.email ? (
                      <FieldRow icon={Mail} label="Email">
                        <a
                          href={`mailto:${localPerson.email}`}
                          className="text-foreground underline-offset-2 hover:underline"
                        >
                          {localPerson.email}
                        </a>
                      </FieldRow>
                    ) : null}
                    {localPerson.location ? (
                      <FieldRow icon={MapPin} label="Location">
                        {localPerson.location}
                      </FieldRow>
                    ) : null}
                    <FieldRow icon={Calendar} label="Last seen">
                      {new Date(localPerson.lastSeenAt).toLocaleString()}
                    </FieldRow>
                  </div>
                </section>

                {links.length > 0 ? (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Links
                      </h3>
                      <div className="grid gap-2">
                        {links.map((link) => {
                          const Icon = link.icon;
                          return (
                            <a
                              key={link.key}
                              href={link.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block"
                            >
                              <Card
                                size="sm"
                                className="transition-colors hover:bg-accent/40"
                              >
                                <CardContent className="flex items-center gap-3 py-0">
                                  <div className="flex size-9 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                                    <Icon className="size-4" />
                                  </div>
                                  <div className="min-w-0 flex-1">
                                    <div className="text-sm font-medium">
                                      {link.label}
                                    </div>
                                    <div className="truncate text-xs text-muted-foreground">
                                      {link.displayHost}
                                    </div>
                                  </div>
                                  <ExternalLink className="size-3.5 shrink-0 text-muted-foreground" />
                                </CardContent>
                              </Card>
                            </a>
                          );
                        })}
                      </div>
                    </section>
                  </>
                ) : null}

                <Separator />

                <section className="space-y-3">
                  <h3 className="flex items-center gap-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                    <Briefcase className="size-3.5" />
                    Experience
                  </h3>
                  {localPerson.experiences.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No experience recorded
                    </p>
                  ) : (
                    <ol className="relative ml-3 space-y-0 border-l border-border">
                      {localPerson.experiences.map((exp) => (
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
                  {localPerson.education.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      No education recorded
                    </p>
                  ) : (
                    <ol className="relative ml-3 space-y-0 border-l border-border">
                      {localPerson.education.map((edu) => {
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

                {(localPerson.rawText || localPerson.notes) && (
                  <>
                    <Separator />
                    <section className="space-y-3">
                      <h3 className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
                        Plain text
                      </h3>
                      {localPerson.notes ? (
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">
                            Notes
                          </div>
                          <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                            {localPerson.notes}
                          </pre>
                        </div>
                      ) : null}
                      {localPerson.rawText ? (
                        <div>
                          <div className="mb-1 text-xs text-muted-foreground">
                            Source profile
                          </div>
                          <pre className="whitespace-pre-wrap rounded-md bg-muted/50 p-3 font-mono text-xs leading-relaxed">
                            {localPerson.rawText}
                          </pre>
                        </div>
                      ) : null}
                    </section>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
