import { getRecentMatches } from "@/services/matchService";
import { getPlayers } from "@/services/playerService";
import MatchResultsSection from "@/components/MatchResultsSection";
import Hero from "@/components/Hero";
import VideoSection from "@/components/VideoSection";
import ScheduleSection from "@/components/ScheduleSection";
import Link from "next/link";
import { Match, Player } from "@/types";

export const revalidate = 10800; // ISR Mode (3 hours)

interface GroupedMatch {
    date: string;
    matches: Match[];
}

export default async function Home() {
  // Fetch more matches to ensure we get 5 distinct groups (days)
  const [matches, players] = await Promise.all([
      getRecentMatches(50), 
      getPlayers()
  ]);

  // Sort matches by Date object to fix "2/8" > "2/15" string issue
  // Validates if date is YYYY/MM/DD or just MM/DD (which defaults to current year)
  matches.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  // Transform players to Map
  const playerMap = new Map<string, Player>();
  players.forEach(p => playerMap.set(p.id, p));

  // Group matches by date
  const groupedMatches: GroupedMatch[] = [];
  matches.forEach(match => {
      const existingGroup = groupedMatches.find(g => g.date === match.date);
      if (existingGroup) {
          existingGroup.matches.push(match);
      } else {
          groupedMatches.push({ date: match.date, matches: [match] });
      }
  });

  // Limit to 5 groups (days)
  const recentGroups = groupedMatches.slice(0, 5);

  return (
    <main className="min-h-screen bg-gray-50 pb-20">
      <Hero />
      
      <div className="container mx-auto px-4 pt-12">
         <div className="flex justify-between items-center mb-2 max-w-4xl mx-auto">
           <h2 className="text-3xl font-bold border-l-4 border-blue-600 pl-4">Latest Matches</h2>
           <Link href="/matches" className="text-blue-600 font-bold hover:underline">
             View All &rarr;
           </Link>
        </div>
      </div>
      
      <MatchResultsSection history={recentGroups} players={playerMap} />

      <VideoSection />
      <ScheduleSection />
    </main>
  );
}
