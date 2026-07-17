import { slugFromName } from "@/lib/people-links";
import {
  findDemoCandidate,
  getDemoClaimsByName,
  getDemoProfileByName,
} from "@/lib/zero/mock-research";
import type {
  MockClaim,
  MockPersonEducation,
  MockPersonExperience,
  MockPersonProfile,
} from "@/lib/zero/mock-types";

export type {
  MockPersonEducation,
  MockPersonExperience,
  MockPersonProfile,
};

export const PERSON_ENRICH_TOOL_IDS = [
  "pdl-person-enrich",
  "apollo-people-enrichment",
  "clado-contacts-enrich",
] as const;

export type PersonEnrichToolId = (typeof PERSON_ENRICH_TOOL_IDS)[number];

export function isPersonEnrichToolId(value: string): value is PersonEnrichToolId {
  return (PERSON_ENRICH_TOOL_IDS as readonly string[]).includes(value);
}

export type MockPersonEnrichResult = {
  profile: MockPersonProfile;
  claims: Array<{
    label: string;
    status: string;
    sources: string[];
    confidence: number;
  }>;
  toolId: PersonEnrichToolId;
};

export const PERSON_ENRICH_TOOLS: {
  id: PersonEnrichToolId;
  name: string;
  blurb: string;
}[] = [
  {
    id: "pdl-person-enrich",
    name: "PDL Person Enrich",
    blurb: "Work history, education, socials, and skills",
  },
  {
    id: "apollo-people-enrichment",
    name: "Apollo People Enrichment",
    blurb: "Work email, headline, and company context",
  },
  {
    id: "clado-contacts-enrich",
    name: "Clado Contacts Enrichment",
    blurb: "Emails, phones, and social profiles",
  },
];

type SeedPerson = {
  name: string;
  email?: string | null;
  headline?: string | null;
  location?: string | null;
};

function firstName(name: string) {
  return name.trim().split(/\s+/)[0] || "Alex";
}

function lastName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return parts.length > 1 ? parts[parts.length - 1]! : "Rivera";
}

function claimRows(claims: MockClaim[]) {
  return claims.map((c) => ({
    label: c.label,
    status: c.status,
    sources: c.sources,
    confidence: c.confidence,
  }));
}

function fallbackProfile(person: SeedPerson): MockPersonProfile {
  const slug = slugFromName(person.name);
  const first = firstName(person.name);
  const last = lastName(person.name);
  return {
    headline:
      person.headline ||
      "Staff Software Engineer · Distributed systems & developer platforms",
    location: person.location || "San Francisco Bay Area",
    email:
      person.email?.trim() ||
      `${first.toLowerCase()}.${last.toLowerCase()}@example.com`,
    links: {
      linkedin: `https://www.linkedin.com/in/${slug}`,
      github: `https://github.com/${slug.replace(/\./g, "")}`,
      twitter: `https://x.com/${slug.replace(/\./g, "")}`,
      personal: `https://${slug.replace(/\./g, "")}.dev`,
    },
    experiences: [
      {
        companyName: "Stripe",
        companyDomain: "stripe.com",
        title: "Staff Software Engineer",
        startDate: "2022-04",
        endDate: null,
        isCurrent: true,
        description:
          "Leads reliability work on multi-region payment orchestration.",
      },
      {
        companyName: "Datadog",
        companyDomain: "datadoghq.com",
        title: "Senior Software Engineer",
        startDate: "2019-01",
        endDate: "2022-03",
        isCurrent: false,
        description: "Built ingestion pipelines for high-cardinality metrics.",
      },
    ],
    education: [
      {
        schoolName: "Carnegie Mellon University",
        schoolDomain: "cmu.edu",
        degree: "B.S.",
        field: "Computer Science",
        startDate: "2012",
        endDate: "2016",
        description: null,
      },
    ],
    skills: ["Rust", "Go", "Kubernetes", "Distributed systems"],
    summary: `Generic enrich fallback for ${person.name}`,
  };
}

export function mockPersonEnrich(
  toolId: PersonEnrichToolId,
  person: SeedPerson,
): MockPersonEnrichResult {
  const catalog = findDemoCandidate(person.name);
  const catalogProfile = getDemoProfileByName(person.name);
  const catalogClaims = getDemoClaimsByName(person.name);
  const matched =
    catalog.name.toLowerCase() === person.name.trim().toLowerCase() ||
    Boolean(catalogProfile);

  const base = matched && catalogProfile ? catalogProfile : fallbackProfile(person);
  const claims = matched && catalogClaims.length
    ? claimRows(catalogClaims)
    : [
        {
          label: "Staff-level platform tenure",
          status: "verified",
          sources: ["LinkedIn experience", "Employer engineering blog"],
          confidence: 0.9,
        },
      ];

  const workEmail =
    person.email?.trim() ||
    base.email ||
    `${firstName(person.name).toLowerCase()}.${lastName(person.name).toLowerCase()}@example.com`;

  if (toolId === "pdl-person-enrich") {
    return {
      toolId,
      profile: {
        ...base,
        headline: person.headline || base.headline,
        location: person.location || base.location,
        summary:
          base.summary ||
          `PDL match for ${person.name}: verified career history and social profiles.`,
      },
      claims,
    };
  }

  if (toolId === "apollo-people-enrichment") {
    const current = base.experiences?.find((e) => e.isCurrent) ?? base.experiences?.[0];
    return {
      toolId,
      profile: {
        email: workEmail,
        headline:
          person.headline ||
          base.headline ||
          `Staff Software Engineer at ${current?.companyName ?? "Unknown"}`,
        location: person.location || base.location,
        links: base.links
          ? { linkedin: base.links.linkedin }
          : undefined,
        experiences: current
          ? [
              {
                ...current,
                description:
                  current.description ||
                  `Apollo firmographic match at ${current.companyName}.`,
              },
            ]
          : undefined,
        skills: base.skills?.slice(0, 4),
        summary: `Apollo enrichment for ${person.name}: work email unlocked with current employer context.`,
      },
      claims: [
        {
          label: "Work email verified",
          status: "verified",
          sources: ["Apollo people database"],
          confidence: 0.9,
        },
        ...(current
          ? [
              {
                label: `Current employer: ${current.companyName}`,
                status: "verified",
                sources: ["Apollo employment graph"],
                confidence: 0.87,
              },
            ]
          : []),
      ],
    };
  }

  // clado-contacts-enrich
  return {
    toolId,
    profile: {
      email: workEmail,
      links: base.links,
      summary: `Clado contact enrich for ${person.name}: email + social graph resolved from identity match.`,
    },
    claims: [
      {
        label: "Primary work email",
        status: "verified",
        sources: ["Clado contacts"],
        confidence: 0.91,
      },
      {
        label: "Social profiles linked",
        status: "verified",
        sources: ["Clado social graph"],
        confidence: 0.86,
      },
    ],
  };
}

export function enrichServiceForTool(toolId: PersonEnrichToolId): string {
  return toolId;
}

/** Map a research enrich payload into applyPersonEnrichment's expected shape. */
export function researchProfileToEnrichResult(
  profile: MockPersonProfile,
  claims: MockClaim[] = [],
): MockPersonEnrichResult {
  return {
    toolId: "pdl-person-enrich",
    profile,
    claims: claimRows(claims),
  };
}
