import { slugFromName } from "@/lib/people-links";
import type {
  MockClaim,
  MockDemoCandidate,
  MockPersonProfile,
} from "@/lib/zero/mock-types";

export type { MockClaim, MockDemoCandidate, MockPersonProfile };

export type DemoService = {
  service: string;
  capability: string;
  quotedCents: number;
  category?: string;
};

/** Capabilities that always create approval tasks (HITL). */
export const ACTION_CAPABILITIES = new Set([
  "contact.unlock",
  "outreach.email",
  "outreach.followup",
  "outreach.call",
]);

export const DEMO_SERVICES: DemoService[] = [
  {
    service: "profile-scraper",
    capability: "profile.extract",
    quotedCents: 0.2,
    category: "search",
  },
  {
    service: "wiza-prospect-search",
    capability: "prospect.search",
    quotedCents: 0.3,
    category: "search",
  },
  {
    service: "crustdata-person-search",
    capability: "person.search",
    quotedCents: 0.4,
    category: "search",
  },
  {
    service: "targeted-search",
    capability: "web.search",
    quotedCents: 0.7,
    category: "search",
  },
  {
    service: "person-enrichment",
    capability: "person.enrich",
    quotedCents: 0.8,
    category: "enrichment",
  },
  {
    service: "pdl-person-enrich",
    capability: "person.enrich",
    quotedCents: 2.0,
    category: "enrichment",
  },
  {
    service: "apollo-people-enrichment",
    capability: "person.enrich",
    quotedCents: 5.0,
    category: "enrichment",
  },
  {
    service: "github-signals",
    capability: "github.activity",
    quotedCents: 0.5,
    category: "signals",
  },
  {
    service: "company-enrich-crustdata",
    capability: "company.enrich",
    quotedCents: 5.0,
    category: "enrichment",
  },
  {
    service: "anyapi-linkedin-email",
    capability: "linkedin.email",
    quotedCents: 0.1,
    category: "contact",
  },
  {
    service: "contact-enrichment",
    capability: "contact.unlock",
    quotedCents: 2.5,
    category: "contact",
  },
  {
    service: "wiza-individual-reveal",
    capability: "contact.unlock",
    quotedCents: 16.0,
    category: "contact",
  },
  {
    service: "outreach-mail",
    capability: "outreach.email",
    quotedCents: 1.0,
    category: "outreach",
  },
  {
    service: "outreach-followup",
    capability: "outreach.followup",
    quotedCents: 0.8,
    category: "outreach",
  },
  {
    service: "outreach-call",
    capability: "outreach.call",
    quotedCents: 3.0,
    category: "outreach",
  },
];

function linksFor(name: string): Record<string, string> {
  const slug = slugFromName(name);
  const handle = slug.replace(/\./g, "");
  return {
    linkedin: `https://www.linkedin.com/in/${slug}`,
    github: `https://github.com/${handle}`,
    twitter: `https://x.com/${handle}`,
    personal: `https://${handle}.dev`,
  };
}

function emailFor(name: string): string {
  const parts = name.trim().toLowerCase().split(/\s+/);
  const first = parts[0] || "alex";
  const last = parts.length > 1 ? parts[parts.length - 1]! : "rivera";
  return `${first}.${last}@example.com`;
}

export const DEMO_CANDIDATES: MockDemoCandidate[] = [
  {
    name: "Alex Rivera",
    headline: "Staff Infrastructure Engineer · Rust / K8s",
    strongestSignal: "Maintains production Rust networking crate",
    freshnessDays: 12,
    location: "San Francisco Bay Area",
    tags: ["rust", "kubernetes", "startup", "oss", "founding", "infra"],
    profile: {
      email: emailFor("Alex Rivera"),
      headline: "Staff Infrastructure Engineer · Rust / K8s",
      location: "San Francisco Bay Area",
      links: linksFor("Alex Rivera"),
      experiences: [
        {
          companyName: "Temporal",
          companyDomain: "temporal.io",
          title: "Staff Infrastructure Engineer",
          startDate: "2022-06",
          endDate: null,
          isCurrent: true,
          description:
            "Owns multi-region control-plane reliability. Ships Rust networking services and Kubernetes operators for workflow orchestration.",
        },
        {
          companyName: "Fly.io",
          companyDomain: "fly.io",
          title: "Senior Platform Engineer",
          startDate: "2019-03",
          endDate: "2022-05",
          isCurrent: false,
          description:
            "Built edge proxy components in Rust; operated Kubernetes fleets across regions.",
        },
        {
          companyName: "DigitalOcean",
          companyDomain: "digitalocean.com",
          title: "Software Engineer",
          startDate: "2016-08",
          endDate: "2019-02",
          isCurrent: false,
          description: "Kubernetes product engineering; CNI and networking stack.",
        },
      ],
      education: [
        {
          schoolName: "University of Washington",
          schoolDomain: "uw.edu",
          degree: "B.S.",
          field: "Computer Science",
          startDate: "2012",
          endDate: "2016",
          description: "Systems track; research on high-performance networking.",
        },
      ],
      skills: ["Rust", "Kubernetes", "gRPC", "PostgreSQL", "eBPF"],
      summary:
        "Staff infra engineer with deep Rust networking and production Kubernetes operator experience; active OSS maintainer.",
    },
    claims: [
      {
        label: "Production Rust",
        status: "verified",
        sources: ["GitHub rust-net crate", "Temporal eng blog"],
        confidence: 0.94,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["K8s operator commits (60d)", "CNCF talk"],
        confidence: 0.92,
      },
      {
        label: "Startup experience",
        status: "verified",
        sources: ["Fly.io tenure", "Temporal staff role"],
        confidence: 0.9,
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub contributions (12d)"],
        confidence: 0.91,
      },
      {
        label: "Open to opportunities",
        status: "uncertain",
        sources: ["LinkedIn OpenToWork off", "Recent recruiter reply"],
        confidence: 0.52,
        supporting: "Replied to prior founding-role inbound last quarter",
        contradicting: "Profile still lists open to opportunities as off",
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["github.com/alexrivera/rust-net — 14 commits / 30d"],
        confidence: 0.95,
      },
      {
        label: "Production Rust",
        status: "verified",
        sources: ["crates.io downloads: rust-net 40k/mo"],
        confidence: 0.93,
      },
    ],
  },
  {
    name: "Jordan Lee",
    headline: "Founding Platform Engineer",
    strongestSignal: "Recent OSS Kubernetes operator commits",
    freshnessDays: 8,
    location: "New York, NY",
    tags: ["rust", "kubernetes", "startup", "oss", "founding", "platform"],
    profile: {
      email: emailFor("Jordan Lee"),
      headline: "Founding Platform Engineer",
      location: "New York, NY",
      links: linksFor("Jordan Lee"),
      experiences: [
        {
          companyName: "Lattice",
          companyDomain: "lattice.com",
          title: "Founding Platform Engineer",
          startDate: "2021-01",
          endDate: "2024-11",
          isCurrent: false,
          description:
            "First platform hire. Built Kubernetes platform, CI, and observability for a Series B SaaS company.",
        },
        {
          companyName: "Stripe",
          companyDomain: "stripe.com",
          title: "Senior Software Engineer",
          startDate: "2017-06",
          endDate: "2020-12",
          isCurrent: false,
          description: "Payments infrastructure; Go and Rust services at scale.",
        },
        {
          companyName: "Two Sigma",
          companyDomain: "twosigma.com",
          title: "Software Engineer",
          startDate: "2014-07",
          endDate: "2017-05",
          isCurrent: false,
          description: "Internal compute platform and job scheduling.",
        },
      ],
      education: [
        {
          schoolName: "Cornell University",
          schoolDomain: "cornell.edu",
          degree: "B.S.",
          field: "Computer Science",
          startDate: "2010",
          endDate: "2014",
          description: null,
        },
      ],
      skills: ["Kubernetes", "Rust", "Go", "Terraform", "Postgres"],
      summary:
        "Ex-founding platform engineer with recent K8s operator OSS and startup build-from-zero experience.",
    },
    claims: [
      {
        label: "Production Rust",
        status: "verified",
        sources: ["Stripe eng posts", "GitHub rust-k8s-helpers"],
        confidence: 0.88,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["Operator commits (8d)", "Lattice platform launch post"],
        confidence: 0.96,
      },
      {
        label: "Startup experience",
        status: "verified",
        sources: ["Founding platform role at Lattice"],
        confidence: 0.97,
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub operator PRs (8d)"],
        confidence: 0.94,
      },
      {
        label: "Transition signal",
        status: "verified",
        sources: ["Left Lattice Nov 2024", "Public 'exploring' post"],
        confidence: 0.89,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["k8s-operator-kit — 22 commits / 30d"],
        confidence: 0.96,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["controller-runtime contributions"],
        confidence: 0.91,
      },
    ],
  },
  {
    name: "Sam Okonkwo",
    headline: "SRE → infra transition",
    strongestSignal: "Conference talk on production Rust services",
    freshnessDays: 21,
    location: "Austin, TX",
    tags: ["sre", "kubernetes", "rust", "infra", "transition", "operators"],
    profile: {
      email: emailFor("Sam Okonkwo"),
      headline: "Staff SRE transitioning to infrastructure engineering",
      location: "Austin, TX",
      links: linksFor("Sam Okonkwo"),
      experiences: [
        {
          companyName: "Datadog",
          companyDomain: "datadoghq.com",
          title: "Staff Site Reliability Engineer",
          startDate: "2020-02",
          endDate: null,
          isCurrent: true,
          description:
            "Owns multi-AZ reliability for metrics ingestion. Building Kubernetes operators for self-healing fleets; learning Rust for edge agents.",
        },
        {
          companyName: "Twilio",
          companyDomain: "twilio.com",
          title: "Senior SRE",
          startDate: "2017-04",
          endDate: "2020-01",
          isCurrent: false,
          description: "On-call for messaging platform; chaos and capacity programs.",
        },
        {
          companyName: "Rackspace",
          companyDomain: "rackspace.com",
          title: "Systems Engineer",
          startDate: "2014-01",
          endDate: "2017-03",
          isCurrent: false,
          description: "Linux fleet automation and private cloud.",
        },
      ],
      education: [
        {
          schoolName: "University of Texas at Austin",
          schoolDomain: "utexas.edu",
          degree: "B.S.",
          field: "Electrical Engineering",
          startDate: "2010",
          endDate: "2014",
          description: null,
        },
      ],
      skills: ["Kubernetes", "SRE", "Rust", "Prometheus", "Go"],
      summary:
        "Staff SRE actively moving into infrastructure/platform with K8s operators and Rust networking experiments.",
    },
    claims: [
      {
        label: "Kubernetes operators",
        status: "verified",
        sources: ["Internal Datadog operator RFC", "KubeCon talk abstract"],
        confidence: 0.9,
      },
      {
        label: "Rust networking",
        status: "uncertain",
        sources: ["Conference talk", "Personal blog series"],
        confidence: 0.62,
        supporting: "Public talk on production Rust services",
        contradicting: "Day job still primarily Go/SRE",
      },
      {
        label: "SRE → infrastructure transition",
        status: "verified",
        sources: ["LinkedIn headline", "Internal transfer interest"],
        confidence: 0.87,
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub operator PRs (21d)"],
        confidence: 0.84,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["kube-heal-operator — 9 commits / 30d"],
        confidence: 0.86,
      },
      {
        label: "Rust networking",
        status: "uncertain",
        sources: ["rust-net-playground — experimental"],
        confidence: 0.55,
        supporting: "Active learning repo",
        contradicting: "No production crate ownership yet",
      },
    ],
  },
  {
    name: "Priya Nair",
    headline: "Principal Engineer · Distributed systems",
    strongestSignal: "Maintains tokio-based open-source proxy",
    freshnessDays: 5,
    location: "Seattle, WA",
    tags: ["rust", "oss", "kubernetes", "infra", "founding"],
    profile: {
      email: emailFor("Priya Nair"),
      headline: "Principal Engineer · Distributed systems",
      location: "Seattle, WA",
      links: linksFor("Priya Nair"),
      experiences: [
        {
          companyName: "AWS",
          companyDomain: "aws.amazon.com",
          title: "Principal Engineer",
          startDate: "2019-09",
          endDate: null,
          isCurrent: true,
          description:
            "Leads Rust-based networking proxies for container networking. Mentors platform teams on Kubernetes CNI design.",
        },
        {
          companyName: "Microsoft",
          companyDomain: "microsoft.com",
          title: "Senior Software Engineer",
          startDate: "2015-02",
          endDate: "2019-08",
          isCurrent: false,
          description: "Azure networking dataplane; C++ and Rust migrations.",
        },
        {
          companyName: "VMware",
          companyDomain: "vmware.com",
          title: "Software Engineer",
          startDate: "2012-06",
          endDate: "2015-01",
          isCurrent: false,
          description: "NSX virtual networking.",
        },
      ],
      education: [
        {
          schoolName: "IIT Madras",
          schoolDomain: "iitm.ac.in",
          degree: "B.Tech",
          field: "Computer Science",
          startDate: "2008",
          endDate: "2012",
          description: null,
        },
      ],
      skills: ["Rust", "Networking", "Kubernetes", "eBPF", "Tokio"],
      summary:
        "Principal-level networking systems engineer with very fresh OSS proxy work; strong Rust signal, lighter startup tenure.",
    },
    claims: [
      {
        label: "Production Rust",
        status: "verified",
        sources: ["AWS eng blog", "tokio proxy repo"],
        confidence: 0.97,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["CNI design docs", "Internal K8s platform"],
        confidence: 0.85,
      },
      {
        label: "Startup experience",
        status: "uncertain",
        sources: ["Career mostly Big Tech"],
        confidence: 0.35,
        supporting: "Early VMware product team was startup-like",
        contradicting: "No founding or seed-stage tenure",
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub proxy commits (5d)"],
        confidence: 0.96,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["edge-proxy-rs — 31 commits / 30d"],
        confidence: 0.97,
      },
      {
        label: "Production Rust",
        status: "verified",
        sources: ["crates.io edge-proxy-rs"],
        confidence: 0.95,
      },
    ],
  },
  {
    name: "Marcus Chen",
    headline: "Ex-founder · Platform & infra",
    strongestSignal: "Sold infra startup; open to founding again",
    freshnessDays: 18,
    location: "Remote · Denver, CO",
    tags: ["startup", "founding", "kubernetes", "rust", "transition"],
    profile: {
      email: emailFor("Marcus Chen"),
      headline: "Ex-founder · Platform & infrastructure",
      location: "Denver, CO",
      links: linksFor("Marcus Chen"),
      experiences: [
        {
          companyName: "Harborline (acq.)",
          companyDomain: "harborline.dev",
          title: "Co-founder & CTO",
          startDate: "2020-01",
          endDate: "2024-06",
          isCurrent: false,
          description:
            "Built Kubernetes-native secrets platform. Led eng team of 12 through acquisition.",
        },
        {
          companyName: "HashiCorp",
          companyDomain: "hashicorp.com",
          title: "Senior Software Engineer",
          startDate: "2016-04",
          endDate: "2019-12",
          isCurrent: false,
          description: "Vault and Consul; Go and Rust prototypes for performance paths.",
        },
      ],
      education: [
        {
          schoolName: "Stanford University",
          schoolDomain: "stanford.edu",
          degree: "M.S.",
          field: "Computer Science",
          startDate: "2014",
          endDate: "2016",
          description: null,
        },
      ],
      skills: ["Kubernetes", "Go", "Rust", "Security", "Founding"],
      summary:
        "Ex-founder/CTO with K8s-native product experience and clear transition signal after acquisition.",
    },
    claims: [
      {
        label: "Startup experience",
        status: "verified",
        sources: ["Harborline founding", "Acquisition announcement"],
        confidence: 0.99,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["Product docs", "CNCF case study"],
        confidence: 0.93,
      },
      {
        label: "Production Rust",
        status: "uncertain",
        sources: ["HashiCorp prototypes", "Side projects"],
        confidence: 0.58,
        supporting: "Rust prototypes at HashiCorp",
        contradicting: "Primary production stack was Go",
      },
      {
        label: "Transition signal",
        status: "verified",
        sources: ["Post-acq garden leave ended", "Public 'building again' note"],
        confidence: 0.92,
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub k8s-secrets-rs (18d)"],
        confidence: 0.8,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["k8s-secrets-rs — 6 commits / 30d"],
        confidence: 0.82,
      },
    ],
  },
  {
    name: "Riley Quinn",
    headline: "Platform Engineer · K8s operators",
    strongestSignal: "Authors popular Kubebuilder tutorials",
    freshnessDays: 15,
    location: "Chicago, IL",
    tags: ["kubernetes", "operators", "sre", "infra", "platform"],
    profile: {
      email: emailFor("Riley Quinn"),
      headline: "Platform Engineer · Kubernetes operators",
      location: "Chicago, IL",
      links: linksFor("Riley Quinn"),
      experiences: [
        {
          companyName: "Shopify",
          companyDomain: "shopify.com",
          title: "Senior Platform Engineer",
          startDate: "2021-03",
          endDate: null,
          isCurrent: true,
          description:
            "Builds and operates Kubernetes operators for multi-tenant compute. Previously SRE for checkout reliability.",
        },
        {
          companyName: "IBM",
          companyDomain: "ibm.com",
          title: "SRE",
          startDate: "2018-01",
          endDate: "2021-02",
          isCurrent: false,
          description: "OpenShift SRE; incident response and capacity.",
        },
      ],
      education: [
        {
          schoolName: "University of Illinois Urbana-Champaign",
          schoolDomain: "illinois.edu",
          degree: "B.S.",
          field: "Computer Science",
          startDate: "2014",
          endDate: "2018",
          description: null,
        },
      ],
      skills: ["Kubernetes", "Operators", "Go", "SRE", "Prometheus"],
      summary:
        "Platform engineer with SRE roots and strong K8s operator signal; lighter Rust networking depth.",
    },
    claims: [
      {
        label: "Kubernetes operators",
        status: "verified",
        sources: ["Kubebuilder tutorials", "Shopify operator repos"],
        confidence: 0.95,
      },
      {
        label: "SRE → infrastructure transition",
        status: "verified",
        sources: ["Title progression SRE → Platform"],
        confidence: 0.9,
      },
      {
        label: "Rust networking",
        status: "uncertain",
        sources: ["Learning path posts"],
        confidence: 0.4,
        supporting: "Public learning series on Rust",
        contradicting: "No production Rust ownership",
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["operator-examples (15d)"],
        confidence: 0.88,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["kubebuilder-cookbook — 11 commits / 30d"],
        confidence: 0.9,
      },
      {
        label: "Kubernetes operators",
        status: "verified",
        sources: ["Stars 2.1k on tutorial repo"],
        confidence: 0.94,
      },
    ],
  },
  {
    name: "Dana Okada",
    headline: "Staff SRE · Reliability & platforms",
    strongestSignal: "Leading internal platform migration off legacy PaaS",
    freshnessDays: 28,
    location: "Toronto, ON",
    tags: ["sre", "kubernetes", "infra", "transition"],
    profile: {
      email: emailFor("Dana Okada"),
      headline: "Staff SRE · Reliability & platforms",
      location: "Toronto, ON",
      links: linksFor("Dana Okada"),
      experiences: [
        {
          companyName: "Shopify",
          companyDomain: "shopify.com",
          title: "Staff SRE",
          startDate: "2019-05",
          endDate: null,
          isCurrent: true,
          description:
            "Reliability for core commerce. Driving Kubernetes platform migration; evaluating Rust for hot-path agents.",
        },
        {
          companyName: "Mozilla",
          companyDomain: "mozilla.org",
          title: "SRE",
          startDate: "2015-08",
          endDate: "2019-04",
          isCurrent: false,
          description: "Firefox Services reliability; Kubernetes adoption.",
        },
      ],
      education: [
        {
          schoolName: "University of Waterloo",
          schoolDomain: "uwaterloo.ca",
          degree: "B.Math",
          field: "Computer Science",
          startDate: "2011",
          endDate: "2015",
          description: null,
        },
      ],
      skills: ["SRE", "Kubernetes", "Go", "Observability"],
      summary:
        "Staff SRE mid-transition into platform/infra; strong K8s, emerging Rust interest.",
    },
    claims: [
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["Platform migration RFCs", "KubeCon speaker"],
        confidence: 0.91,
      },
      {
        label: "SRE → infrastructure transition",
        status: "verified",
        sources: ["Internal transfer proposal", "Headline"],
        confidence: 0.86,
      },
      {
        label: "Rust networking",
        status: "uncertain",
        sources: ["Internal RFC only"],
        confidence: 0.42,
        supporting: "Evaluating Rust for hot-path agents",
        contradicting: "No public Rust production code",
      },
      {
        label: "Recent OSS activity",
        status: "uncertain",
        sources: ["Sparse public commits"],
        confidence: 0.45,
        supporting: "Internal open-source contributions",
        contradicting: "Public GitHub quiet for 60d+",
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "uncertain",
        sources: ["Last public commit 72d ago"],
        confidence: 0.4,
        supporting: "Active on internal GitLab",
        contradicting: "Public freshness weak",
      },
    ],
  },
  {
    name: "Chris Patel",
    headline: "OSS maintainer · cloud-native networking",
    strongestSignal: "CNCF project maintainer; weekly releases",
    freshnessDays: 3,
    location: "Berlin, DE",
    tags: ["oss", "rust", "kubernetes", "networking", "infra"],
    profile: {
      email: emailFor("Chris Patel"),
      headline: "Independent OSS maintainer · cloud-native networking",
      location: "Berlin, DE",
      links: linksFor("Chris Patel"),
      experiences: [
        {
          companyName: "Independent",
          companyDomain: null,
          title: "OSS Maintainer & Consultant",
          startDate: "2023-01",
          endDate: null,
          isCurrent: true,
          description:
            "Full-time maintainer of a CNCF networking project written in Rust. Consulting for startups on Kubernetes networking.",
        },
        {
          companyName: "Isovalent",
          companyDomain: "isovalent.com",
          title: "Senior Software Engineer",
          startDate: "2019-02",
          endDate: "2022-12",
          isCurrent: false,
          description: "Cilium datapath; eBPF and Rust userspace tooling.",
        },
        {
          companyName: "Red Hat",
          companyDomain: "redhat.com",
          title: "Software Engineer",
          startDate: "2016-03",
          endDate: "2019-01",
          isCurrent: false,
          description: "OpenShift networking.",
        },
      ],
      education: [
        {
          schoolName: "TU Berlin",
          schoolDomain: "tu.berlin",
          degree: "M.Sc.",
          field: "Computer Science",
          startDate: "2013",
          endDate: "2016",
          description: null,
        },
      ],
      skills: ["Rust", "eBPF", "Kubernetes", "CNI", "Networking"],
      summary:
        "Full-time OSS maintainer with elite networking signal and weekly release cadence; consulting ties to startups.",
    },
    claims: [
      {
        label: "Production Rust",
        status: "verified",
        sources: ["CNCF project", "Weekly releases"],
        confidence: 0.98,
      },
      {
        label: "Kubernetes",
        status: "verified",
        sources: ["CNI integration tests", "Isovalent tenure"],
        confidence: 0.94,
      },
      {
        label: "Startup experience",
        status: "verified",
        sources: ["Isovalent (startup) tenure", "Consulting clients"],
        confidence: 0.82,
      },
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["GitHub releases (3d)"],
        confidence: 0.99,
      },
      {
        label: "Open to opportunities",
        status: "uncertain",
        sources: ["Consulting availability note"],
        confidence: 0.6,
        supporting: "Lists 'open to founding infra roles'",
        contradicting: "Also notes OSS-first commitment",
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "verified",
        sources: ["cncf-net-rs — release 3d ago, 48 commits / 30d"],
        confidence: 0.99,
      },
      {
        label: "Production Rust",
        status: "verified",
        sources: ["Production adopters listed in README"],
        confidence: 0.97,
      },
    ],
  },
  {
    name: "Taylor Brooks",
    headline: "Frontend Engineer · React / TypeScript",
    strongestSignal: "Strong product UI portfolio; limited infra signal",
    freshnessDays: 40,
    location: "Los Angeles, CA",
    tags: ["mismatch", "frontend"],
    profile: {
      email: emailFor("Taylor Brooks"),
      headline: "Senior Frontend Engineer",
      location: "Los Angeles, CA",
      links: linksFor("Taylor Brooks"),
      experiences: [
        {
          companyName: "Airbnb",
          companyDomain: "airbnb.com",
          title: "Senior Frontend Engineer",
          startDate: "2020-07",
          endDate: null,
          isCurrent: true,
          description: "Host tools UI; React, TypeScript, GraphQL.",
        },
        {
          companyName: "Square",
          companyDomain: "squareup.com",
          title: "Software Engineer",
          startDate: "2017-03",
          endDate: "2020-06",
          isCurrent: false,
          description: "Dashboard frontend.",
        },
      ],
      education: [
        {
          schoolName: "UCLA",
          schoolDomain: "ucla.edu",
          degree: "B.A.",
          field: "Cognitive Science",
          startDate: "2013",
          endDate: "2017",
          description: null,
        },
      ],
      skills: ["React", "TypeScript", "CSS", "GraphQL"],
      summary:
        "Strong frontend engineer — intentionally weak infra match for cheap-funnel rejection demos.",
    },
    claims: [
      {
        label: "Production Rust",
        status: "contradicting",
        sources: ["No Rust repos", "Profile skills"],
        confidence: 0.12,
        contradicting: "No production Rust experience found",
      },
      {
        label: "Kubernetes",
        status: "contradicting",
        sources: ["Career is frontend-only"],
        confidence: 0.1,
        contradicting: "No Kubernetes or ops experience",
      },
      {
        label: "Startup experience",
        status: "uncertain",
        sources: ["Big Tech tenure"],
        confidence: 0.3,
      },
      {
        label: "Recent OSS activity",
        status: "uncertain",
        sources: ["Design-system npm packages"],
        confidence: 0.5,
      },
    ],
    githubClaims: [
      {
        label: "Recent OSS activity",
        status: "uncertain",
        sources: ["UI component library only"],
        confidence: 0.45,
      },
    ],
  },
];

export function findDemoCandidate(query?: string | null): MockDemoCandidate {
  const q = (query || "").toLowerCase();
  if (!q) return DEMO_CANDIDATES[0]!;
  const byName = DEMO_CANDIDATES.find((c) =>
    c.name.toLowerCase().includes(q.slice(0, 40)),
  );
  if (byName) return byName;
  for (const part of q.split(/[^a-z]+/).filter((p) => p.length > 2)) {
    const hit = DEMO_CANDIDATES.find((c) => c.name.toLowerCase().includes(part));
    if (hit) return hit;
  }
  return DEMO_CANDIDATES[0]!;
}

function filterCandidates(query?: string | null): MockDemoCandidate[] {
  const q = (query || "").toLowerCase();
  if (!q) return DEMO_CANDIDATES;

  const preferSre =
    q.includes("sre") ||
    q.includes("transition") ||
    q.includes("operator") ||
    q.includes("platform engineer");
  const preferFounding =
    q.includes("founding") ||
    q.includes("rust") ||
    q.includes("infrastructure engineer");
  const preferOss = q.includes("oss") || q.includes("open-source");

  const scored = DEMO_CANDIDATES.map((c) => {
    let score = 0;
    for (const tag of c.tags) {
      if (q.includes(tag)) score += 2;
    }
    if (preferSre && (c.tags.includes("sre") || c.tags.includes("operators"))) {
      score += 3;
    }
    if (preferFounding && (c.tags.includes("founding") || c.tags.includes("rust"))) {
      score += 3;
    }
    if (preferOss && c.tags.includes("oss")) score += 2;
    if (c.tags.includes("mismatch")) score -= 5;
    // Keep mismatch in pool but sorted last unless query is empty
    score += Math.max(0, 40 - c.freshnessDays) / 40;
    return { c, score };
  });

  scored.sort((a, b) => b.score - a.score);
  // Always return full catalog so demos stay rich; order reflects relevance
  return scored.map((s) => s.c);
}

function candidateSummary(c: MockDemoCandidate) {
  return {
    name: c.name,
    headline: c.headline,
    strongestSignal: c.strongestSignal,
    freshnessDays: c.freshnessDays,
    location: c.location,
  };
}

function claimsForVerify(candidate: MockDemoCandidate, purpose?: string): MockClaim[] {
  const p = (purpose || "").toLowerCase();
  if (p.includes("oss") || p.includes("github") || p.includes("open-source")) {
    return candidate.githubClaims.length
      ? candidate.githubClaims
      : candidate.claims.filter((c) =>
          c.label.toLowerCase().includes("oss"),
        );
  }
  return candidate.claims;
}

export type MockResearchInput = {
  service: string;
  capability: string;
  purpose: string;
  query?: string;
};

export function mockResearchData(input: MockResearchInput): unknown {
  const seed = (input.query || input.purpose || "candidate").slice(0, 80);
  const capability = input.capability;

  if (capability.includes("discover") || capability === "zero.discover") {
    return {
      services: DEMO_SERVICES.filter(
        (s) => !ACTION_CAPABILITIES.has(s.capability),
      ),
    };
  }

  // Verification / targeted research — claims, NOT candidates
  if (capability === "web.search" || capability === "targeted-search") {
    const person = findDemoCandidate(input.query || input.purpose);
    return {
      claims: claimsForVerify(person, input.purpose),
      subject: person.name,
      query: seed,
    };
  }

  if (capability === "github.activity" || capability.includes("github")) {
    const person = findDemoCandidate(input.query || input.purpose);
    return {
      profile: {
        headline: person.headline,
        location: person.location,
        links: person.profile.links,
        summary: `GitHub activity for ${person.name}`,
      } satisfies MockPersonProfile,
      claims: person.githubClaims,
      repos: person.githubClaims.flatMap((c) => c.sources),
      subject: person.name,
    };
  }

  if (
    capability === "person.enrich" ||
    capability.includes("enrich") ||
    capability === "company.enrich"
  ) {
    if (capability === "company.enrich") {
      return {
        company: {
          name: "Example Infra Co",
          domain: "example.com",
          headcount: 48,
          funding: "Series A",
          summary: `Demo company enrich for ${seed}`,
        },
        claims: [
          {
            label: "Early-stage startup",
            status: "verified",
            sources: ["Crunchbase", "Company site"],
            confidence: 0.9,
          },
        ],
      };
    }
    const person = findDemoCandidate(input.query || input.purpose);
    return {
      profile: person.profile,
      claims: person.claims,
      subject: person.name,
    };
  }

  if (capability === "linkedin.email") {
    const person = findDemoCandidate(input.query || input.purpose);
    return {
      email: person.profile.email,
      subject: person.name,
      sources: ["LinkedIn email finder (demo)"],
    };
  }

  // Candidate search / list building
  if (
    capability === "profile.extract" ||
    capability === "prospect.search" ||
    capability === "person.search" ||
    capability.includes("search") ||
    capability.includes("extract")
  ) {
    const pool = filterCandidates(input.query || input.purpose);
    return {
      candidates: pool.map(candidateSummary),
      query: seed,
    };
  }

  return { ok: true, note: `Demo result for ${capability}`, query: seed };
}

export function listDemoCapabilities() {
  return DEMO_SERVICES;
}

export function getDemoProfileByName(name: string): MockPersonProfile | null {
  const hit = DEMO_CANDIDATES.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return hit?.profile ?? null;
}

export function getDemoClaimsByName(name: string): MockClaim[] {
  const hit = DEMO_CANDIDATES.find(
    (c) => c.name.toLowerCase() === name.trim().toLowerCase(),
  );
  return hit?.claims ?? [];
}
