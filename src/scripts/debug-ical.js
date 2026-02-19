const ical = require('node-ical');

async function debugSchedule() {
    const src = "https://www.c-sqr.net/ical/wKTkGIJaWbU6gGlrBUHN.ics";
    console.log('Fetching iCal from: ' + src);

    try {
        const events = await ical.async.fromURL(src);
        const keys = Object.keys(events);
        console.log('Total events found: ' + keys.length);

        // ---------------------------------------------------------
        // 1. REPRODUCE CURRENT LOGIC (The "Shifted JST" approach)
        // ---------------------------------------------------------
        const nowShifted = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Tokyo' }));
        nowShifted.setHours(0, 0, 0, 0); 

        console.log('\n--- DEBUG: CURRENT LOGIC (Shifted JST) ---');
        console.log('System Real Time (ISO): ' + new Date().toISOString());
        console.log('Calculated "now" (Shifted): ' + nowShifted.toISOString());

        const limitDateShifted = new Date(nowShifted);
        limitDateShifted.setMonth(limitDateShifted.getMonth() + 6);

        // ---------------------------------------------------------
        // 2. ABSOLUTE TIMESTAMP LOGIC (Correct approach)
        // ---------------------------------------------------------
        const nowUTC = new Date();
        const jstDate = new Date(nowUTC.getTime() + (9 * 60 * 60 * 1000));
        jstDate.setUTCHours(0, 0, 0, 0);
        const midnightJSTAbsolute = new Date(jstDate.getTime() - (9 * 60 * 60 * 1000));

        console.log('\n--- DEBUG: ABSOLUTE LOGIC ---');
        console.log('Midnight JST (Absolute ISO): ' + midnightJSTAbsolute.toISOString());

        console.log('\n--- PROCESS EVENTS ---');
        
        for (const k in events) {
            const event = events[k];
            if (event.type === 'VEVENT') {
                if (event.rrule) {
                    const dates = event.rrule.between(nowShifted, limitDateShifted);
                    if (dates.length > 0) {
                        dates.forEach(d => {
                             const isPast = d < midnightJSTAbsolute;
                             if (isPast) {
                                  console.log('[BUG] Past Event included! ' + event.summary + ' @ ' + d.toISOString());
                             } else {
                                  // console.log('[OK] Future Event: ' + event.summary + ' @ ' + d.toISOString());
                             }
                        });
                    }
                } else {
                    const start = new Date(event.start);
                    // Single event logic: if start >= nowShifted
                    if (start >= nowShifted) {
                        const isPast = start < midnightJSTAbsolute;
                        if (isPast) {
                             console.log('[BUG] Past Single Event included! ' + event.summary + ' @ ' + start.toISOString());
                             console.log('  Reason: ' + start.toISOString() + ' >= ' + nowShifted.toISOString());
                        }
                    }
                }
            }
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

debugSchedule();
