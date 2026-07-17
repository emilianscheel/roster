import {
  pgTable,
  text,
  timestamp,
  boolean,
  integer,
  real,
  jsonb,
  pgEnum,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

// ── Better Auth ──────────────────────────────────────────────

export const user = pgTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").notNull().default(false),
  image: text("image"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const session = pgTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: timestamp("expires_at").notNull(),
    token: text("token").notNull().unique(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_id_idx").on(t.userId)],
);

export const account = pgTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: timestamp("access_token_expires_at"),
    refreshTokenExpiresAt: timestamp("refresh_token_expires_at"),
    scope: text("scope"),
    password: text("password"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("account_user_id_idx").on(t.userId)],
);

export const verification = pgTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const passkey = pgTable(
  "passkey",
  {
    id: text("id").primaryKey(),
    name: text("name"),
    publicKey: text("public_key").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    credentialID: text("credential_id").notNull(),
    counter: integer("counter").notNull(),
    deviceType: text("device_type").notNull(),
    backedUp: boolean("backed_up").notNull(),
    transports: text("transports"),
    createdAt: timestamp("created_at"),
    aaguid: text("aaguid"),
  },
  (t) => [
    index("passkey_user_id_idx").on(t.userId),
    index("passkey_credential_id_idx").on(t.credentialID),
  ],
);

// ── App domain ───────────────────────────────────────────────

export const organizations = pgTable("organizations", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const memberships = pgTable(
  "memberships",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: text("role").notNull().default("owner"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("membership_org_user_uidx").on(t.organizationId, t.userId),
  ],
);

export const roleStatusEnum = pgEnum("role_status", [
  "draft",
  "sourcing",
  "review",
  "paused",
  "closed",
]);

export const requirementPriorityEnum = pgEnum("requirement_priority", [
  "must-have",
  "preferred",
  "exclusion",
]);

export const perspectiveKindEnum = pgEnum("perspective_kind", [
  "company",
  "team",
  "hiring_manager",
  "candidate",
  "market",
]);

export const roles = pgTable(
  "roles",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    createdById: text("created_by_id")
      .notNull()
      .references(() => user.id),
    title: text("title").notNull().default("Untitled role"),
    brief: text("brief").notNull(),
    /** @deprecated Prefer role_requirements rows; kept for legacy/demo. */
    claims: jsonb("claims").$type<Claim[]>().default([]),
    seniority: text("seniority"),
    location: text("location"),
    employmentType: text("employment_type"),
    status: roleStatusEnum("status").notNull().default("draft"),
    budgetCents: integer("budget_cents").notNull().default(5000),
    maxPerCandidateCents: integer("max_per_candidate_cents")
      .notNull()
      .default(100),
    maxToolCallCents: integer("max_tool_call_cents").notNull().default(50),
    spentCents: integer("spent_cents").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [index("roles_org_idx").on(t.organizationId)],
);

export type Claim = {
  id: string;
  label: string;
  priority: "must-have" | "preferred" | "exclusion";
  verificationHints?: string[];
  weight?: number;
};

export const roleRequirements = pgTable(
  "role_requirements",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    priority: requirementPriorityEnum("priority").notNull().default("must-have"),
    weight: integer("weight").notNull().default(1),
    sortOrder: integer("sort_order").notNull().default(0),
    verificationHints: jsonb("verification_hints").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("role_requirements_role_idx").on(t.roleId)],
);

export const rolePerspectives = pgTable(
  "role_perspectives",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    kind: perspectiveKindEnum("kind").notNull(),
    title: text("title").notNull(),
    body: text("body").notNull(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("role_perspectives_role_idx").on(t.roleId)],
);

export const people = pgTable(
  "people",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    headline: text("headline"),
    location: text("location"),
    imageUrl: text("image_url"),
    links: jsonb("links").$type<Record<string, string>>().default({}),
    /** Full plain-text profile dump (e.g. LinkedIn paste). */
    rawText: text("raw_text"),
    /** Recruiter-facing free-form notes. */
    notes: text("notes"),
    firstSeenRoleId: text("first_seen_role_id"),
    lastSeenAt: timestamp("last_seen_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("people_org_idx").on(t.organizationId),
    index("people_name_idx").on(t.name),
  ],
);

export const personExperiences = pgTable(
  "person_experiences",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    companyName: text("company_name").notNull(),
    companyDomain: text("company_domain"),
    title: text("title").notNull(),
    /** LinkedIn-style date, e.g. "2021-03" or "Mar 2021". */
    startDate: text("start_date"),
    endDate: text("end_date"),
    isCurrent: boolean("is_current").notNull().default(false),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("person_experiences_person_idx").on(t.personId)],
);

export const personEducation = pgTable(
  "person_education",
  {
    id: text("id").primaryKey(),
    personId: text("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    schoolName: text("school_name").notNull(),
    schoolDomain: text("school_domain"),
    degree: text("degree"),
    field: text("field"),
    startDate: text("start_date"),
    endDate: text("end_date"),
    description: text("description"),
    sortOrder: integer("sort_order").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("person_education_person_idx").on(t.personId)],
);

export const pipelineStageEnum = pgEnum("pipeline_stage", [
  "discovered",
  "researching",
  "verified",
  "approved",
  "contacted",
  "replied",
  "interview",
  "rejected",
]);

export const candidates = pgTable(
  "candidates",
  {
    id: text("id").primaryKey(),
    roleId: text("role_id")
      .notNull()
      .references(() => roles.id, { onDelete: "cascade" }),
    personId: text("person_id").references(() => people.id),
    name: text("name").notNull(),
    headline: text("headline"),
    stage: pipelineStageEnum("stage").notNull().default("discovered"),
    matchScore: real("match_score").notNull().default(0),
    evidenceConfidence: real("evidence_confidence").notNull().default(0),
    freshnessDays: integer("freshness_days"),
    strongestSignal: text("strongest_signal"),
    missingRequirements: jsonb("missing_requirements")
      .$type<string[]>()
      .default([]),
    contradictions: jsonb("contradictions").$type<string[]>().default([]),
    verificationSpendCents: integer("verification_spend_cents")
      .notNull()
      .default(0),
    currentAction: text("current_action"),
    contactUnlocked: boolean("contact_unlocked").notNull().default(false),
    outreachDraft: text("outreach_draft"),
    metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => [
    index("candidates_role_idx").on(t.roleId),
    index("candidates_person_idx").on(t.personId),
  ],
);

export const evidenceStatusEnum = pgEnum("evidence_status", [
  "verified",
  "uncertain",
  "contradicting",
  "missing",
]);

export const evidence = pgTable(
  "evidence",
  {
    id: text("id").primaryKey(),
    candidateId: text("candidate_id")
      .notNull()
      .references(() => candidates.id, { onDelete: "cascade" }),
    claimId: text("claim_id").notNull(),
    claimLabel: text("claim_label").notNull(),
    status: evidenceStatusEnum("status").notNull().default("missing"),
    sources: jsonb("sources").$type<EvidenceSource[]>().default([]),
    confidence: real("confidence").notNull().default(0),
    crossSourceAgreement: text("cross_source_agreement"),
    newestEvidenceDays: integer("newest_evidence_days"),
    costCents: real("cost_cents").notNull().default(0),
    supporting: text("supporting"),
    contradicting: text("contradicting"),
    recommendation: text("recommendation"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("evidence_candidate_idx").on(t.candidateId)],
);

export type EvidenceSource = {
  title: string;
  url?: string;
  snippet?: string;
};

export const zeroCallStatusEnum = pgEnum("zero_call_status", [
  "success",
  "failed",
  "skipped",
  "blocked",
]);

export const zeroCalls = pgTable(
  "zero_calls",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    candidateId: text("candidate_id").references(() => candidates.id, {
      onDelete: "set null",
    }),
    service: text("service").notNull(),
    capability: text("capability").notNull(),
    purpose: text("purpose").notNull(),
    quotedCents: real("quoted_cents").notNull().default(0),
    actualCents: real("actual_cents").notNull().default(0),
    latencyMs: integer("latency_ms").notNull().default(0),
    status: zeroCallStatusEnum("status").notNull(),
    evidenceGained: integer("evidence_gained").notNull().default(0),
    fallbackReason: text("fallback_reason"),
    resultSummary: text("result_summary"),
    demo: boolean("demo").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("zero_calls_org_idx").on(t.organizationId),
    index("zero_calls_role_idx").on(t.roleId),
  ],
);

export const approvalStatusEnum = pgEnum("approval_status", [
  "pending",
  "allowed",
  "rejected",
  "reformed",
]);

export const approvalKindEnum = pgEnum("approval_kind", [
  "unlock_contact",
  "send_outreach",
  "start_followup",
  "place_call",
  "budget_exceed",
]);

export const approvalTasks = pgTable(
  "approval_tasks",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    candidateId: text("candidate_id").references(() => candidates.id, {
      onDelete: "set null",
    }),
    kind: approvalKindEnum("kind").notNull(),
    title: text("title").notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().default({}),
    reformNotes: text("reform_notes"),
    status: approvalStatusEnum("status").notNull().default("pending"),
    remindAt: timestamp("remind_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    resolvedAt: timestamp("resolved_at"),
  },
  (t) => [
    index("approvals_org_idx").on(t.organizationId),
    index("approvals_status_idx").on(t.status),
  ],
);

export const knowledgeSnippets = pgTable(
  "knowledge_snippets",
  {
    id: text("id").primaryKey(),
    organizationId: text("organization_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    roleId: text("role_id").references(() => roles.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    markdown: text("markdown").notNull(),
    tool: text("tool"),
    tags: jsonb("tags").$type<string[]>().default([]),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => [index("knowledge_org_idx").on(t.organizationId)],
);

// Relations (minimal)

export const rolesRelations = relations(roles, ({ many }) => ({
  candidates: many(candidates),
  zeroCalls: many(zeroCalls),
  requirements: many(roleRequirements),
  perspectives: many(rolePerspectives),
}));

export const roleRequirementsRelations = relations(roleRequirements, ({ one }) => ({
  role: one(roles, {
    fields: [roleRequirements.roleId],
    references: [roles.id],
  }),
}));

export const rolePerspectivesRelations = relations(rolePerspectives, ({ one }) => ({
  role: one(roles, {
    fields: [rolePerspectives.roleId],
    references: [roles.id],
  }),
}));

export const candidatesRelations = relations(candidates, ({ one, many }) => ({
  role: one(roles, { fields: [candidates.roleId], references: [roles.id] }),
  person: one(people, { fields: [candidates.personId], references: [people.id] }),
  evidence: many(evidence),
}));

export const peopleRelations = relations(people, ({ many }) => ({
  experiences: many(personExperiences),
  education: many(personEducation),
  candidates: many(candidates),
}));

export const personExperiencesRelations = relations(
  personExperiences,
  ({ one }) => ({
    person: one(people, {
      fields: [personExperiences.personId],
      references: [people.id],
    }),
  }),
);

export const personEducationRelations = relations(personEducation, ({ one }) => ({
  person: one(people, {
    fields: [personEducation.personId],
    references: [people.id],
  }),
}));
