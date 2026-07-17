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

export type MockClaim = {
  label: string;
  status: "verified" | "uncertain" | "contradicting";
  sources: string[];
  confidence: number;
  supporting?: string;
  contradicting?: string;
};

export type MockDemoCandidate = {
  name: string;
  headline: string;
  strongestSignal: string;
  freshnessDays: number;
  location: string;
  tags: string[];
  profile: MockPersonProfile;
  claims: MockClaim[];
  githubClaims: MockClaim[];
};
