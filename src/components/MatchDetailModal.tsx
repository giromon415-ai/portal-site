'use client';
import { Match, Player } from "@/types";
import { useEffect } from "react";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    match: Match | null;
    players: Map<string, Player>;
}

export default function MatchDetailModal({ isOpen, onClose, match, players }: Props) {
    
    // Prevent background scrolling when modal is open
    useEffect(() => {
        if (isOpen) {
             document.body.style.overflow = "hidden";
        } else {
             document.body.style.overflow = "";
        }
        return () => {
            document.body.style.overflow = "";
        };
    }, [isOpen]);

    if (!isOpen || !match) return null;

    // Events logic
    const myGoals = match.events ? match.events.filter((e) => e.type === "goal") : [];
    const opponentGoals = match.events ? match.events.filter((e) => e.type === "opponent_goal") : [];

    const getPlayerName = (id?: string) => {
        if (!id) return "";
        const p = players.get(id);
        return p ? `${p.name} (#${p.number})` : "Unknown";
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/60 transition-opacity"
                onClick={onClose}
            ></div>

            <div className="relative bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden animate-fade-in-up flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-gray-100 px-6 py-4 flex justify-between items-center border-b border-gray-200">
                    <h3 className="font-bold text-lg text-gray-800">
                        {match.date} vs {match.opponent}
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition p-2"
                    >
                        ✕
                    </button>
                </div>

                {/* Score Board */}
                <div className="py-8 text-center bg-gray-50 border-b border-gray-100 shrink-0">
                    <div className="flex items-center justify-center gap-8">
                        <div className="text-gray-600 font-bold">Myself</div>
                        <div className="flex items-center gap-4">
                            <span className={`text-4xl font-bold ${match.scoreMyself > match.scoreOpponent ? 'text-blue-600' : match.scoreMyself < match.scoreOpponent ? 'text-blue-800' : 'text-gray-800'}`}>
                                {match.scoreMyself}
                            </span>
                            <span className="text-2xl text-gray-300">-</span>
                            <span className={`text-4xl font-bold ${match.scoreMyself < match.scoreOpponent ? 'text-red-600' : match.scoreMyself > match.scoreOpponent ? 'text-red-800' : 'text-gray-800'}`}>
                                {match.scoreOpponent}
                            </span>
                        </div>
                        <div className="text-gray-600 font-bold">Opponent</div>
                    </div>
                </div>

                {/* Details */}
                <div className="p-6 overflow-y-auto grow">
                    <div className="mb-6">
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">得点経過 (自チーム)</h4>
                        {myGoals.length > 0 ? (
                            <ul className="space-y-3">
                                {myGoals.map((event, idx) => (
                                    <li key={idx} className="flex items-start text-sm">
                                        <span className="font-mono text-gray-400 w-12 text-right mr-4">{event.time}'</span>
                                        <div>
                                            <div className="font-bold text-gray-800">
                                                ⚽ {getPlayerName(event.playerId)}
                                            </div>
                                            {event.assistId && (
                                                <div className="text-gray-500 text-xs mt-0.5 ml-5">
                                                    👟 Assist: {getPlayerName(event.assistId)}
                                                </div>
                                            )}
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-gray-400 italic">No goals recorded</div>
                        )}
                    </div>

                    <div>
                        <h4 className="text-xs font-bold text-gray-500 uppercase mb-3 border-b pb-1">相手チーム得点</h4>
                        {opponentGoals.length > 0 ? (
                            <ul className="space-y-2">
                                {opponentGoals.map((event, idx) => (
                                    <li key={idx} className="flex items-center text-sm">
                                        <span className="font-mono text-gray-400 w-12 text-right mr-4">{event.time}'</span>
                                        <div className="text-gray-600">Goal (Opponent)</div>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <div className="text-sm text-gray-400 italic">No opponent goals recorded</div>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-100 bg-gray-50 text-center shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-white border border-gray-300 rounded-full text-sm font-bold text-gray-600 hover:bg-gray-100 transition shadow-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
