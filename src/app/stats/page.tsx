import { getMatches } from "@/services/matchService";
import { getPlayers } from "@/services/playerService";
import StatsClient from "./StatsClient";

// export const revalidate = 3600; // SSG Mode // Use 0 for "dynamic" if you want revalidation, 
// BUT for true SSG/Zero-Read, we rely on "npm run build".
// Next.js default is caching. We can force it to be static by NOT providing dynamic params.

export default async function StatsPage() {
  const { matches } = await getMatches(1000, null);
  const players = await getPlayers();

  return <StatsClient initialMatches={matches} players={players} />;
}
