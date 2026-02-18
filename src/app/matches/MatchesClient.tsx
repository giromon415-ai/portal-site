'use client';

import { useState, useEffect } from "react";
import { Match, Player } from "@/types";
import MatchDetailModal from "@/components/MatchDetailModal";
import Link from "next/link";

interface MatchesClientProps {
  initialMatches: Match[];
  players: Player[];
}

export default function MatchesClient({ initialMatches, players }: MatchesClientProps) {
  const [allMatches, setAllMatches] = useState<Match[]>([]);
  const [filteredMatches, setFilteredMatches] = useState<Match[]>([]);
  const [displayedMatches, setDisplayedMatches] = useState<Match[]>([]);
  const [page, setPage] = useState(1);
  const ITEMS_PER_PAGE = 20;

  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

  // Filters
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [opponent, setOpponent] = useState("");

  // Master Data
  const [playerMap, setPlayerMap] = useState<Map<string, Player>>(new Map());

  useEffect(() => {
    // Initialize Player Map
    const map = new Map();
    players.forEach(p => map.set(p.id, p));
    setPlayerMap(map);

    // Initialize Matches (Sort just in case, though server should sort too)
    const sorted = [...initialMatches].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    setAllMatches(sorted);
    setFilteredMatches(sorted);
    setDisplayedMatches(sorted.slice(0, ITEMS_PER_PAGE));
  }, [initialMatches, players]);

  const handleSearch = () => {
    let result = allMatches;

    if (startDate && endDate) {
      const sDate = new Date(startDate).setHours(0,0,0,0);
      const eDate = new Date(endDate).setHours(0,0,0,0);
      
      result = result.filter(m => {
         const mDate = new Date(m.date).setHours(0,0,0,0);
         return mDate >= sDate && mDate <= eDate;
      });
    }

    if (opponent) {
        result = result.filter(m => m.opponent.includes(opponent));
    }

    setFilteredMatches(result);
    setPage(1);
    setDisplayedMatches(result.slice(0, ITEMS_PER_PAGE));
  };

  const handleShowMore = () => {
    const nextPage = page + 1;
    setPage(nextPage);
    setDisplayedMatches(filteredMatches.slice(0, nextPage * ITEMS_PER_PAGE));
  };

  const hasMore = displayedMatches.length < filteredMatches.length;

  return (
    <main className="container mx-auto px-4 py-8 max-w-2xl">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">試合履歴</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">Topへ戻る</Link>
      </header>
      
      {/* Filter Section */}
      <div className="bg-gray-50 p-4 rounded-lg mb-6 shadow-inner">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">期間</label>
            <div className="flex items-center gap-2">
              <input 
                type="date" 
                value={startDate} 
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
              <span className="text-gray-400">~</span>
              <input 
                type="date" 
                value={endDate} 
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full border rounded px-2 py-1 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 mb-1">対戦相手</label>
            <input 
              type="text" 
              placeholder="チーム名 (部分一致)"
              value={opponent} 
              onChange={(e) => setOpponent(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm"
            />
          </div>
        </div>
        <div className="text-center">
          <button 
            onClick={handleSearch}
            className="bg-blue-600 text-white px-8 py-2 rounded-full text-sm font-bold shadow hover:bg-blue-700 transition"
          >
            検索
          </button>
        </div>
      </div>

      <div className="space-y-4">
        {displayedMatches.length === 0 && (
            <p className="text-center text-gray-500 py-8">条件に一致する試合は見つかりませんでした。</p>
        )}

        {displayedMatches.map(match => (
          <div 
            key={match.id}
            onClick={() => setSelectedMatch(match)}
            className="bg-white p-4 rounded-lg shadow cursor-pointer hover:bg-gray-50 transition border border-transparent hover:border-blue-200"
          >
            <div className="flex justify-between items-center">
              <div>
                <div className="text-xs text-gray-500 mb-1 flex items-center gap-2">
                   <span>{match.date}</span>
                   {match.label && <span className="bg-gray-100 px-1 rounded text-xs">{match.label}</span>}
                </div>
                <div className="font-bold text-lg">{match.opponent}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`font-bold text-xl ${match.result === 'win' ? 'text-blue-600' : match.result === 'lose' ? 'text-red-600' : ''}`}>{match.scoreMyself}</span>
                <span className="text-gray-300">-</span>
                <span className={`font-bold text-xl ${match.result === 'lose' ? 'text-blue-600' : match.result === 'win' ? 'text-red-600' : ''}`}>{match.scoreOpponent}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <div className="mt-8 text-center">
          <button 
            onClick={handleShowMore} 
            className="bg-white border border-gray-300 text-gray-600 px-6 py-2 rounded-full font-bold shadow-sm hover:bg-gray-50"
          >
            もっと見る
          </button>
        </div>
      )}

      <MatchDetailModal
        isOpen={!!selectedMatch}
        onClose={() => setSelectedMatch(null)}
        match={selectedMatch}
        players={playerMap}
      />
    </main>
  );
}
