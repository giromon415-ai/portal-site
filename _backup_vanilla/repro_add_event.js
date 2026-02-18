const { chromium } = require('playwright');

(async () => {
    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

    try {
        console.log('Navigating to app...');
        await page.goto('https://soccer-tracker-6288c.web.app');
        await page.waitForTimeout(2000);

        // Inject dummy match
        await page.evaluate(() => {
            const dummy = {
                id: 'history_edit_test',
                date: new Date().toLocaleDateString(),
                opponent: 'History Test',
                matchTime: 10,
                scoreMyself: 0,
                scoreOpponent: 0,
                players: ['p1'], // We need a player for goal
                events: []
            };
            // Ensure player exists
            const player = { id: 'p1', name: 'TestPlayer', number: 10 };
            if (window.Store) {
                const existingP = window.Store.state.playerMaster.find(p => p.id === 'p1');
                if (!existingP) window.Store.state.playerMaster.push(player);

                window.Store.state.matches.push(dummy);
                window.Store.save(); // Does this persist correctly? LocalStore vs Firestore
                // Store.save() saves to 'soccer-tracker-temp-active'. 
                // History matches are in 'Store.state.matches'. 
                // FirestoreStore init loads from firestore. 
                // If we inject into state, it should be there for the session.
                window.app.ui.renderHome();
            }
        });

        console.log('Opening Match Detail...');
        await page.evaluate(() => {
            window.app.ui.openMatchDetail('history_edit_test');
        });
        await page.waitForTimeout(1000);

        // Test Add Loss
        console.log('Clicking Add Loss...');
        // We need to mock confirm
        await page.evaluate(() => {
            window.confirm = () => true;
        });
        await page.click('button:has-text("+ 失点追加")');
        await page.waitForTimeout(1000);

        // Verify Score
        let oppScore = await page.textContent('#detail-score-opponent');
        console.log('Opponent Score after Loss:', oppScore);
        if (oppScore === '1') console.log('SUCCESS: Loss added.');
        else console.log('FAILURE: Loss not added.');

        // Test Add Goal
        console.log('Clicking Add Goal...');
        await page.click('button:has-text("+ 得点追加")');
        await page.waitForTimeout(1000);

        // Debug Modal Content
        const modalHTML = await page.innerHTML('#modal-player-list');
        console.log('Modal Player List HTML length:', modalHTML.length);
        // console.log('Modal HTML:', modalHTML); // Too verbose?
        const editingId = await page.evaluate(() => window.app.ui.editingMatchId);
        console.log('UI.editingMatchId:', editingId);

        // Check if TestPlayer is in HTML
        if (modalHTML.includes('TestPlayer')) {
            console.log('TestPlayer found in modal.');
            // Click Scorer
            await page.click('#modal-player-list button:has-text("TestPlayer")');
        } else {
            console.log('FAILURE: TestPlayer NOT found in modal.');
            console.log('Modal HTML:', modalHTML);
            throw new Error('TestPlayer not found');
        }

        await page.waitForTimeout(500);

        // Select Assist (None)
        console.log('Selecting Assist (None)...');
        await page.click('#modal-assist-list button:has-text("なし")');
        await page.waitForTimeout(500);

        // Verify Score
        let myScore = await page.textContent('#detail-score-myself');
        console.log('My Score after Goal:', myScore);
        if (myScore === '1') console.log('SUCCESS: Goal added.');
        else console.log('FAILURE: Goal not added.');

        // Verify Event List
        const listContent = await page.innerHTML('#match-detail-events');
        if (listContent.includes('Goal!') && listContent.includes('失点')) {
            console.log('SUCCESS: Both events present in list.');
        } else {
            console.log('FAILURE: Events missing from list.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
