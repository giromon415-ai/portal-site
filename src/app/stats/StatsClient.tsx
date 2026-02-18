'use client';

import { useState, useEffect } from "react";
import { Match, Player } from "@/types";
import Link from "next/link";

interface StatsClientProps {
  initialMatches: Match[];
  players: Player[];
}

interface PlayerStat {
  id: string;
  name: string;
  number: string;
  goals: number;
  assists: number;
}

export default function StatsClient({ initialMatches, players }: StatsClientProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  
  // Date range state
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");

  useEffect(() => {
    // Default: This Month
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const today = new Date();
    
    setStartDate(formatDate(firstDay));
    setEndDate(formatDate(today));
    
    // Initial calculation will happen via the dependency on startDate/endDate below
  }, []);

  const formatDate = (d: Date) => {
    return d.toISOString().split('T')[0];
  };

  useEffect(() => {
    if (startDate && endDate) {
      filterMatches();
    }
  }, [startDate, endDate, initialMatches]);

  const filterMatches = () => {
     const sDate = new Date(startDate).setHours(0,0,0,0);
     const eDate = new Date(endDate).setHours(0,0,0,0);

     const filtered = initialMatches.filter(m => {
        const mDate = new Date(m.date).setHours(0,0,0,0);
        return mDate >= sDate && mDate <= eDate;
     });

     setMatches(filtered);
  };

  const calculateStats = () => {
    const statsMap: Record<string, PlayerStat> = {};

    // Init with all players
    players.forEach(p => {
      statsMap[p.id] = { id: p.id, name: p.name, number: p.number, goals: 0, assists: 0 };
    });

    let totalGoals = 0;

    matches.forEach(m => {
       const myScore = typeof m.scoreMyself === 'string' ? parseInt(m.scoreMyself) : m.scoreMyself;
       totalGoals += (myScore || 0);

       if (m.events) {
         m.events.forEach(e => {
           if (e.type === 'goal') {
             if (e.playerId && statsMap[e.playerId]) statsMap[e.playerId].goals++;
             if (e.assistId && statsMap[e.assistId]) statsMap[e.assistId].assists++;
           }
         });
       }
    });

    return {
      stats: Object.values(statsMap)
        .filter(p => p.goals > 0 || p.assists > 0)
        .sort((a, b) => b.goals - a.goals || b.assists - a.assists),
      totalGoals
    };
  };

  const { stats, totalGoals } = calculateStats();

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <header className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">成績集計</h1>
        <Link href="/" className="text-sm text-gray-500 hover:underline">Topへ戻る</Link>
      </header>

      <div className="bg-white p-4 rounded-lg shadow mb-8">
        <div className="flex gap-4 items-end mb-4">
          <div>
            <label className="block text-xs text-gray-500 mb-1">開始日</label>
            <input 
              type="date" 
              value={startDate} 
              onChange={(e) => setStartDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
          <span className="pb-3">~</span>
          <div>
            <label className="block text-xs text-gray-500 mb-1">終了日</label>
            <input 
              type="date" 
              value={endDate} 
              onChange={(e) => setEndDate(e.target.value)}
              className="border p-2 rounded"
            />
          </div>
        </div>
        
        <div className="text-sm text-gray-600">
          対象試合数: <span className="font-bold">{matches.length}</span>試合 / 
          総得点: <span className="font-bold">{totalGoals}</span>点
        </div>
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-100 border-b">
            <tr>
              <th className="py-2 px-4 text-center text-xs text-gray-500 w-16">No.</th>
              <th className="py-2 px-4 text-left text-xs text-gray-500">名前</th>
              <th className="py-2 px-4 text-right text-xs text-gray-500">Goal</th>
              <th className="py-2 px-4 text-right text-xs text-gray-500">Assist</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {stats.map(p => (
              <tr key={p.id} className="hover:bg-gray-50">
                <td className="py-3 px-4 text-center text-xs text-gray-400 font-mono">#{p.number}</td>
                <td className="py-3 px-4 font-bold text-gray-800">{p.name}</td>
                <td className="py-3 px-4 text-right font-bold text-blue-600">{p.goals}</td>
                <td className="py-3 px-4 text-right text-gray-500">{p.assists}</td>
              </tr>
            ))}
            {stats.length === 0 && (
               <tr>
                 <td colSpan={4} className="py-8 text-center text-gray-400">データがありません</td>
               </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  );
}
