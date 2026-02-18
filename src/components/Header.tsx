import Link from 'next/link';
import { config } from '@/config';

export default function Header() {
    return (
        <header className="bg-white shadow-md sticky top-0 z-50">
            <div className="container mx-auto px-4 py-4 flex justify-between items-center">
                <Link href="/" className="text-lg md:text-2xl font-bold flex items-center gap-2 md:gap-3">
                    {/* Updated Logo Path & Responsive Sizing */}
                    <img src="/images/Logo.png" alt={config.teamName} className="h-8 md:h-12 w-auto" />
                    <span style={{ color: config.colors.secondary }}>{config.teamName}</span>
                </Link>
                <nav>
                    <ul className="flex space-x-3 md:space-x-6 font-medium text-xs md:text-base text-gray-600 items-center">
                        <li><Link href="/matches" className="hover:text-[#0057B7] transition">Matches</Link></li>
                        <li><Link href="/stats" className="hover:text-[#0057B7] transition">Stats</Link></li>
                        <li className="text-gray-300">|</li>
                        <li><Link href="/#video" className="hover:text-[#0057B7] transition">Video</Link></li>
                        <li><Link href="/#schedule" className="hover:text-[#0057B7] transition">Schedule</Link></li>
                    </ul>
                </nav>
            </div>
        </header>
    );
}
