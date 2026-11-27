import CortexWorkspace from "@/components/CortexWorkspace";
import { getWorkspaceGraph } from "@/lib/cortex";

export default function Home() {
  return <CortexWorkspace {...getWorkspaceGraph("constellation")} />;
}
