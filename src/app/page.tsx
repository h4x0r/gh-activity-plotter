import { auth } from "@/auth";
import { Dashboard } from "@/components/dashboard";
import { Landing } from "@/components/landing";

export default async function Home() {
  const session = await auth();
  if (!session?.user) return <Landing />;
  return <Dashboard user={session.user} />;
}
