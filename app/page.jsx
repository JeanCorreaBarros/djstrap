import App from "../components/App";
import { LandingNav, LandingHero, LandingRest } from "../components/Landing";
import { currentUser } from "../lib/auth";
import { userPayload, listMixes, stats, recordVisit } from "../lib/db";

export const dynamic = "force-dynamic";

export default async function Page() {
  const u = await currentUser();
  if (u) return <App initialUser={await userPayload(u)} />;
  recordVisit().catch(() => {});
  const [mixes, st] = await Promise.all([
    listMixes({ sort: "top", limit: 6 }).catch(() => []),
    stats().catch(() => ({ users: 0, mixes: 0, playlists: 0 })),
  ]);
  return <App initialUser={null} nav={<LandingNav />} hero={<LandingHero />} rest={<LandingRest mixes={mixes} stats={st} />} />;
}
