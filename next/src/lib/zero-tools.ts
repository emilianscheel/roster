export type ZeroToolCategory =
  | "search"
  | "enrichment"
  | "contact"
  | "linkedin"
  | "jobs"
  | "outreach"
  | "signals";

export type ZeroTool = {
  id: string;
  name: string;
  price: string;
  description: string;
  category: ZeroToolCategory;
  whatItDoes: string;
  protocol: string | null;
  url: string;
  provider: string | null;
  rating: string | null;
};

export const ZERO_TOOL_CATEGORIES: {
  value: ZeroToolCategory | "all";
  label: string;
}[] = [
  { value: "all", label: "All" },
  { value: "search", label: "Search" },
  { value: "enrichment", label: "Enrichment" },
  { value: "contact", label: "Contact" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "jobs", label: "Jobs" },
  { value: "outreach", label: "Outreach" },
  { value: "signals", label: "Signals" },
];

/** Curated hiring/recruiting capabilities from zero.xyz (static snapshot). */
export const ZERO_TOOLS: ZeroTool[] = [
  {
    id: "wiza-prospect-search",
    name: "Wiza Prospect Search (Proof-Only)",
    price: "Free",
    description:
      "Search Wiza's prospect database by title, seniority, role, company, industry, location, funding, and revenue.",
    category: "search",
    whatItDoes:
      "Returns a preview count and sample profiles without payment. Company-name aliases are normalized; domain-only targeting is rejected.",
    protocol: null,
    url: "https://wiza.withzero.xyz/api/v1/prospects/search",
    provider: "wiza.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "crustdata-person-search",
    name: "Crustdata Person Search",
    price: "$0.003/result",
    description:
      "Search and filter the cached Crustdata person dataset for people and prospects.",
    category: "search",
    whatItDoes:
      "Uses provider-native filters, fields, sorts, and aggregations against Crustdata's person database.",
    protocol: "mpp",
    url: "https://crustdata.withzero.xyz/api/v1/person/search",
    provider: "crustdata.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "oneshot-people-discovery",
    name: "OneShotAgent People & Contact Discovery",
    price: "$0.01/call",
    description: "Search for people and contacts by query string.",
    category: "search",
    whatItDoes:
      "Returns discovery results for matched individuals from a free-text people search query.",
    protocol: "x402",
    url: "https://win.oneshotagent.com/v1/tools/research/people",
    provider: "oneshotagent.com",
    rating: "4.3",
  },
  {
    id: "apollo-org-search",
    name: "Apollo Org Search",
    price: "$0.005/call",
    description:
      "Search Apollo's database of 275M+ contacts to find and filter organizations.",
    category: "search",
    whatItDoes:
      "Filters organizations by name, keywords, and firmographic criteria in Apollo's B2B database.",
    protocol: "mpp",
    url: "https://apollo.mpp.paywithlocus.com/apollo/org-search",
    provider: "Apollo",
    rating: null,
  },
  {
    id: "wiza-prospect-list-builder",
    name: "Wiza Prospect List Builder",
    price: "$0.08/call",
    description:
      "Create an enriched Wiza prospect list from search filters (capped at 30 profiles).",
    category: "search",
    whatItDoes:
      "Builds a prospect list from title, role, location, and company filters, polls until complete, and settles from API credits used.",
    protocol: "mpp",
    url: "https://wiza.withzero.xyz/api/v1/prospect-lists",
    provider: "wiza.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "pdl-person-enrich",
    name: "PDL Person Enrich",
    price: "$0.02/call",
    description:
      "Enrich a person with demographics, work history, education, contact info, and skills via People Data Labs.",
    category: "enrichment",
    whatItDoes:
      "Matches on person identifiers and returns structured PDL enrichment including social profiles and skills.",
    protocol: "x402",
    url: "https://stable-people-data-git-pdl-signoz-usage-alarms-merit-systems.vercel.app/api/pdl/person/enrich",
    provider: "People Data Labs",
    rating: "4.2",
  },
  {
    id: "apollo-people-enrichment",
    name: "Apollo People Enrichment",
    price: "$0.05/call",
    description:
      "Enrich a single person with professional and contact data from Apollo's 275M+ database.",
    category: "enrichment",
    whatItDoes:
      "Looks up by email, name, or LinkedIn URL and returns full contact and company profile data.",
    protocol: "mpp",
    url: "https://apollo.mpp.paywithlocus.com/apollo/people-enrichment",
    provider: "Apollo",
    rating: "4.8",
  },
  {
    id: "apollo-bulk-people-enrichment",
    name: "Apollo Bulk People Enrichment",
    price: "$0.008–$0.043/person",
    description:
      "Enrich up to 10 people at once with contact, company, and professional profile data.",
    category: "enrichment",
    whatItDoes:
      "Bulk-enriches people from Apollo's contact database with dynamic per-person pricing.",
    protocol: "mpp",
    url: "https://apollo.mpp.paywithlocus.com/apollo/bulk-people-enrichment",
    provider: "Apollo",
    rating: "4.0",
  },
  {
    id: "pipe0-person-profile",
    name: "Pipe0 Person Profile Enrichment",
    price: "$0.044/call",
    description:
      "Enrich LinkedIn/profile URLs with person profile data via Pipe0 waterfall pipelines.",
    category: "enrichment",
    whatItDoes:
      "Runs people:profile:waterfall@1 on one or more profile URLs and returns raw records with at-cost billing metadata.",
    protocol: "mpp",
    url: "https://pipe0.withzero.xyz",
    provider: "pipe0.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "company-enrich-crustdata",
    name: "Company Enrich (Crustdata)",
    price: "$0.05/call",
    description:
      "Enrich a company with headcount trends, funding, ratings, traffic, revenue, founders, and competitors.",
    category: "enrichment",
    whatItDoes:
      "Pulls firmographics from 16+ data sources for a company identified by name or domain.",
    protocol: "mpp",
    url: "https://enrich.withzero.ai",
    provider: "enrich.withzero.ai",
    rating: "4.7",
  },
  {
    id: "apollo-org-enrichment",
    name: "Apollo Org Enrichment",
    price: "$0.008/call",
    description: "Enrich a single organization record with detailed company data.",
    category: "enrichment",
    whatItDoes:
      "Returns firmographics and company intelligence from Apollo for a given organization identifier.",
    protocol: "mpp",
    url: "https://apollo.mpp.paywithlocus.com/apollo/org-enrichment",
    provider: "Apollo",
    rating: null,
  },
  {
    id: "data-legion-person-premium",
    name: "Data Legion Person Premium Enrichment",
    price: "$0.08/call",
    description:
      "Premium person enrichment matched on email, phone, LinkedIn URL, or name+context.",
    category: "enrichment",
    whatItDoes:
      "Enriches a person profile with premium-grade data from agents.datalegion.ai.",
    protocol: "x402",
    url: "https://agents.datalegion.ai/person/premium",
    provider: "datalegion.ai",
    rating: null,
  },
  {
    id: "crustdata-people-enrichment",
    name: "CrustData People Enrichment",
    price: "$0.12/call",
    description: "Enrich a person's profile with professional and contact information.",
    category: "enrichment",
    whatItDoes:
      "Returns detailed CrustData person enrichment based on identifying inputs.",
    protocol: "x402",
    url: "https://api.auor.io/crustdata/v1/people/enrich",
    provider: "api.auor.io",
    rating: "1.3",
  },
  {
    id: "wiza-individual-reveal",
    name: "Wiza Individual Contact Reveal",
    price: "$0.16/call",
    description:
      "Reveal a single contact by name+company, email, or LinkedIn URL with emails and/or phones.",
    category: "contact",
    whatItDoes:
      "Starts a Wiza individual reveal, polls until completion, and returns enriched contact data.",
    protocol: "mpp",
    url: "https://wiza.withzero.xyz",
    provider: "wiza.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "wiza-bulk-contact-enrichment",
    name: "Wiza Bulk Contact Enrichment List",
    price: "$0.24/call",
    description:
      "Create a Wiza enrichment list from up to 300 contacts and return emails and phones.",
    category: "contact",
    whatItDoes:
      "Accepts name+company, email, or LinkedIn URL inputs and returns enriched contact data for the batch.",
    protocol: "mpp",
    url: "https://wiza.withzero.xyz",
    provider: "wiza.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "clado-contacts-enrich",
    name: "Clado Contacts Enrichment",
    price: "$0.20/call",
    description:
      "Enrich contact info (emails, phones, socials) from LinkedIn URL, email, or phone.",
    category: "contact",
    whatItDoes:
      "Resolves contact information via Clado through StableEnrich from a LinkedIn URL, email, or phone number.",
    protocol: "mpp",
    url: "https://stableenrich.dev/api/clado/contacts-enrich",
    provider: "StableEnrich",
    rating: "3.5",
  },
  {
    id: "anyapi-linkedin-email",
    name: "AnyAPI LinkedIn Email Finder",
    price: "$0.001/call",
    description: "Find the work email associated with a LinkedIn profile URL or public ID.",
    category: "contact",
    whatItDoes:
      "Returns the work email address for a given LinkedIn profile via AnyAPI linkedin.email.",
    protocol: "x402",
    url: "https://api.getanyapi.com/v1/run/linkedin.email",
    provider: "api.getanyapi.com",
    rating: "2.3",
  },
  {
    id: "tomba-linkedin-email",
    name: "Tomba LinkedIn Email Finder",
    price: "$0.01/call",
    description: "Find the professional email address for a LinkedIn profile URL.",
    category: "contact",
    whatItDoes:
      "Looks up email addresses associated with a LinkedIn profile via Tomba API.",
    protocol: "mpp",
    url: "https://mpp.orthogonal.com/tomba/v1/linkedin",
    provider: "Tomba API",
    rating: null,
  },
  {
    id: "scoop-email-finder",
    name: "Scoop Email Finder",
    price: "$0.25/call",
    description:
      "Find verified work and/or personal emails across Aleads, Apollo, Nymeria, and ContactOut.",
    category: "contact",
    whatItDoes:
      "Queries multiple data providers for a LinkedIn URL or name+company, with optional Hunter.io verification.",
    protocol: "x402",
    url: "https://api.scoop.sundaebar.ai/x402/find-email",
    provider: "scoop.sundaebar.ai",
    rating: null,
  },
  {
    id: "deepline-personal-email",
    name: "Deepline Personal Email Discovery",
    price: "$0.10/call",
    description:
      "Find personal email addresses via waterfall discovery from domain, LinkedIn, or company name.",
    category: "contact",
    whatItDoes:
      "Runs Deepline GTM personal email discovery for individuals at a given company.",
    protocol: "x402",
    url: "https://stable-deepline.dev/api/email/personal",
    provider: "Deepline GTM",
    rating: null,
  },
  {
    id: "tomba-phone-finder",
    name: "Tomba Phone Finder",
    price: "$0.01/call",
    description: "Find phone numbers associated with an email, domain, or LinkedIn profile.",
    category: "contact",
    whatItDoes:
      "Returns phone numbers linked to an email address, domain, or LinkedIn profile URL.",
    protocol: "mpp",
    url: "https://mpp.orthogonal.com/tomba/v1/phone-finder",
    provider: "Tomba API",
    rating: null,
  },
  {
    id: "hirescrape-linkedin",
    name: "Hirescrape LinkedIn Scraper",
    price: "$0.00225/call",
    description:
      "Scrape LinkedIn profiles, company pages, company posts, and individual posts with no API key.",
    category: "linkedin",
    whatItDoes:
      "Pay-per-call LinkedIn scraping for people, companies, posts, and job listings.",
    protocol: "x402",
    url: "https://hirescrape.com",
    provider: "hirescrape.com",
    rating: "4.7",
  },
  {
    id: "linkedin-find-profile-url",
    name: "LinkedIn Find Profile URL (AI-powered)",
    price: "$0.06/call",
    description:
      "Find a LinkedIn profile URL given a person's name and optional context.",
    category: "linkedin",
    whatItDoes:
      "Uses AI to resolve a LinkedIn profile URL from name and contextual information.",
    protocol: "mpp",
    url: "https://mpp.orthogonal.com",
    provider: "mpp.orthogonal.com",
    rating: "5.0",
  },
  {
    id: "anyapi-linkedin-employees",
    name: "AnyAPI LinkedIn Company Employees",
    price: "$0.10/call",
    description: "Scrape and return employees for a given LinkedIn company profile.",
    category: "linkedin",
    whatItDoes:
      "Returns a list of employees associated with a LinkedIn company page.",
    protocol: "x402",
    url: "https://api.getanyapi.com",
    provider: "api.getanyapi.com",
    rating: null,
  },
  {
    id: "crustdata-hiring-signal",
    name: "Crustdata Cached Job Listings (Hiring Signal)",
    price: "$0.003/result",
    description:
      "Search cached job listings to surface hiring signals for account growth and expansion.",
    category: "jobs",
    whatItDoes:
      "Queries Crustdata's cached job listings database for hiring signals indicating growth or technology adoption.",
    protocol: "mpp",
    url: "https://crustdata.withzero.xyz",
    provider: "crustdata.withzero.xyz",
    rating: "5.0",
  },
  {
    id: "fantastic-jobs-ats",
    name: "Fantastic Jobs – Active ATS Feed",
    price: "$0.10/call",
    description:
      "New jobs from 54 ATS platforms (company career pages), refreshed hourly.",
    category: "jobs",
    whatItDoes:
      "Returns newly posted ATS jobs with 30+ filters including title, location, experience level, and work arrangement.",
    protocol: "mpp",
    url: "https://mpp.orthogonal.com/fantastic-jobs/v1/active-ats",
    provider: "Fantastic Jobs",
    rating: null,
  },
  {
    id: "fantastic-jobs-jb",
    name: "Fantastic Jobs – LinkedIn, Wellfound & YC Feed",
    price: "$0.01/call",
    description:
      "New jobs from LinkedIn, Wellfound, and Y Combinator, refreshed hourly for English-speaking countries.",
    category: "jobs",
    whatItDoes:
      "Returns newly posted jobs from LinkedIn, Wellfound, and Y Combinator job boards.",
    protocol: "mpp",
    url: "https://mpp.orthogonal.com/fantastic-jobs/v1/active-jb",
    provider: "Fantastic Jobs",
    rating: null,
  },
  {
    id: "apollo-job-postings",
    name: "Apollo Organization Job Postings",
    price: "$0.005/call",
    description: "Retrieve active job postings for a specific organization.",
    category: "jobs",
    whatItDoes:
      "Looks up active job postings using an Apollo organization ID.",
    protocol: "mpp",
    url: "https://apollo.mpp.paywithlocus.com/apollo/job-postings",
    provider: "Apollo",
    rating: null,
  },
  {
    id: "coresignal-job-search",
    name: "Coresignal Job Search API",
    price: "$0.02/call",
    description:
      "Search and filter job postings by title, location, company, industry, and dates.",
    category: "jobs",
    whatItDoes:
      "Queries Coresignal's job database and returns matching job listings.",
    protocol: "x402",
    url: "https://stable-jobs-git-ben-test-agentcash-router-pr-227-merit-systems.vercel.app/api/coresignal/job-search",
    provider: "Coresignal",
    rating: null,
  },
  {
    id: "crowdpull-hiring-signals",
    name: "CrowdPull Hiring Signals Workflow",
    price: "$0.19/call",
    description:
      "Scrape and normalize public job postings and hiring signals from ZipRecruiter and other sources.",
    category: "jobs",
    whatItDoes:
      "Returns a ranked dataset of job listings for a given role, company, or keyword.",
    protocol: "x402",
    url: "https://crowdpull.click/api/workflows/hiring-signals",
    provider: "crowdpull.click",
    rating: null,
  },
  {
    id: "agentmail-send",
    name: "AgentMail Send Email Message",
    price: "$0.01/call",
    description: "Send an email from a specified AI agent inbox via AgentMail.",
    category: "outreach",
    whatItDoes:
      "Sends an email message from a provisioned AgentMail inbox to one or more recipients.",
    protocol: "x402",
    url: "https://x402.api.agentmail.to",
    provider: "AgentMail",
    rating: "5.0",
  },
  {
    id: "stableemail-send",
    name: "StableEmail Send",
    price: "$0.02/call",
    description:
      "Send email from relay@stableemail.dev with optional CC, reply-to, HTML/text, and attachments.",
    category: "outreach",
    whatItDoes:
      "Delivers outbound email via StableEmail for outreach and transactional messaging.",
    protocol: "mpp",
    url: "https://stableemail.dev",
    provider: "stableemail.dev",
    rating: "5.0",
  },
  {
    id: "stablephone-ai-call",
    name: "StablePhone AI Call",
    price: "$0.54/call",
    description:
      "Initiate an AI-powered outbound phone call to a US number with a specified task/script.",
    category: "outreach",
    whatItDoes:
      "Starts an outbound AI phone call and returns a call_id for status tracking.",
    protocol: "x402",
    url: "https://stablephone.dev",
    provider: "stablephone.dev",
    rating: "4.6",
  },
  {
    id: "stablephone-call-status",
    name: "StablePhone Call Status & Transcript",
    price: "Free",
    description:
      "Poll status and retrieve the transcript of a previously initiated AI phone call.",
    category: "outreach",
    whatItDoes:
      "Looks up call status and transcript by call ID from StablePhone.",
    protocol: null,
    url: "https://stablephone.dev",
    provider: "stablephone.dev",
    rating: "5.0",
  },
  {
    id: "anyapi-github-activity",
    name: "AnyAPI GitHub User Activity",
    price: "$0.002/call",
    description:
      "Fetch a GitHub user's recent public activity including commits, PRs, and issues.",
    category: "signals",
    whatItDoes:
      "Returns a GitHub user's recent public activity feed for evidence of engineering work.",
    protocol: "x402",
    url: "https://api.getanyapi.com",
    provider: "api.getanyapi.com",
    rating: null,
  },
  {
    id: "anyapi-github-contributions",
    name: "AnyAPI GitHub User Contributions",
    price: "$0.002/call",
    description:
      "Fetch a GitHub user's contribution activity and contribution graph data.",
    category: "signals",
    whatItDoes:
      "Returns commit history and contribution graph signals for a GitHub username.",
    protocol: "x402",
    url: "https://api.getanyapi.com",
    provider: "api.getanyapi.com",
    rating: null,
  },
  {
    id: "gocreative-github-enrichment",
    name: "GoCreative GitHub User Enrichment",
    price: "$0.05/call",
    description:
      "Enrich a GitHub username with structured profile and repository data.",
    category: "signals",
    whatItDoes:
      "Returns structured GitHub profile and repository intelligence for a username.",
    protocol: "x402",
    url: "https://gocreative.ai",
    provider: "GoCreative",
    rating: null,
  },
];

export function getZeroToolCount(): number {
  return ZERO_TOOLS.length;
}
