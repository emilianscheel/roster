import { CodingAgentChat } from "@/components/coding-agent-chat";

export default function AgentPage() {
  return (
    <div className="space-y-3">
      <h1 className="text-lg font-semibold">Agent</h1>
      <CodingAgentChat />
    </div>
  );
}
