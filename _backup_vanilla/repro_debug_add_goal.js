const { chromium } = require('playwright');

(async () => {
    console.log('Starting browser...');
    const browser = await chromium.launch({ headless: true });
    const context = await browser.newContext();
    const page = await context.newPage();

    page.on('console', msg => console.log('PAGE LOG:', msg.text()));

    try {
        console.log('Navigating to app...');
        await page.goto('https://soccer-tracker-6288c.web.app');
        await page.waitForTimeout(3000);

        // Inject dummy match and ensure players exist
        await page.evaluate(() => {
            // Ensure we have players in master
            if (window.Store.state.playerMaster.length === 0) {
                window.Store.state.playerMaster.push(
                    { id: 'p1', name: 'DebugPlayer1', number: 10 },
                    { id: 'p2', name: 'DebugPlayer2', number: 11 }
                );
            }

            const dummy = {
                id: 'debug_match_v31',
                date: new Date().toLocaleDateString(),
                opponent: 'Debug Opponent',
                matchTime: 10,
                scoreMyself: 0,
                scoreOpponent: 0,
                players: [], // Intentional empty to test fallback
                events: []
            };

            window.Store.state.matches.push(dummy);
            window.Store.save();
            window.app.ui.renderHome();
        });

        console.log('Opening Match Detail...');
        await page.evaluate(() => {
            window.app.ui.openMatchDetail('debug_match_v31');
        });
        await page.waitForTimeout(1000);

        console.log('Clicking Add Goal...');
        await page.click('button:has-text("+ 得点追加")');
        await page.waitForTimeout(1000);

        // Debug State inside UI
        const debugState = await page.evaluate(() => {
            return {
                tempTargetMatchId: window.app.ui.tempTargetMatchId,
                playerMasterLength: window.Store.state.playerMaster.length,
                matchDetailHidden: document.getElementById('match-detail-modal').classList.contains('hidden'),
                playerModalHidden: document.getElementById('player-select-modal').classList.contains('hidden')
            };
        });
        console.log('Debug State after opening Add Goal:', debugState);

        // Content of player list
        const modalHTML = await page.innerHTML('#modal-player-list');
        console.log('Modal HTML:', modalHTML.substring(0, 500) + '...'); // Truncate

        // Click Scorer
        if (modalHTML.includes('DebugPlayer1') || modalHTML.includes('TestPlayer')) {
            console.log('Player found. Selecting...');
            await page.click('#modal-player-list button:not(:has-text("OG/不明"))'); // Click first player
        } else {
            console.log('Player NOT found. Selecting OG...');
            await page.click('#modal-player-list button:has-text("OG/不明")');
        }
        await page.waitForTimeout(500);

        // Select Assist (None)
        console.log('Selecting Assist (None)...');
        await page.click('#modal-assist-list button:has-text("なし")');
        await page.waitForTimeout(500);

        // Final Check
        const finalState = await page.evaluate(() => {
            return {
                matchDetailHidden: document.getElementById('match-detail-modal').classList.contains('hidden'),
                playerModalHidden: document.getElementById('player-select-modal').classList.contains('hidden'),
                score: document.getElementById('detail-score-myself').textContent
            };
        });
        console.log('Final State:', finalState);

        if (!finalState.matchDetailHidden && finalState.playerModalHidden && finalState.score === '1') {
            console.log('SUCCESS: Flow working as expected.');
        } else {
            console.log('FAILURE: Flow incorrect.');
        }

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await browser.close();
    }
})();
