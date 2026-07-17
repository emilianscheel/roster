import { slugFromName } from "@/lib/people-links";

export const PERSON_ENRICH_TOOL_IDS = [
  "pdl-person-enrich",
  "apollo-people-enrichment",
  "clado-contacts-enrich",
] as const;

export type PersonEnrichToolId = (typeof PERSON_ENRICH_TOOL_IDS)[number];

export function isPersonEnrichToolId(value: string): value is PersonEnrichToolId {
  return (PERSON_ENRICH_TOOL_IDS as readonly string[]).includes(value);
}

export type MockPersonExperience = {
  companyName: string;
  companyDomain: string | null;
  title: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type MockPersonEducation = {
  schoolName: string;
  schoolDomain: string | null;
  degree: string | null;
  field: string | null;
  startDate: string | null;
  endDate: string | null;
  description: string | null;
};

export type MockPersonProfile = {
  email?: string | null;
  headline?: string | null;
  location?: string | null;
  imageUrl?: string | null;
  links?: Record<string, string>;
  experiences?: MockPersonExperience[];
  education?: MockPersonEducation[];
  skills?: string[];
  summary?: string | null;
};

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

export function mockPersonEnrich(
  toolId: PersonEnrichToolId,
  person: SeedPerson,
): MockPersonEnrichResult {
  const slug = slugFromName(person.name);
  const first = firstName(person.name);
  const last = lastName(person.name);
  const workEmail =
    person.email?.trim() ||
    `${first.toLowerCase()}.${last.toLowerCase()}@example.com`;

  if (toolId === "pdl-person-enrich") {
    return {
      toolId,
      profile: {
        headline:
          person.headline ||
          "Staff Software Engineer · Distributed systems & developer platforms",
        location: person.location || "San Francisco Bay Area",
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
              "Leads reliability work on multi-region payment orchestration. Owns on-call playbooks and capacity planning for peak events.",
          },
          {
            companyName: "Datadog",
            companyDomain: "datadoghq.com",
            title: "Senior Software Engineer",
            startDate: "2019-01",
            endDate: "2022-03",
            isCurrent: false,
            description:
              "Built ingestion pipelines for high-cardinality metrics. Mentored three engineers through staff promotion tracks.",
          },
          {
            companyName: "Dropbox",
            companyDomain: "dropbox.com",
            title: "Software Engineer",
            startDate: "2016-06",
            endDate: "2018-12",
            isCurrent: false,
            description:
              "Worked on sync engine performance and conflict resolution for desktop clients.",
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
            description: "Systems track; teaching assistant for Operating Systems.",
          },
        ],
        skills: [
          "Rust",
          "Go",
          "Kubernetes",
          "Distributed systems",
          "Observability",
          "PostgreSQL",
        ],
        summary: `PDL match for ${person.name}: strong platform / infra background with verified social profiles and multi-company tenure.`,
      },
      claims: [
        {
          label: "Staff-level platform tenure",
          status: "verified",
          sources: ["LinkedIn experience", "Employer engineering blog"],
          confidence: 0.93,
        },
        {
          label: "Open-source GitHub activity",
          status: "verified",
          sources: ["GitHub public contributions (90d)"],
          confidence: 0.88,
        },
        {
          label: "Bay Area based",
          status: "verified",
          sources: ["PDL location signals"],
          confidence: 0.81,
        },
      ],
    };
  }

  if (toolId === "apollo-people-enrichment") {
    return {
      toolId,
      profile: {
        email: workEmail,
        headline:
          person.headline ||
          "Staff Software Engineer at Stripe · Payments infrastructure",
        location: person.location || "San Francisco, CA",
        links: {
          linkedin: `https://www.linkedin.com/in/${slug}`,
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
              "Apollo firmographic match: payments infrastructure, ~8y tenure in high-growth SaaS.",
          },
        ],
        skills: ["Payments", "API design", "Go", "TypeScript"],
        summary: `Apollo enrichment for ${person.name}: work email unlocked with current employer context.`,
      },
      claims: [
        {
          label: "Work email verified",
          status: "verified",
          sources: ["Apollo people database"],
          confidence: 0.9,
        },
        {
          label: "Current employer: Stripe",
          status: "verified",
          sources: ["Apollo employment graph"],
          confidence: 0.87,
        },
      ],
    };
  }

  // clado-contacts-enrich
  return {
    toolId,
    profile: {
      email: workEmail,
      links: {
        linkedin: `https://www.linkedin.com/in/${slug}`,
        twitter: `https://x.com/${slug.replace(/\./g, "")}`,
        github: `https://github.com/${slug.replace(/\./g, "")}`,
        personal: `https://www.${slug.replace(/\./g, "")}.com`,
      },
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
