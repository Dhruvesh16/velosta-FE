import Navbar from "@/components/navbar";
import VelostaBotInterface from "@/components/velosta-ai/velosta-ai-interface";
import dynamic from "next/dynamic";

// const VelostaBotInterface = dynamic(
//   () => import("@/components/velosta/velosta-interface"),
//   {
//     ssr: false,
//   }
// );

export default function PlanPage() {
  return (
    <main className="h-screen w-full">
      <VelostaBotInterface />
    </main>
  );
}
