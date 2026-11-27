import CortexWorkspace from "@/components/CortexWorkspace";
import { getWorkspaceGraph } from "@/lib/cortex";

export const metadata = { title: "2D Index | Vinh Cortex" };

export default function IndexPage() {
  return <CortexWorkspace {...getWorkspaceGraph("constellation")} entry="index" />;
}
