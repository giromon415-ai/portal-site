'use client';

import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

export default function ScheduleRefreshButton() {
    const [isLoading, setIsLoading] = useState(false);

    const handleRefresh = () => {
        setIsLoading(true);
        const newUrl = window.location.pathname + '?t=' + new Date().getTime();
        window.location.href = newUrl;
    };

    return (
        <div className="mt-6 flex justify-center">
            <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:text-blue-600 transition shadow-sm disabled:opacity-50"
            >
                <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                {isLoading ? '更新中...' : '最新情報を取得'}
            </button>
        </div>
    );
}
