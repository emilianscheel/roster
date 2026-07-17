import {
  DEMO_CANDIDATES,
  DEMO_SERVICES,
  mockResearchData,
} from "../src/lib/zero/mock-research";

const discover = mockResearchData({
  service: "zero",
  capability: "zero.discover",
  purpose: "test",
}) as { services: unknown[] };

const search = mockResearchData({
  service: "profile-scraper",
  capability: "profile.extract",
  purpose: "founding rust",
  query: "founding infrastructure engineer rust kubernetes",
}) as { candidates: unknown[] };

const verify = mockResearchData({
  service: "targeted-search",
  capability: "web.search",
  purpose: "Must-have",
  query: "Alex Rivera",
}) as { claims: unknown[]; candidates?: unknown[] };

const enrich = mockResearchData({
  service: "person-enrichment",
  capability: "person.enrich",
  purpose: "enrich",
  query: "Jordan Lee",
}) as { profile: { experiences?: unknown[] }; claims: unknown[] };

const github = mockResearchData({
  service: "github-signals",
  capability: "github.activity",
  purpose: "oss",
  query: "Priya Nair",
}) as { claims: unknown[] };

const sreSearch = mockResearchData({
  service: "profile-scraper",
  capability: "profile.extract",
  purpose: "sre",
  query: "SRE transitioning kubernetes operators",
}) as { candidates: { name: string }[] };

const out = {
  services: discover.services.length,
  demoServices: DEMO_SERVICES.length,
  catalog: DEMO_CANDIDATES.length,
  searchCount: search.candidates.length,
  verifyClaims: verify.claims.length,
  verifyHasCandidates: Array.isArray(verify.candidates),
  enrichExp: enrich.profile.experiences?.length ?? 0,
  githubClaims: github.claims.length,
  sreTop3: sreSearch.candidates.slice(0, 3).map((c) => c.name),
};

console.log(JSON.stringify(out, null, 2));

const ok =
  out.catalog >= 8 &&
  out.demoServices >= 12 &&
  out.searchCount >= 8 &&
  out.verifyClaims >= 3 &&
  !out.verifyHasCandidates &&
  out.enrichExp >= 2 &&
  out.githubClaims >= 1;

if (!ok) {
  console.error("SMOKE FAILED");
  process.exit(1);
}
console.log("SMOKE OK");
