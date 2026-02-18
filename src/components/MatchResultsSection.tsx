'use client';

import { Match, Player } from '@/types';
import Link from 'next/link';
import SectionTitle from '@/components/SectionTitle';
import MatchDetailModal from '@/components/MatchDetailModal';
import { useState } from 'react';

interface GroupedMatch {
    date: string;
    matches: Match[];
}

interface Props {
    history: GroupedMatch[];
    players: Map<string, Player>;
}

export default function MatchResultsSection({ history, players }: Props) {
    const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);

    if (!history || history.length === 0) {
        return null; // Don't show section if no data
    }

    return (
        <section id="results" className="py-16 bg-white">
            <div className="container mx-auto px-4">
                <SectionTitle title="Results" subtitle="試合結果" />

                <div className="max-w-4xl mx-auto space-y-8">
                    {history.map((group) => {
                        const dayTotalGoals = group.matches.reduce((sum, m) => sum + Number(m.scoreMyself), 0);
                        const dayTotalLost = group.matches.reduce((sum, m) => sum + Number(m.scoreOpponent), 0);
                        const wins = group.matches.filter(m => m.result === 'win').length;
                        const loses = group.matches.filter(m => m.result === 'lose').length;
                        const draws = group.matches.filter(m => m.result === 'draw').length;

                        return (
                            <div key={group.date} className="bg-gray-50 rounded-xl overflow-hidden shadow-sm">
                                <div className="bg-gray-100 px-4 py-3 flex justify-between items-center border-b border-gray-200">
                                    <h3 className="font-bold text-lg text-gray-800">
                                        {group.date}
                                    </h3>
                                    <div className="text-sm space-x-4">
                                        <span className="font-bold text-blue-600">{wins}勝</span>
                                        <span className="font-bold text-red-500">{loses}敗</span>
                                        <span className="font-bold text-gray-500">{draws}分</span>
                                        <span className="text-gray-400">|</span>
                                        <span className="font-bold text-gray-700">得点: {dayTotalGoals}</span>
                                        <span className="font-bold text-gray-700">失点: {dayTotalLost}</span>
                                    </div>
                                </div>
                                <div className="divide-y divide-gray-200">
                                    {group.matches.map((match) => (
                                        <div key={match.id} className="p-4 flex items-center justify-between hover:bg-white transition">
                                            <div className="flex-1">
                                                {match.label && <div className="text-xs text-gray-500 mb-1">{match.label}</div>}
                                                <div className="font-bold text-gray-700">{match.opponent}</div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <button
                                                    onClick={() => setSelectedMatch(match)}
                                                    className={`text-2xl font-bold px-6 py-2 rounded-lg transition hover:opacity-80 shadow-sm
                                                    ${match.result === 'win' ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' :
                                                            match.result === 'lose' ? 'bg-red-100 text-red-700 hover:bg-red-200' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'}`}
                                                >
                                                    {match.scoreMyself} - {match.scoreOpponent}
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        );
                    })}

                    <MatchDetailModal
                        isOpen={!!selectedMatch}
                        match={selectedMatch}
                        players={players}
                        onClose={() => setSelectedMatch(null)}
                    />

                    <div className="text-center mt-8 flex flex-col md:flex-row justify-center gap-4">
                        <Link href="/matches" className="inline-block bg-blue-600 text-white w-full md:w-80 py-4 text-xl flex justify-center items-center rounded-full font-bold shadow hover:bg-blue-700 transition">
                            試合結果一覧を見る
                        </Link>
                        <Link href="/stats" className="inline-block bg-white text-blue-600 border border-blue-600 w-full md:w-80 py-4 text-xl flex justify-center items-center rounded-full font-bold shadow hover:bg-blue-50 transition">
                            期間集計を見る
                        </Link>
                    </div>
                </div>
            </div>
        </section>
    );
}





