"use client";

import type { ComponentType, ReactNode } from "react";
import {
  Briefcase,
  Building2,
  Calendar,
  GraduationCap,
  Link2,
  Mail,
  MapPin,
  XIcon,
} from "lucide-react";
import { CompanyLogo } from "@/components/company-logo";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  type PersonListItem,
  formatTimelineRange,
  personInitials,
} from "@/components/people/types";
import { useIsMobile } from "@/hooks/use-mobile";

type PersonDrawerProps = {
  person: PersonListItem | null;
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

export function PersonDrawer({ person, open, onOpenChange }: PersonDrawerProps) {
  const isMobile = useIsMobile();

  return (
    <Drawer
      open={open}
      onOpenChange={onOpenChange}
      swipeDirection={isMobile ? "down" : "right"}
      showSwipeHandle={isMobile}
    >
      <DrawerContent className="data-[swipe-axis=x]:sm:[--drawer-content-width:28rem] data-[swipe-axis=x]:[--drawer-content-width:100%]">
        {person ? (
          <>
            <DrawerHeader className="relative border-b border-border pb-4">
              <div className="flex items-start gap-3 pr-8">
                <Avatar size="lg" className="size-14 after:rounded-full data-[size=lg]:size-14">
                  {person.imageUrl ? (
                    <AvatarImage src={person.imageUrl} alt={person.name} />
                  ) : null}
                  <AvatarFallback className="text-base">
                    {personInitials(person.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <DrawerTitle className="text-lg">{person.name}</DrawerTitle>
                  {person.headline ? (
                    <DrawerDescription className="mt-1 text-left">
                      {person.headline}
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
                    <FieldRow icon={Calendar} label="Last seen">
                      {new Date(person.lastSeenAt).toLocaleString()}
                    </FieldRow>
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
                    <ol className="relative space-y-0 border-l border-border ml-3">
                      {person.experiences.map((exp) => (
                        <li key={exp.id} className="relative pb-5 pl-6 last:pb-0">
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
              </div>
            </ScrollArea>
          </>
        ) : null}
      </DrawerContent>
    </Drawer>
  );
}
