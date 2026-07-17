import "server-only";

import { getZeroConnection } from "@/lib/zero/connection";
import { getOrgZeroClient } from "@/lib/zero/sdk";
import {
  ZERO_TOOLS,
  type ZeroTool,
  type ZeroToolCategory,
} from "@/lib/zero-tools";

function inferCategory(text: string): ZeroToolCategory {
  const t = text.toLowerCase();
  if (/(outreach|email|mail|sms|phone|call)/.test(t)) return "outreach";
  if (/(linkedin|li\b)/.test(t)) return "linkedin";
  if (/(job|hiring|career|greenhouse|lever)/.test(t)) return "jobs";
  if (/(contact|email.?find|phone.?find|enrich.?contact)/.test(t))
    return "contact";
  if (/(github|signal|intent|funding|news)/.test(t)) return "signals";
  if (/(enrich|profile|person|company)/.test(t)) return "enrichment";
  return "search";
}

function formatToolPrice(amount: string | undefined, summary?: string | null) {
  if (summary) return summary;
  if (!amount || amount === "0") return "Free";
  const n = Number.parseFloat(amount);
  if (!Number.isFinite(n)) return amount;
  return `$${n.toFixed(n < 0.01 ? 4 : 2)}/call`;
}

/** Live Zero search for hiring tools; falls back to the static snapshot. */
export async function getZeroToolsForOrg(
  organizationId: string,
  query = "recruiting people enrichment contact search linkedin",
): Promise<{ tools: ZeroTool[]; live: boolean }> {
  try {
    const conn = await getZeroConnection(organizationId);
    if (!conn) return { tools: ZERO_TOOLS, live: false };

    const client = await getOrgZeroClient(organizationId);
    if (!client) return { tools: ZERO_TOOLS, live: false };

    const { capabilities } = await client.search(query, { limit: 40 });
    if (!capabilities.length) return { tools: ZERO_TOOLS, live: false };

    const tools: ZeroTool[] = capabilities.map((cap) => {
      const hay = [cap.name, cap.description, cap.whatItDoes, cap.slug]
        .filter(Boolean)
        .join(" ");
      let provider: string | null = null;
      try {
        provider = new URL(cap.url).hostname;
      } catch {
        provider = null;
      }
      return {
        id: cap.slug || cap.id,
        name: cap.name,
        price: formatToolPrice(cap.cost?.amount, cap.pricing?.summary ?? null),
        description: cap.description || cap.whatItDoes || "",
        category: inferCategory(hay),
        whatItDoes: cap.whatItDoes || cap.description || "",
        protocol: cap.protocol ?? null,
        url: cap.url,
        provider,
        rating: cap.rating?.stars || cap.rating?.score || null,
      };
    });

    return { tools, live: true };
  } catch {
    return { tools: ZERO_TOOLS, live: false };
  }
}
