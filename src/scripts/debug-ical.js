const ical = require('node-ical');

async function debugSchedule() {
    const src = "https://www.c-sqr.net/ical/wKTkGIJaWbU6gGlrBUHN.ics";
    console.log('Fetching iCal from: ' + src);

    try {
        const events = await ical.async.fromURL(src);
        const schedule = [];

        // =========================================================
        // EXACT LOGIC FROM ScheduleSection.tsx
        // =========================================================
        
        // 1. Get current UTC time
        const nowUTC = new Date();
        
        // 2. Add 9 hours (JST offset)
        const jstDate = new Date(nowUTC.getTime() + (9 * 60 * 60 * 1000));
        
        // 3. Set to midnight
        jstDate.setUTCHours(0, 0, 0, 0);
        
        // 4. Subtract the 9 hours to get back to the TRUE UTC timestamp that represents JST Midnight.
        const midnightJST = new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));

        // Use this absolute timestamp as 'now'
        const now = midnightJST;

        // Limit for recurring events (e.g., 6 months ahead)
        const limitDate = new Date(now);
        limitDate.setMonth(limitDate.getMonth() + 6);

        console.log('\n--- DEBUG INFO ---');
        console.log('System Time (UTC): ' + nowUTC.toISOString());
        console.log('Calculated "now" (Midnight JST in UTC): ' + now.toISOString());
        console.log('Limit Date: ' + limitDate.toISOString());
        
        console.log('\n--- PROCESSING EVENTS ---');

        for (const k in events) {
            const event = events[k];
            if (event.type === 'VEVENT') {
                const duration = new Date(event.end).getTime() - new Date(event.start).getTime();

                // Handle Recurring Events
                if (event.rrule) {
                    try {
                        const dates = event.rrule.between(now, limitDate);
                        dates.forEach((date) => {
                            // Extra safety check: ensure the date is actually >= now
                            if (date >= now) {
                                console.log('[ACCEPTED] ' + event.summary + ' @ ' + date.toISOString());
                                schedule.push({
                                    summary: event.summary,
                                    start: date
                                });
                            } else {
                                console.log('[FILTERED] ' + event.summary + ' @ ' + date.toISOString() + ' (Reason: < now)');
                            }
                        });
                    } catch (e) {
                        console.error('Error processing RRULE for event ' + event.summary + ':', e);
                    }
                } 
                // Handle Single Events
                else {
                    const start = new Date(event.start);
                    if (start >= now) {
                         console.log('[ACCEPTED] ' + event.summary + ' @ ' + start.toISOString());
                         schedule.push({
                            summary: event.summary,
                            start: start
                        });
                    } else {
                         // console.log('[FILTERED] Single event ' + event.summary + ' @ ' + start.toISOString());
                    }
                }
            }
        }
        
        console.log('\n--- FINAL SCHEDULE (Top 5) ---');
        schedule.sort((a, b) => a.start.getTime() - b.start.getTime());
        schedule.slice(0, 5).forEach(e => {
            console.log(e.start.toISOString() + ' - ' + e.summary);
        });

    } catch (error) {
        console.error("Error fetching iCal data:", error);
        return [];
    }
}

debugSchedule();
