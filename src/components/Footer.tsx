import { config } from '@/config';

export default function Footer() {
    // Generate a build-time timestamp string
    const buildTime = new Date().toLocaleString('ja-JP', { timeZone: 'Asia/Tokyo' });

    return (
        <footer className="bg-gray-800 text-white py-8 mt-12">
            <div className="container mx-auto px-4 text-center">
                <h3 className="text-xl font-bold mb-4">{config.teamName}</h3>

                <div className="mb-6 p-4 bg-red-900/50 border border-red-500 rounded-lg max-w-2xl mx-auto">
                    <p className="text-sm font-bold text-red-200">
                        【ご注意】本サイトはチーム関係者専用です。URLの外部への公開は控えてください。
                    </p>
                </div>

                <div className="text-gray-400 text-sm">
                    <p>&copy; {new Date().getFullYear()} {config.teamName}. All rights reserved.</p>
                    <p className="mt-2 opacity-50 text-xs">
                        Build: {buildTime} (v1.2.0)
                    </p>
                </div>
            </div>
        </footer>
    );
}
