import dynamic from "next/dynamic";


const AiAssistant = dynamic(() => import("@/components/pawtrack/ai-assistant"));

export default function AiAssistantPage() {
  return <AiAssistant />;
}