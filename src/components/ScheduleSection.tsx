import { config } from '@/config';
import SectionTitle from './SectionTitle';

// Helper to safely extract description
function getSafeDescription(event: any): string {
    if (!event.description) return '';
    if (typeof event.description === 'string') return event.description;
    if (typeof event.description === 'object' && event.description.val) return String(event.description.val);
    return String(event.description);
}

// Server Component for fetching and parsing iCal data
async function getSchedule() {
    const { src } = config.calendar;

    if (!src) {
        return [];
    }

    try {
        // Dynamic import to avoid build issues with node-ical
        const ical = await import('node-ical');
        // Check if default exists for robustness
        const icalLib = ical.default || ical;

        const events = await icalLib.async.fromURL(src);

        const schedule = [];
        const now = new Date(); // Current time
        now.setHours(0, 0, 0, 0);
        
        // Limit for recurring events (e.g., 6 months ahead)
        const limitDate = new Date(now);
        limitDate.setMonth(limitDate.getMonth() + 6);

        for (const k in events) {
            const event = events[k] as any;
            if (event.type === 'VEVENT') {
                const description = getSafeDescription(event);
                const duration = new Date(event.end).getTime() - new Date(event.start).getTime();

                // Handle Recurring Events
                if (event.rrule) {
                    // event.rrule is a parsed RRule object provided by node-ical
                    // .between() returns all dates between start and end
                    // We typically need to handle timezone offsets if dealing with strict times, 
                    // but for a simple display, using the JS Date objects returned is usually sufficient.
                    try {
                        const dates = event.rrule.between(now, limitDate);
                        dates.forEach((date: Date) => {
                            schedule.push({
                                summary: event.summary,
                                start: date,
                                end: new Date(date.getTime() + duration),
                                location: event.location,
                                description: description,
                            });
                        });
                    } catch (e) {
                        console.error(`Error processing RRULE for event ${event.summary}:`, e);
                    }
                } 
                // Handle Single Events
                else {
                    const start = new Date(event.start);
                    // show events from today
                    if (start >= now) {
                        schedule.push({
                            summary: event.summary,
                            start: start,
                            end: new Date(event.end),
                            location: event.location,
                            description: description,
                        });
                    }
                }
            }
        }

        // Sort by date
        schedule.sort((a, b) => a.start.getTime() - b.start.getTime());

        // Return top 10 upcoming events
        return schedule.slice(0, 10);

    } catch (error) {
        console.error("Error fetching iCal data:", error);
        return [];
    }
}

export default async function ScheduleSection() {
    const events = await getSchedule();

    return (
        <section id="schedule" className="py-16 bg-gray-50">
            <div className="container mx-auto px-4">
                <SectionTitle title="Schedule" subtitle="今後の予定" />

                <div className="max-w-4xl mx-auto">
                    {events.length === 0 ? (
                        <p className="text-center text-gray-500">予定はありません。</p>
                    ) : (
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            <ul className="divide-y divide-gray-100">
                                {events.map((event, index) => {
                                    const descriptionLines = event.description ? event.description.split('\n').slice(0, 3) : [];
                                    
                                    return (
                                        <li key={index} className="p-4 hover:bg-gray-50 transition flex flex-col md:flex-row gap-4">
                                            <div className="md:w-32 flex-shrink-0 text-center md:text-left flex flex-row md:flex-col justify-between md:justify-start items-center md:items-start border-b md:border-b-0 pb-2 md:pb-0 mb-2 md:mb-0">
                                                <div className="text-sm font-bold text-gray-400">
                                                    {event.start.getFullYear()}
                                                </div>
                                                <div className="flex items-baseline gap-2 md:block">
                                                    <div className="text-xl font-bold text-gray-800">
                                                        {event.start.toLocaleDateString('ja-JP', { month: 'short', day: 'numeric' })}
                                                        <span className="ml-1 text-sm text-gray-500 font-normal">
                                                            ({event.start.toLocaleDateString('ja-JP', { weekday: 'short' })})
                                                        </span>
                                                    </div>
                                                    <div className="text-sm text-gray-500">
                                                        {event.start.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                        {' - '}
                                                        {event.end.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex-grow">
                                                <h3 className="text-lg font-bold text-gray-800">
                                                    {event.summary}
                                                </h3>
                                                {event.location && (
                                                    <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                                                        <span>📍</span> {event.location}
                                                    </p>
                                                )}
                                                {descriptionLines.length > 0 && (
                                                    <div className="text-sm text-gray-600 mt-2 bg-gray-50 p-3 rounded-md border border-gray-100">
                                                        {descriptionLines.map((line: string, i: number) => (
                                                            <p key={i} className="line-clamp-1">{line}</p>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        </li>
                                    );
                                })}
                            </ul>
                        </div>
                    )}

                    <div className="mt-8 text-center">
                        <a
                            href="https://calendar.google.com/calendar/r"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:underline text-sm"
                        >
                            Googleカレンダーで管理する
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );
}
