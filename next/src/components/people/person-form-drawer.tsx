"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { PersonListItem } from "@/components/people/types";
import type { PersonPayload } from "@/lib/people/person-payload";
import { cn } from "@/lib/utils";

const STEPS = [
  { id: "profile", title: "Profile", description: "Name and basic details" },
  { id: "links", title: "Links", description: "Social and web profiles" },
  { id: "experience", title: "Experience", description: "Career history" },
  { id: "education", title: "Education", description: "Schools and degrees" },
  { id: "notes", title: "Notes", description: "Notes and source text" },
] as const;

type ExperienceDraft = {
  companyName: string;
  companyDomain: string;
  title: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  description: string;
};

type EducationDraft = {
  schoolName: string;
  schoolDomain: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  description: string;
};

type FormState = {
  name: string;
  email: string;
  headline: string;
  location: string;
  imageUrl: string;
  linkedin: string;
  twitter: string;
  github: string;
  website: string;
  notes: string;
  rawText: string;
  experiences: ExperienceDraft[];
  education: EducationDraft[];
};

const emptyExperience = (): ExperienceDraft => ({
  companyName: "",
  companyDomain: "",
  title: "",
  startDate: "",
  endDate: "",
  isCurrent: false,
  description: "",
});

const emptyEducation = (): EducationDraft => ({
  schoolName: "",
  schoolDomain: "",
  degree: "",
  field: "",
  startDate: "",
  endDate: "",
  description: "",
});

function emptyForm(): FormState {
  return {
    name: "",
    email: "",
    headline: "",
    location: "",
    imageUrl: "",
    linkedin: "",
    twitter: "",
    github: "",
    website: "",
    notes: "",
    rawText: "",
    experiences: [],
    education: [],
  };
}

function fromPerson(person: PersonListItem): FormState {
  const links = person.links ?? {};
  return {
    name: person.name ?? "",
    email: person.email ?? "",
    headline: person.headline ?? "",
    location: person.location ?? "",
    imageUrl: person.imageUrl ?? "",
    linkedin: links.linkedin ?? "",
    twitter: links.twitter ?? links.x ?? "",
    github: links.github ?? "",
    website: links.personal ?? links.website ?? links.portfolio ?? "",
    notes: person.notes ?? "",
    rawText: person.rawText ?? "",
    experiences: person.experiences.map((e) => ({
      companyName: e.companyName,
      companyDomain: e.companyDomain ?? "",
      title: e.title,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      isCurrent: e.isCurrent,
      description: e.description ?? "",
    })),
    education: person.education.map((e) => ({
      schoolName: e.schoolName,
      schoolDomain: e.schoolDomain ?? "",
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      description: e.description ?? "",
    })),
  };
}

function fromPayload(payload: PersonPayload): FormState {
  const links = payload.links ?? {};
  return {
    name: payload.name ?? "",
    email: payload.email ?? "",
    headline: payload.headline ?? "",
    location: payload.location ?? "",
    imageUrl: payload.imageUrl ?? "",
    linkedin: links.linkedin ?? "",
    twitter: links.twitter ?? links.x ?? "",
    github: links.github ?? "",
    website: links.personal ?? links.website ?? links.portfolio ?? "",
    notes: payload.notes ?? "",
    rawText: payload.rawText ?? "",
    experiences: (payload.experiences ?? []).map((e) => ({
      companyName: e.companyName,
      companyDomain: e.companyDomain ?? "",
      title: e.title,
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      isCurrent: e.isCurrent ?? false,
      description: e.description ?? "",
    })),
    education: (payload.education ?? []).map((e) => ({
      schoolName: e.schoolName,
      schoolDomain: e.schoolDomain ?? "",
      degree: e.degree ?? "",
      field: e.field ?? "",
      startDate: e.startDate ?? "",
      endDate: e.endDate ?? "",
      description: e.description ?? "",
    })),
  };
}

function toPayload(form: FormState): PersonPayload {
  const links: Record<string, string> = {};
  if (form.linkedin.trim()) links.linkedin = form.linkedin.trim();
  if (form.twitter.trim()) links.twitter = form.twitter.trim();
  if (form.github.trim()) links.github = form.github.trim();
  if (form.website.trim()) links.personal = form.website.trim();

  return {
    name: form.name.trim(),
    email: form.email.trim() || null,
    headline: form.headline.trim() || null,
    location: form.location.trim() || null,
    imageUrl: form.imageUrl.trim() || null,
    links,
    notes: form.notes.trim() || null,
    rawText: form.rawText.trim() || null,
    experiences: form.experiences
      .filter((e) => e.companyName.trim() && e.title.trim())
      .map((e) => ({
        companyName: e.companyName.trim(),
        companyDomain: e.companyDomain.trim() || null,
        title: e.title.trim(),
        startDate: e.startDate.trim() || null,
        endDate: e.endDate.trim() || null,
        isCurrent: e.isCurrent,
        description: e.description.trim() || null,
      })),
    education: form.education
      .filter((e) => e.schoolName.trim())
      .map((e) => ({
        schoolName: e.schoolName.trim(),
        schoolDomain: e.schoolDomain.trim() || null,
        degree: e.degree.trim() || null,
        field: e.field.trim() || null,
        startDate: e.startDate.trim() || null,
        endDate: e.endDate.trim() || null,
        description: e.description.trim() || null,
      })),
  };
}

type PersonFormDrawerProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: "create" | "edit";
  person?: PersonListItem | null;
  /** Prefill from refine API without requiring a saved person shape */
  initialPayload?: PersonPayload | null;
  personId?: string | null;
  onSaved?: (person: PersonListItem) => void;
};

function Field({
  label,
  htmlFor,
  children,
}: {
  label: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="text-sm font-medium">
        {label}
      </label>
      {children}
    </div>
  );
}

function initialFormState(
  mode: "create" | "edit",
  person?: PersonListItem | null,
  initialPayload?: PersonPayload | null,
): FormState {
  if (initialPayload) return fromPayload(initialPayload);
  if (mode === "edit" && person) return fromPerson(person);
  return emptyForm();
}

export function PersonFormDrawer({
  open,
  onOpenChange,
  mode,
  person,
  initialPayload,
  personId,
  onSaved,
}: PersonFormDrawerProps) {
  const [stepIndex, setStepIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [form, setForm] = useState<FormState>(() =>
    initialFormState(mode, person, initialPayload),
  );
  const [saving, setSaving] = useState(false);

  const step = STEPS[stepIndex]!;
  const isLast = stepIndex === STEPS.length - 1;

  function goTo(next: number) {
    setDirection(next > stepIndex ? 1 : -1);
    setStepIndex(next);
  }

  function update<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave() {
    if (!form.name.trim() || saving) return;
    setSaving(true);
    try {
      const payload = toPayload(form);
      const editId = personId ?? person?.id;
      const res =
        mode === "create"
          ? await fetch("/api/people", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            })
          : await fetch(`/api/people/${editId}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(payload),
            });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || "Failed to save person");
      }

      onSaved?.(data.person as PersonListItem);
      onOpenChange(false);
      toast.success(mode === "create" ? "Person added" : "Person updated");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  function handleNext() {
    if (step.id === "profile" && !form.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (isLast) {
      void handleSave();
      return;
    }
    goTo(stepIndex + 1);
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange} swipeDirection="right">
      <DrawerContent className="data-[swipe-direction=right]:[--drawer-content-width:min(100%,28rem)]">
        <div className="flex h-full min-h-0 flex-1 flex-col">
          <DrawerHeader>
            <DrawerTitle>
              {mode === "create" ? "Add person" : "Edit person"}
            </DrawerTitle>
            <DrawerDescription>
              {step.title} — {step.description}
            </DrawerDescription>
            <div className="mt-2 flex gap-1">
              {STEPS.map((s, i) => (
                <button
                  key={s.id}
                  type="button"
                  aria-label={s.title}
                  onClick={() => goTo(i)}
                  className={cn(
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= stepIndex ? "bg-primary" : "bg-muted",
                  )}
                />
              ))}
            </div>
          </DrawerHeader>

          <div className="relative min-h-0 flex-1 overflow-hidden">
            <AnimatePresence initial={false} mode="popLayout" custom={direction}>
              <motion.div
                key={step.id}
                custom={direction}
                variants={{
                  enter: (d: number) => ({
                    x: d > 0 ? 24 : d < 0 ? -24 : 0,
                    opacity: 0,
                  }),
                  center: { x: 0, opacity: 1 },
                  exit: (d: number) => ({
                    x: d > 0 ? -24 : d < 0 ? 24 : 0,
                    opacity: 0,
                  }),
                }}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ type: "spring", stiffness: 380, damping: 34 }}
                className="absolute inset-0 overflow-y-auto p-4"
              >
                {step.id === "profile" ? (
                  <div className="space-y-3">
                    <Field label="Name" htmlFor="person-name">
                      <Input
                        id="person-name"
                        value={form.name}
                        onChange={(e) => update("name", e.target.value)}
                        placeholder="Full name"
                        autoFocus
                        required
                      />
                    </Field>
                    <Field label="Email" htmlFor="person-email">
                      <Input
                        id="person-email"
                        type="email"
                        value={form.email}
                        onChange={(e) => update("email", e.target.value)}
                        placeholder="name@example.com"
                      />
                    </Field>
                    <Field label="Headline" htmlFor="person-headline">
                      <Input
                        id="person-headline"
                        value={form.headline}
                        onChange={(e) => update("headline", e.target.value)}
                        placeholder="Current role or tagline"
                      />
                    </Field>
                    <Field label="Location" htmlFor="person-location">
                      <Input
                        id="person-location"
                        value={form.location}
                        onChange={(e) => update("location", e.target.value)}
                        placeholder="City, Country"
                      />
                    </Field>
                    <Field label="Image URL" htmlFor="person-image">
                      <Input
                        id="person-image"
                        value={form.imageUrl}
                        onChange={(e) => update("imageUrl", e.target.value)}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                ) : null}

                {step.id === "links" ? (
                  <div className="space-y-3">
                    <Field label="LinkedIn" htmlFor="person-linkedin">
                      <Input
                        id="person-linkedin"
                        value={form.linkedin}
                        onChange={(e) => update("linkedin", e.target.value)}
                        placeholder="linkedin.com/in/…"
                      />
                    </Field>
                    <Field label="X / Twitter" htmlFor="person-twitter">
                      <Input
                        id="person-twitter"
                        value={form.twitter}
                        onChange={(e) => update("twitter", e.target.value)}
                        placeholder="x.com/…"
                      />
                    </Field>
                    <Field label="GitHub" htmlFor="person-github">
                      <Input
                        id="person-github"
                        value={form.github}
                        onChange={(e) => update("github", e.target.value)}
                        placeholder="github.com/…"
                      />
                    </Field>
                    <Field label="Website" htmlFor="person-website">
                      <Input
                        id="person-website"
                        value={form.website}
                        onChange={(e) => update("website", e.target.value)}
                        placeholder="https://…"
                      />
                    </Field>
                  </div>
                ) : null}

                {step.id === "experience" ? (
                  <div className="space-y-4">
                    {form.experiences.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No experience yet. Add roles below.
                      </p>
                    ) : null}
                    {form.experiences.map((exp, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            Role {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              update(
                                "experiences",
                                form.experiences.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <Input
                          value={exp.title}
                          onChange={(e) => {
                            const next = [...form.experiences];
                            next[index] = { ...exp, title: e.target.value };
                            update("experiences", next);
                          }}
                          placeholder="Title"
                        />
                        <Input
                          value={exp.companyName}
                          onChange={(e) => {
                            const next = [...form.experiences];
                            next[index] = {
                              ...exp,
                              companyName: e.target.value,
                            };
                            update("experiences", next);
                          }}
                          placeholder="Company"
                        />
                        <Input
                          value={exp.companyDomain}
                          onChange={(e) => {
                            const next = [...form.experiences];
                            next[index] = {
                              ...exp,
                              companyDomain: e.target.value,
                            };
                            update("experiences", next);
                          }}
                          placeholder="Company domain (optional)"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={exp.startDate}
                            onChange={(e) => {
                              const next = [...form.experiences];
                              next[index] = {
                                ...exp,
                                startDate: e.target.value,
                              };
                              update("experiences", next);
                            }}
                            placeholder="Start"
                          />
                          <Input
                            value={exp.endDate}
                            onChange={(e) => {
                              const next = [...form.experiences];
                              next[index] = { ...exp, endDate: e.target.value };
                              update("experiences", next);
                            }}
                            placeholder="End"
                            disabled={exp.isCurrent}
                          />
                        </div>
                        <label className="flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={exp.isCurrent}
                            onChange={(e) => {
                              const next = [...form.experiences];
                              next[index] = {
                                ...exp,
                                isCurrent: e.target.checked,
                              };
                              update("experiences", next);
                            }}
                          />
                          Current role
                        </label>
                        <Textarea
                          value={exp.description}
                          onChange={(e) => {
                            const next = [...form.experiences];
                            next[index] = {
                              ...exp,
                              description: e.target.value,
                            };
                            update("experiences", next);
                          }}
                          placeholder="Description"
                          className="min-h-20 resize-none"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update("experiences", [
                          ...form.experiences,
                          emptyExperience(),
                        ])
                      }
                    >
                      <Plus data-icon="inline-start" />
                      Add experience
                    </Button>
                  </div>
                ) : null}

                {step.id === "education" ? (
                  <div className="space-y-4">
                    {form.education.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No education yet. Add schools below.
                      </p>
                    ) : null}
                    {form.education.map((edu, index) => (
                      <div
                        key={index}
                        className="space-y-2 rounded-lg border border-border p-3"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-medium text-muted-foreground">
                            School {index + 1}
                          </span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={() =>
                              update(
                                "education",
                                form.education.filter((_, i) => i !== index),
                              )
                            }
                          >
                            <Trash2 />
                          </Button>
                        </div>
                        <Input
                          value={edu.schoolName}
                          onChange={(e) => {
                            const next = [...form.education];
                            next[index] = {
                              ...edu,
                              schoolName: e.target.value,
                            };
                            update("education", next);
                          }}
                          placeholder="School"
                        />
                        <Input
                          value={edu.degree}
                          onChange={(e) => {
                            const next = [...form.education];
                            next[index] = { ...edu, degree: e.target.value };
                            update("education", next);
                          }}
                          placeholder="Degree"
                        />
                        <Input
                          value={edu.field}
                          onChange={(e) => {
                            const next = [...form.education];
                            next[index] = { ...edu, field: e.target.value };
                            update("education", next);
                          }}
                          placeholder="Field of study"
                        />
                        <div className="grid grid-cols-2 gap-2">
                          <Input
                            value={edu.startDate}
                            onChange={(e) => {
                              const next = [...form.education];
                              next[index] = {
                                ...edu,
                                startDate: e.target.value,
                              };
                              update("education", next);
                            }}
                            placeholder="Start"
                          />
                          <Input
                            value={edu.endDate}
                            onChange={(e) => {
                              const next = [...form.education];
                              next[index] = { ...edu, endDate: e.target.value };
                              update("education", next);
                            }}
                            placeholder="End"
                          />
                        </div>
                        <Textarea
                          value={edu.description}
                          onChange={(e) => {
                            const next = [...form.education];
                            next[index] = {
                              ...edu,
                              description: e.target.value,
                            };
                            update("education", next);
                          }}
                          placeholder="Description"
                          className="min-h-20 resize-none"
                        />
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() =>
                        update("education", [
                          ...form.education,
                          emptyEducation(),
                        ])
                      }
                    >
                      <Plus data-icon="inline-start" />
                      Add education
                    </Button>
                  </div>
                ) : null}

                {step.id === "notes" ? (
                  <div className="space-y-3">
                    <Field label="Notes" htmlFor="person-notes">
                      <Textarea
                        id="person-notes"
                        value={form.notes}
                        onChange={(e) => update("notes", e.target.value)}
                        placeholder="Recruiter notes…"
                        className="min-h-28 resize-none"
                      />
                    </Field>
                    <Field label="Source / raw text" htmlFor="person-raw">
                      <Textarea
                        id="person-raw"
                        value={form.rawText}
                        onChange={(e) => update("rawText", e.target.value)}
                        placeholder="Original profile dump…"
                        className="min-h-40 resize-none font-mono text-xs"
                      />
                    </Field>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>
          </div>

          <DrawerFooter className="flex-row gap-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              disabled={stepIndex === 0 || saving}
              onClick={() => goTo(stepIndex - 1)}
            >
              Back
            </Button>
            <Button
              type="button"
              className="flex-1"
              disabled={saving || (step.id === "profile" && !form.name.trim())}
              onClick={handleNext}
            >
              {saving ? (
                <>
                  <Loader2 data-icon="inline-start" className="animate-spin" />
                  Saving…
                </>
              ) : isLast ? (
                mode === "create" ? (
                  "Add person"
                ) : (
                  "Save changes"
                )
              ) : (
                "Next"
              )}
            </Button>
          </DrawerFooter>
        </div>
      </DrawerContent>
    </Drawer>
  );
}
