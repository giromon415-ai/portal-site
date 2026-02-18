import { getMatches } from "@/services/matchService";
import { getPlayers } from "@/services/playerService";
import MatchesClient from "./MatchesClient";
import Link from "next/link";

// export const revalidate = 3600; // SSG Mode // Or ensure dynamic/static behavior

export default async function MatchesPage() {
  // Fetch ALL matches (limit 1000 to be safe) at build/request time
  const { matches } = await getMatches(1000, null);
  const players = await getPlayers();

  // Initial sort server-side to pass clean data
  const sortedMatches = matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  return <MatchesClient initialMatches={sortedMatches} players={players} />;
}
