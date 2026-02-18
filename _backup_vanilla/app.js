/**
 * Soccer Tracker App Logic - Full Cloud Import Version
 */

// ALERT DEBUG
// Global Error Handler kept for safety
window.onerror = function (msg, url, line, col, error) {
    // console.error('Global Error: ' + msg); // Silent log for now
    return false;
};
// alert('App Source Loaded v12 - Starting');

// ---------------------------------------------------------
// 1. Store Adapters
// ---------------------------------------------------------

const LocalStore = {
    KEY: 'soccer-tracker-data',
    state: {
        playerMaster: [],
        matches: [],
        settings: {
            defaultDuration: 20,
            myTeamName: 'MY TEAM'
        },
        currentMatch: null
    },

    init() {
        const saved = localStorage.getItem(this.KEY);
        if (saved) {
            const data = JSON.parse(saved);
            this.state.playerMaster = data.playerMaster || [];
            this.state.matches = data.matches || [];
            this.state.settings = { ...this.state.settings, ...(data.settings || {}) };
            if (data.currentMatch) {
                this.state.currentMatch = data.currentMatch;
            }
        }
    },
    // Minimal fallback implementation
    save() { localStorage.setItem(this.KEY, JSON.stringify(this.state)); },
    addPlayer(name, number) { return null; },
    removePlayer(id) { },
    setSetting(key, value) { },
    getPlayerName(id) {
        const p = this.state.playerMaster.find(x => x.id === id);
        return p ? p.name : 'Unknown';
    },
    getSetting(key) { return this.state.settings[key]; }
};

const FirestoreStore = {
    state: {
        playerMaster: [],
        matches: [],
        settings: {
            defaultDuration: 20,
            myTeamName: 'MY TEAM'
        },
        currentMatch: null
    },

    init() {
        const db = firebase.firestore();

        // Requirement 1: Offline Persistence
        db.enablePersistence()
            .catch(err => {
                if (err.code == 'failed-precondition') {
                    console.warn('Persistence failed: Multiple tabs open');
                } else if (err.code == 'unimplemented') {
                    console.warn('Persistence failed: Browser not supported');
                }
            });

        // 1. Matches Collection (Optimized: Limit 50)
        db.collection('matches')
            .orderBy('id', 'desc')
            .limit(50)
            .onSnapshot(snapshot => {
                const matches = [];
                snapshot.forEach(doc => {
                    matches.push(doc.data());
                });

                this.state.matches = matches;

                // Auto-jump to latest match date if not set or default
                if (matches.length > 0) {
                    const lastDateStr = matches[0].date;
                    const d = new Date(lastDateStr);
                    if (!isNaN(d.getTime())) {
                        if (window.app && app.ui) {
                            app.ui.targetDate = d;
                            app.ui.renderHome();
                        }
                    }
                } else {
                    if (window.app && app.ui) app.ui.renderHome();
                }
            }, error => {
                console.error('Matches Sync Error: ' + error.message);
            });

        // 2. Players Collection
        db.collection('players').onSnapshot(snapshot => {
            const players = [];
            snapshot.forEach(doc => {
                players.push(doc.data());
            });
            this.state.playerMaster = players;

            // Re-render ALL views that depend on names
            if (window.app && app.ui) {
                app.ui.renderSettings();
                app.ui.renderHome(); // Fix: Update names in match list
                if (app.router.currentRoute === 'active-match') app.ui.updateMatchInfo();
            }

            const countEl = document.getElementById('player-count');
            if (countEl) countEl.textContent = players.length + '人';
        }, error => {
            console.error('Players Sync Error: ' + error.message);
        });

        // 3. Settings Collection
        db.collection('settings').doc('current').onSnapshot(doc => {
            if (doc.exists) {
                this.state.settings = { ...this.state.settings, ...doc.data() };
                // Fix: Update team name in headers and views
                if (window.app && app.ui) {
                    const myTeam = this.state.settings.myTeamName || 'MY TEAM';
                    const myTeamEl = document.getElementById('score-myself-name');
                    if (myTeamEl) myTeamEl.textContent = myTeam;
                    app.ui.renderHome();
                    app.ui.renderSettings();
                }
            }
        });

        // Current Match (Local Temp)
        const saved = localStorage.getItem('soccer-tracker-temp-active');
        if (saved) {
            this.state.currentMatch = JSON.parse(saved);
        }
    },

    save() {
        if (this.state.currentMatch) {
            localStorage.setItem('soccer-tracker-temp-active', JSON.stringify(this.state.currentMatch));
        } else {
            localStorage.removeItem('soccer-tracker-temp-active');
        }
    },

    addPlayer(name, number) {
        if (!app.auth.user) {
            alert('選手登録にはログインが必要です');
            return;
        }
        const id = 'p_' + Date.now();
        const player = { id, name, number };
        firebase.firestore().collection('players').doc(id).set(player);
        return id;
    },

    removePlayer(id) {
        if (!app.auth.user) return;
        firebase.firestore().collection('players').doc(id).delete();
    },

    setSetting(key, value) {
        if (!app.auth.user) return;
        this.state.settings[key] = value;
        firebase.firestore().collection('settings').doc('current').set(this.state.settings, { merge: true });
    },

    getPlayerName(id) {
        if (id === 'OG') return 'OG/不明';
        const p = this.state.playerMaster.find(x => x.id === id);
        return p ? p.name : 'Unknown';
    },

    getSetting(key) {
        return this.state.settings[key];
    },

    // Migration helper proxy
    migrateToCloud() {
        return LocalStore.migrateToCloud(); // Not used in this version
    },

    // Add match to cloud
    addMatch(match) {
        if (!app.auth.user) {
            alert('保存にはログインが必要です');
            return;
        }
        firebase.firestore().collection('matches').doc(match.id).set(match)
            .then(() => {
                console.log('Match saved');
            })
            .catch(err => {
                console.error(err);
                alert('保存に失敗しました: ' + err.message);
            });
    },

    // ------------------------------------------------------------------
    // NEW: Import Feature
    // ------------------------------------------------------------------
    async importData(jsonContent) {
        if (!app.auth.user) {
            alert('データのインポートにはログインが必要です。');
            return;
        }

        if (!confirm('既存のデータを上書き・追加しますか？')) return;

        try {
            const data = JSON.parse(jsonContent);
            const db = firebase.firestore();
            const batch = db.batch();
            let count = 0;

            console.log('Starting Import...', data);

            // 1. Players
            if (Array.isArray(data.playerMaster)) {
                data.playerMaster.forEach(p => {
                    const ref = db.collection('players').doc(p.id);
                    batch.set(ref, p);
                    count++;
                });
            }

            // 2. Matches
            if (Array.isArray(data.matches)) {
                data.matches.forEach(m => {
                    const ref = db.collection('matches').doc(m.id);
                    batch.set(ref, m);
                    count++;
                });
            }

            // 3. Settings
            if (data.settings) {
                const ref = db.collection('settings').doc('current');
                batch.set(ref, data.settings);
                count++;
            }

            // Commit
            await batch.commit();
            alert(`インポート完了: ${count} 件のデータを保存しました。`);
        } catch (e) {
            console.error(e);
            alert('インポート失敗: ' + e.message);
        }
    }
};

// Default Store
let Store = FirestoreStore;


// ---------------------------------------------------------
// 2. Auth Logic
// ---------------------------------------------------------
const AuthLogic = {
    user: null,

    init() {
        firebase.auth().onAuthStateChanged(user => {
            this.user = user;
            this.updateUI();
        });

        // Handle redirect result (critical for mobile)
        firebase.auth().getRedirectResult().then(result => {
            if (result.user) {
                this.user = result.user;
                this.updateUI();
            }
        }).catch(error => {
            console.error('Redirect Error:', error);
        });
    },

    login() {
        // Use Popup for robustness on Mobile Chrome
        firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL)
            .then(() => {
                const provider = new firebase.auth.GoogleAuthProvider();
                return firebase.auth().signInWithPopup(provider);
            })
            .then((result) => {
                this.user = result.user;
                this.updateUI();
                alert('ログインしました');
            })
            .catch(e => {
                alert('Login Error: ' + e.message);
                console.error(e);
            });
    },

    logout() {
        firebase.auth().signOut();
    },

    updateUI() {
        // Find buttons by likely IDs (will verify in HTML later)
        const loginBtn = document.getElementById('btn-login');
        const logoutBtn = document.getElementById('btn-logout');

        // Import area visibility
        const importArea = document.getElementById('import-area');

        if (this.user) {
            if (loginBtn) loginBtn.classList.add('hidden');
            if (logoutBtn) logoutBtn.classList.remove('hidden');
            if (importArea) importArea.classList.remove('hidden');
        } else {
            if (loginBtn) loginBtn.classList.remove('hidden');
            if (logoutBtn) logoutBtn.classList.add('hidden');
            if (importArea) importArea.classList.add('hidden');
        }
    }
};


// ---------------------------------------------------------
// 3. Router
// ---------------------------------------------------------
const Router = {
    routes: ['home', 'settings', 'new-match', 'active-match', 'result', 'stats'],
    currentRoute: 'home',

    init() {
        window.onpopstate = () => this.handlePopState();

        // Update global UI elements
        const myTeam = Store.getSetting('myTeamName') || 'MY TEAM';
        const myTeamEl = document.getElementById('score-myself-name');
        if (myTeamEl) myTeamEl.textContent = myTeam;

        // Resume match if exists
        if (Store.state.currentMatch && !Store.state.currentMatch.isFinished) {
            MatchLogic.resume();
            this.go('active-match', false);
        } else {
            this.go('home');
        }
    },

    handlePopState() {
        // Simple hash routing fallback if needed
    },

    go(route, pushHistory = true) {
        this.currentRoute = route;
        // Hide all views
        document.querySelectorAll('.view-section').forEach(el => el.classList.add('hidden'));

        // Show target view
        const target = document.getElementById(`view-${route}`);
        if (target) {
            target.classList.remove('hidden');
            window.scrollTo(0, 0);
        }

        // FAB visibility
        const fab = document.getElementById('fab-new-match');
        if (fab) {
            if (route === 'home') {
                fab.style.display = 'flex';
            } else {
                fab.style.display = 'none';
            }
        }

        // Specific hooks
        if (route === 'home') UI.renderHome();
        if (route === 'settings') UI.renderSettings();
        if (route === 'new-match') UI.renderNewMatch();
        if (route === 'active-match') UI.updateMatchInfo();
        if (route === 'stats') if (UI.renderStats) UI.renderStats();
    }
};


// ---------------------------------------------------------
// 4. UI
// ---------------------------------------------------------
const UI = {
    targetDate: new Date(), // Default today

    changeDate(offset) {
        if (offset === 0) {
            // From Input
            const val = document.getElementById('dashboard-date').value;
            if (val) this.targetDate = new Date(val);
        } else {
            // Increment/Decrement
            this.targetDate.setDate(this.targetDate.getDate() + offset);
        }
        this.renderHome();
    },

    renderHome() {
        // Set date input value (YYYY-MM-DD for input type="date")
        const y = this.targetDate.getFullYear();
        const m = String(this.targetDate.getMonth() + 1).padStart(2, '0');
        const d = String(this.targetDate.getDate()).padStart(2, '0');
        const dateStr = `${y}-${m}-${d}`;

        const dateInput = document.getElementById('dashboard-date');
        if (dateInput) dateInput.value = dateStr;

        const list = document.getElementById('match-list');
        if (!list) return;

        list.innerHTML = '';

        // Filter matches
        // Problem: m.date format is locale-dependent strings (e.g. "2024/2/13").
        // We need to compare loosely or normalize.
        const targetLocaleStr = this.targetDate.toLocaleDateString();

        // Also try YYYY/MM/DD and YYYY-MM-DD for robustness check
        // Or better: check if Date objects match (Year/Month/Day)

        const matches = Store.state.matches.filter(m => {
            if (m.date === targetLocaleStr) return true;

            // Fallback: parse match date and compare components
            const md = new Date(m.date);
            if (!isNaN(md.getTime())) {
                return md.getFullYear() === this.targetDate.getFullYear() &&
                    md.getMonth() === this.targetDate.getMonth() &&
                    md.getDate() === this.targetDate.getDate();
            }
            return false;
        });

        if (matches.length === 0) {
            // Friendly debug if collection is not empty
            if (Store.state.matches.length > 0) {
                list.innerHTML = `<div class="text-center text-gray-500 py-4">
                    この日 (${targetLocaleStr}) の試合はありません。<br>
                    <span class="text-xs">総記録数: ${Store.state.matches.length}件</span>
                </div>`;
            } else {
                list.innerHTML = '<div class="text-center text-gray-400 py-8">記録された試合はありません</div>';
            }
            return;
        }

        matches.forEach(m => {
            const el = document.createElement('div');
            el.className = "bg-white p-4 rounded-lg shadow mb-4 cursor-pointer hover:shadow-md";
            el.onclick = () => {
                this.openMatchDetail(m.id);
            };
            el.innerHTML = `
                <div class="flex justify-between items-center mb-2">
                    <span class="text-sm font-bold text-gray-600">${m.label || '試合'}</span>
                    <span class="text-xs text-gray-400">${m.durationMinutes}分</span>
                </div>
                <div class="flex justify-between items-center text-xl font-bold">
                    <span class="text-blue-600">${Store.getSetting('myTeamName')}</span>
                    <span class="bg-gray-100 px-3 py-1 rounded">${m.scoreMyself} - ${m.scoreOpponent}</span>
                    <span class="text-red-600">${m.opponent}</span>
                </div>
            `;
            list.appendChild(el);
        });
    },

    renderSettings() {
        // Settings Form
        const durEl = document.getElementById('setting-default-duration');
        if (durEl) durEl.value = Store.getSetting('defaultDuration');

        const teamEl = document.getElementById('setting-my-team-name');
        if (teamEl) teamEl.value = Store.getSetting('myTeamName');

        // Player List
        const pList = document.getElementById('player-master-list');
        if (!pList) return;
        pList.innerHTML = '';
        Store.state.playerMaster.forEach(p => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center bg-gray-50 p-2 rounded";
            div.innerHTML = `
                <span>${p.number}. ${p.name}</span>
                <button class="text-red-500 text-sm" onclick="Store.removePlayer('${p.id}')">削除</button>
             `;
            pList.appendChild(div);
        });
    },

    renderNewMatch() {
        const container = document.getElementById('match-player-selection');
        if (!container) return;
        container.innerHTML = '';

        Store.state.playerMaster.forEach(p => {
            const label = document.createElement('label');
            label.className = "flex items-center space-x-2 bg-gray-50 p-2 rounded";
            label.innerHTML = `
                <input type="checkbox" name="match-players" value="${p.id}" checked class="w-4 h-4">
                <span>${p.number}. ${p.name}</span>
             `;
            container.appendChild(label);
        });

        // Defaults
        const durEl = document.getElementById('match-duration');
        if (durEl) durEl.value = Store.getSetting('defaultDuration');
    },

    updateMatchInfo() {
        const match = Store.state.currentMatch;
        if (!match) return;

        // Top Info
        const oppEl = document.getElementById('active-opponent-name');
        if (oppEl) oppEl.textContent = match.opponent;

        // Event List
        this.renderEventList(match.id, 'active-event-list');
    },

    renderEventList(matchId, containerId = 'match-detail-events') {
        const match = (Store.state.currentMatch && Store.state.currentMatch.id === matchId)
            ? Store.state.currentMatch
            : Store.state.matches.find(m => m.id === matchId);

        if (!match) return;

        const list = document.getElementById(containerId);
        if (!list) return;

        list.innerHTML = '';
        match.events.forEach((e, idx) => {
            const div = document.createElement('div');
            div.className = "flex justify-between items-center border-b py-2 text-sm";

            let content = '';
            let actions = '';

            if (e.type === 'goal') {
                content = `<span class="font-bold text-blue-600">${e.time} Goal!</span> 
                            <span class="ml-2">${Store.getPlayerName(e.playerId)}</span>
                            ${e.assistId ? `<span class="text-xs text-gray-500 ml-1">(As: ${Store.getPlayerName(e.assistId)})</span>` : ''}`;
            } else if (e.type === 'opponent_goal') {
                content = `<span class="font-bold text-red-600">${e.time} 失点</span>`;
            }

            actions = `<button onclick="MatchLogic.deleteEvent('${matchId}', ${idx})" class="text-red-400 ml-2">×</button>`;

            div.innerHTML = `<div>${content}</div><div>${actions}</div>`;
            list.appendChild(div);
        });
    },

    openGoalModal(matchId = null) {
        const modal = document.getElementById('player-select-modal');
        if (modal) modal.classList.remove('hidden');

        // Context override
        let targetMatch = Store.state.currentMatch;
        this.tempTargetMatchId = null;
        if (matchId) {
            targetMatch = Store.state.matches.find(m => m.id === matchId);
            this.tempTargetMatchId = matchId;
        }

        if (!targetMatch) {
            console.error('Target match not found for ID:', matchId);
            return;
        }

        // Reset State
        document.getElementById('modal-player-list').classList.remove('hidden');
        document.getElementById('modal-assist-list').classList.add('hidden');
        document.querySelector('#player-select-modal h3').textContent = '得点者は？';

        // Render Scorers
        const pList = document.getElementById('modal-player-list');
        if (!pList) return;
        pList.innerHTML = '';

        // Add "Own Goal" or "Unknown" 
        const ogBtn = document.createElement('button');
        ogBtn.className = "bg-gray-300 p-2 rounded text-sm font-bold truncate h-16 flex flex-col items-center justify-center hover:bg-gray-400 active:bg-gray-500";
        ogBtn.innerHTML = `<span class="text-xs text-gray-700">--</span><span>OG/不明</span>`;
        ogBtn.onclick = () => this.selectScorer('OG');
        pList.appendChild(ogBtn);

        // Add players
        // If match players list is empty/undefined, maybe show all master players? 
        // Or user needs to add players to match first?
        // Let's fallback to master if empty for robustness in editing old matches
        let playerIds = targetMatch.players || [];
        if (playerIds.length === 0) {
            // Fallback: use all players from master
            playerIds = Store.state.playerMaster.map(p => p.id);
        }

        if (playerIds.length === 0) {
            const msg = document.createElement('div');
            msg.className = "col-span-3 text-center text-red-500 font-bold p-4";
            msg.innerHTML = "選手データがありません。<br>設定画面で選手を登録してください。";
            pList.appendChild(msg);
        }

        playerIds.forEach(pid => {
            const p = Store.state.playerMaster.find(pm => pm.id === pid);
            const name = p ? p.name : 'Unknown';
            const num = p ? p.number : '?';

            const btn = document.createElement('button');
            btn.className = "bg-blue-100 p-2 rounded text-sm font-bold truncate h-16 flex flex-col items-center justify-center hover:bg-blue-200 active:bg-blue-300";
            btn.innerHTML = `<span class="text-xs text-gray-500">#${num}</span><span>${name}</span>`;
            btn.onclick = () => this.selectScorer(pid);
            pList.appendChild(btn);
        });
    },

    selectScorer(pid) {
        this.tempScorer = pid;

        // Show Assist Selection
        document.getElementById('modal-player-list').classList.add('hidden');
        document.getElementById('modal-assist-list').classList.remove('hidden');
        document.querySelector('#player-select-modal h3').textContent = 'アシストは？';

        const aList = document.getElementById('modal-assist-list');
        if (!aList) return;
        aList.innerHTML = '';

        // Context
        let targetMatch = Store.state.currentMatch;
        if (this.tempTargetMatchId) {
            targetMatch = Store.state.matches.find(m => m.id === this.tempTargetMatchId);
        }

        // "None" option
        const noneBtn = document.createElement('button');
        noneBtn.className = "bg-gray-200 p-2 rounded text-sm font-bold h-16 hover:bg-gray-300";
        noneBtn.textContent = 'なし';
        noneBtn.onclick = () => this.selectAssist(null);
        aList.appendChild(noneBtn);

        // Players (exclude scorer?)
        if (targetMatch && targetMatch.players) {
            targetMatch.players.forEach(pid => {
                if (pid === this.tempScorer) return; // Self assist unlikely

                const p = Store.state.playerMaster.find(pm => pm.id === pid);
                const name = p ? p.name : 'Unknown';
                const num = p ? p.number : '?';

                const btn = document.createElement('button');
                btn.className = "bg-green-100 p-2 rounded text-sm font-bold truncate h-16 flex flex-col items-center justify-center hover:bg-green-200 active:bg-green-300";
                btn.innerHTML = `<span class="text-xs text-gray-500">#${num}</span><span>${name}</span>`;
                btn.onclick = () => this.selectAssist(pid);
                aList.appendChild(btn);
            });
        }
    },

    selectAssist(aid) {
        MatchLogic.confirmGoal(this.tempScorer, aid, this.tempTargetMatchId);
    },

    closeModal(keepDetail = false) {
        console.log('Debug: closeModal called, keepDetail:', keepDetail);
        // Explicitly close the player select modal
        const modal = document.getElementById('player-select-modal');
        if (modal) modal.classList.add('hidden');

        // Only close other modals if we are NOT in history edit mode
        if (!keepDetail && !this.tempTargetMatchId) {
            document.querySelectorAll('[id$="-modal"]').forEach(el => el.classList.add('hidden'));
        }

        this.tempScorer = null;
        this.tempTargetMatchId = null;
    },



    openMatchDetail(id) {
        this.editingMatchId = id;
        const match = Store.state.matches.find(m => m.id === id);
        if (!match) return;

        const modal = document.getElementById('match-detail-modal');
        if (modal) modal.classList.remove('hidden');

        const idEl = document.getElementById('edit-match-id');
        if (idEl) idEl.value = match.id;

        const opEl = document.getElementById('edit-match-opponent');
        if (opEl) opEl.value = match.opponent;

        const lbEl = document.getElementById('edit-match-label');
        if (lbEl) lbEl.value = match.label || '';

        const sMy = document.getElementById('detail-score-myself');
        if (sMy) sMy.textContent = match.scoreMyself;

        const sOp = document.getElementById('detail-score-opponent');
        if (sOp) sOp.textContent = match.scoreOpponent;

        this.renderEventList(match.id, 'match-detail-events');
    },

    setupEventListeners() {
        // Add Player Form
        const addPlayerForm = document.getElementById('add-player-form');
        if (addPlayerForm) {
            addPlayerForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const nameInput = document.getElementById('new-player-name');
                const numInput = document.getElementById('new-player-number');
                if (nameInput.value && numInput.value) {
                    Store.addPlayer(nameInput.value, numInput.value);
                    nameInput.value = '';
                    numInput.value = '';
                    nameInput.focus();
                    if (app.router.currentRoute === 'settings') this.renderSettings();
                }
            });
        }

        // Settings Change
        const durationSetting = document.getElementById('setting-default-duration');
        if (durationSetting) {
            durationSetting.addEventListener('change', (e) => {
                Store.setSetting('defaultDuration', parseInt(e.target.value));
            });
        }

        const teamSetting = document.getElementById('setting-my-team-name');
        if (teamSetting) {
            teamSetting.addEventListener('change', (e) => {
                Store.setSetting('myTeamName', e.target.value);
            });
        }

        // New Match Form
        const newMatchForm = document.getElementById('new-match-form');
        if (newMatchForm) {
            newMatchForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const opponent = document.getElementById('match-opponent').value;
                const label = document.getElementById('match-label').value;
                const duration = parseInt(document.getElementById('match-duration').value);

                const checkboxes = document.querySelectorAll('input[name="match-players"]:checked');
                const players = Array.from(checkboxes).map(cb => cb.value);

                if (!opponent) return;

                Store.setSetting('defaultDuration', duration);

                MatchLogic.start({
                    opponent,
                    label,
                    duration,
                    players
                });
            });
        }
    },

    // Manual File Import Trigger
    handleFileSelect(input) {
        const file = input.files[0];
        if (!file) return;

        console.log('File selected:', file.name);

        const reader = new FileReader();
        reader.onload = (e) => {
            console.log('File read, sending to Store...');
            Store.importData(e.target.result);
        };
        reader.readAsText(file);
    },

    // Stats Render
    renderStats() {
        // Defaults dates if empty
        const startEl = document.getElementById('stats-start-date');
        const endEl = document.getElementById('stats-end-date');

        if (startEl && !startEl.value) {
            // First day of current month
            const date = new Date();
            date.setDate(1);
            startEl.value = date.toISOString().split('T')[0];
        }
        if (endEl && !endEl.value) {
            // Today
            endEl.value = new Date().toISOString().split('T')[0];
        }
    }
};


// ---------------------------------------------------------
// 5. Stats Logic
// ---------------------------------------------------------
const StatsLogic = {
    calculate() {
        const startStr = document.getElementById('stats-start-date').value;
        const endStr = document.getElementById('stats-end-date').value;

        if (!startStr || !endStr) {
            alert('期間を指定してください');
            return;
        }

        const startDate = new Date(startStr);
        const endDate = new Date(endStr);
        // End date should include the full day
        endDate.setHours(23, 59, 59, 999);

        // Filter Matches
        const targetMatches = Store.state.matches.filter(m => {
            const d = new Date(m.date);
            return d >= startDate && d <= endDate;
        });

        // Aggregate
        const totalGoals = targetMatches.reduce((sum, m) => sum + (parseInt(m.scoreMyself) || 0), 0);

        const playerStats = {}; // { id: { name, goals, assists } }

        // Initialize with all known players (optional, but good for zero-stats)
        Store.state.playerMaster.forEach(p => {
            playerStats[p.id] = { name: p.name, number: p.number, goals: 0, assists: 0 };
        });

        targetMatches.forEach(m => {
            if (Array.isArray(m.events)) {
                m.events.forEach(e => {
                    if (e.type === 'goal') {
                        // Scorer
                        if (e.playerId && playerStats[e.playerId]) {
                            playerStats[e.playerId].goals++;
                        }
                        // Assist
                        if (e.assistId && playerStats[e.assistId]) {
                            playerStats[e.assistId].assists++;
                        }
                    }
                });
            }
        });

        // Convert to array and sort
        const result = Object.values(playerStats).filter(p => p.goals > 0 || p.assists > 0);

        // Sort: Goals desc, then Assists desc
        result.sort((a, b) => {
            if (b.goals !== a.goals) return b.goals - a.goals;
            return b.assists - a.assists;
        });

        this.renderResult(result, targetMatches.length, totalGoals);
    },

    renderResult(data, matchCount, totalGoals) {
        document.getElementById('stats-result-container').classList.remove('hidden');
        document.getElementById('stats-match-count').textContent = matchCount;
        document.getElementById('stats-total-goals').textContent = totalGoals;

        const tbody = document.getElementById('stats-table-body');
        tbody.innerHTML = '';

        data.forEach(p => {
            const tr = document.createElement('tr');
            tr.className = "bg-white border-b hover:bg-gray-50";
            tr.innerHTML = `
                <td class="px-2 py-2 text-center text-gray-400 font-mono text-xs">#${p.number}</td>
                <td class="px-2 py-2 font-bold text-gray-800">${p.name}</td>
                <td class="px-2 py-2 text-right font-bold text-blue-600">${p.goals}</td>
                <td class="px-2 py-2 text-right text-gray-500">${p.assists}</td>
            `;
            tbody.appendChild(tr);
        });
    }
};
const MatchLogic = {
    timerInterval: null,

    start(config) {
        const now = Date.now();
        Store.state.currentMatch = {
            id: 'm_' + now,
            date: new Date().toLocaleDateString(),
            opponent: config.opponent,
            label: config.label,
            durationMinutes: config.duration,
            players: config.players, // IDs
            scoreMyself: 0,
            scoreOpponent: 0,
            events: [],

            // Timer state
            startTime: now,
            accumulatedMs: 0,
            lastResumeTime: now,
            isRunning: true,
            isFinished: false
        };
        Store.save();
        this.startTimerLoop();
        Router.go('active-match');
        UI.updateMatchInfo();
        // Clear active event list from potential previous
        const list = document.getElementById('active-event-list');
        if (list) list.innerHTML = '';
    },

    resume() {
        if (!Store.state.currentMatch.isFinished) {
            this.startTimerLoop();
            UI.updateMatchInfo();
        }
    },

    startTimerLoop() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = setInterval(() => {
            this.tick();
        }, 1000);
        this.tick(); // Immediate update
    },

    stopTimerLoop() {
        if (this.timerInterval) clearInterval(this.timerInterval);
        this.timerInterval = null;
    },

    toggleTimer() {
        const match = Store.state.currentMatch;
        if (!match || match.isFinished) return;

        const now = Date.now();

        if (match.isRunning) {
            // Stop
            match.accumulatedMs += (now - match.lastResumeTime);
            match.lastResumeTime = null;
            match.isRunning = false;
        } else {
            // Resume
            match.lastResumeTime = now;
            match.isRunning = true;
        }
        Store.save();
        this.tick();
    },

    tick() {
        const match = Store.state.currentMatch;
        if (!match) return;

        let currentMs = match.accumulatedMs;
        if (match.isRunning && match.lastResumeTime) {
            currentMs += (Date.now() - match.lastResumeTime);
        }

        const totalSeconds = Math.floor(currentMs / 1000);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;

        // Update DOM directly for performance
        const timerEl = document.getElementById('active-timer');
        if (timerEl) {
            timerEl.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
            if (!match.isRunning) {
                timerEl.classList.add('text-yellow-500');
            } else {
                timerEl.classList.remove('text-yellow-500');
            }
        }

        const btn = document.getElementById('btn-timer-toggle');
        if (btn) {
            btn.textContent = match.isRunning ? 'STOP' : 'START';
            btn.className = match.isRunning
                ? 'flex-1 py-4 bg-yellow-500 text-white font-bold rounded-lg shadow active:bg-yellow-600 text-lg'
                : 'flex-1 py-4 bg-green-500 text-white font-bold rounded-lg shadow active:bg-green-600 text-lg';
        }

        // Score
        const myScoreEl = document.getElementById('score-myself');
        if (myScoreEl) myScoreEl.textContent = match.scoreMyself;

        const oppScoreEl = document.getElementById('score-opponent');
        if (oppScoreEl) oppScoreEl.textContent = match.scoreOpponent;
    },

    getFormattedTime() {
        const timerEl = document.getElementById('active-timer');
        return timerEl ? timerEl.textContent : '00:00';
    },

    recordGoal(team) {
        if (team === 'opponent') {
            Store.state.currentMatch.scoreOpponent++;
            Store.state.currentMatch.events.push({
                type: 'opponent_goal',
                time: this.getFormattedTime()
            });
            Store.save();
            this.tick();
            UI.renderEventList(Store.state.currentMatch.id, 'active-event-list');
        } else {
            // Open modal for myself
            UI.openGoalModal();
        }
    },

    confirmGoal(playerId, assistId, targetMatchId = null) {
        if (targetMatchId) {
            // Add to history
            const match = Store.state.matches.find(m => m.id === targetMatchId);
            if (match) {
                match.scoreMyself++;
                match.events.push({
                    type: 'goal',
                    time: "Edit", // or "追記"
                    playerId: playerId,
                    assistId: assistId
                });
                // Save (Assuming FirestoreStore usage, addMatch upserts)
                Store.addMatch(match);

                // Refresh UI
                UI.renderEventList(targetMatchId, 'match-detail-events');
                const scoreEl = document.getElementById('detail-score-myself');
                if (scoreEl) scoreEl.textContent = match.scoreMyself;
            }
            // Keep Match Detail open
            UI.closeModal(true);
            return;
        }

        Store.state.currentMatch.scoreMyself++;
        Store.state.currentMatch.events.push({
            type: 'goal',
            time: this.getFormattedTime(),
            playerId: playerId,
            assistId: assistId
        });
        Store.save();
        this.tick();
        UI.closeModal();
        UI.renderEventList(Store.state.currentMatch.id, 'active-event-list');
    },

    prepareAddGoal() {
        if (!UI.editingMatchId) return;
        UI.openGoalModal(UI.editingMatchId);
    },

    addLossToHistory() {
        if (!UI.editingMatchId) return;
        if (!confirm('失点を追加しますか？')) return;

        const match = Store.state.matches.find(m => m.id === UI.editingMatchId);
        if (match) {
            match.scoreOpponent++;
            match.events.push({
                type: 'opponent_goal',
                time: "Edit"
            });
            Store.addMatch(match);

            // Refresh UI
            UI.renderEventList(UI.editingMatchId, 'match-detail-events');
            const scoreEl = document.getElementById('detail-score-opponent');
            if (scoreEl) scoreEl.textContent = match.scoreOpponent;
        }
    },

    getMatch(matchId) {
        if (Store.state.currentMatch && Store.state.currentMatch.id === matchId) {
            return Store.state.currentMatch;
        }
        return Store.state.matches.find(m => m.id === matchId);
    },

    finishMatch() {
        if (!confirm('試合を終了して記録を保存しますか？')) return;

        this.stopTimerLoop();
        const match = Store.state.currentMatch;
        match.isFinished = true;

        // Move to history
        Store.state.matches.push(match);
        // If Cloud Store, push to cloud
        if (Store.addMatch) {
            Store.addMatch(match);
        }

        Store.state.currentMatch = null;
        Store.save();

        Router.go('home');
    },

    deleteMatch() {
        const id = document.getElementById('edit-match-id').value;
        if (!id) return;
        if (!confirm('本当にこの試合記録を削除しますか？')) return;

        Store.state.matches = Store.state.matches.filter(m => m.id !== id);

        // Custom for Firestore:
        if (app.auth.user) {
            firebase.firestore().collection('matches').doc(id).delete();
        }

        document.getElementById('match-detail-modal').classList.add('hidden');
        UI.renderHome();
    },

    updateMatchMeta() {
        const id = document.getElementById('edit-match-id').value;
        const opponent = document.getElementById('edit-match-opponent').value;
        const label = document.getElementById('edit-match-label').value;

        if (!id) return;

        const match = Store.state.matches.find(m => m.id === id);
        if (match) {
            match.opponent = opponent;
            match.label = label;
            Store.save(); // Local
            // Cloud
            if (app.auth.user) firebase.firestore().collection('matches').doc(id).set(match, { merge: true });

            alert('更新しました');
            UI.renderHome(); // Refresh list match card
        }
    },

    deleteEvent(matchId, idx) {
        const match = this.getMatch(matchId);
        if (!match) return;

        if (!confirm('このイベントを削除しますか？ 得点も減算されます。')) return;

        const event = match.events[idx];

        // Adjust score
        if (event.type === 'goal') {
            match.scoreMyself = Math.max(0, match.scoreMyself - 1);
        } else if (event.type === 'opponent_goal') {
            match.scoreOpponent = Math.max(0, match.scoreOpponent - 1);
        }

        // Remove event
        match.events.splice(idx, 1);
        Store.save();

        // Cloud Sync
        if (app.auth.user && matchId.startsWith('m_')) { // Assuming IDs are consistently m_
            firebase.firestore().collection('matches').doc(matchId).set(match, { merge: true });
        }

        // UI Refresh dispatch
        if (Store.state.currentMatch && Store.state.currentMatch.id === matchId) {
            UI.renderEventList(matchId, 'active-event-list');
            UI.updateMatchInfo(); // Refresh score in active view
        } else {
            UI.renderEventList(matchId); // Default to modal
            UI.renderHome();
        }
    }
};

const ReportLogic = {
    currentTab: 'simple',

    openModal() {
        document.getElementById('report-modal').classList.remove('hidden');
        this.switchTab('simple');
    },

    switchTab(tab) {
        this.currentTab = tab;
        // UI Tabs
        ['simple', 'detail', 'csv'].forEach(t => {
            const el = document.getElementById('tab-' + t);
            if (el) {
                if (t === tab) {
                    el.classList.add('border-b-2', 'border-blue-600', 'text-blue-600');
                    el.classList.remove('text-gray-500');
                } else {
                    el.classList.remove('border-b-2', 'border-blue-600', 'text-blue-600');
                    el.classList.add('text-gray-500');
                }
            }
        });

        // Generate Content
        const content = this.generateContent(tab);
        document.getElementById('report-content').value = content;
    },

    generateContent(type) {
        const matches = Store.state.matches.filter(m => {
            // Filter by selected date in Home
            const d = new Date(m.date); // or use UI.targetDate logic
            const target = UI.targetDate;
            return d.getFullYear() === target.getFullYear() &&
                d.getMonth() === target.getMonth() &&
                d.getDate() === target.getDate();
        });

        if (matches.length === 0) return '該当する試合記録はありません。';

        matches.sort((a, b) => a.id.localeCompare(b.id)); // Oldest first

        if (type === 'simple') return this.generateSimple(matches);
        if (type === 'detail') return this.generateDetail(matches);
        if (type === 'csv') return this.generateCSV(matches);
        return '';
    },

    generateSimple(matches) {
        const dateStr = UI.targetDate.toLocaleDateString();
        let text = `【${dateStr} 試合結果】\n\n`;

        matches.sort((a, b) => a.id.localeCompare(b.id)); // Oldest first
        const processedIds = new Set();
        let totalGet = 0;
        let totalLost = 0;

        matches.forEach((m, index) => {
            if (processedIds.has(m.id)) return;

            let myScore = parseInt(m.scoreMyself) || 0;
            let oppScore = parseInt(m.scoreOpponent) || 0;

            // Check for Combination (前半 -> 後半)
            if (m.label === '前半') {
                const nextMatch = matches.slice(index + 1).find(nm =>
                    nm.opponent === m.opponent && nm.label === '後半' && !processedIds.has(nm.id)
                );

                if (nextMatch) {
                    processedIds.add(nextMatch.id);

                    // Combine Scores
                    const my2 = parseInt(nextMatch.scoreMyself) || 0;
                    const opp2 = parseInt(nextMatch.scoreOpponent) || 0;
                    const totalMy = myScore + my2;
                    const totalOpp = oppScore + opp2;

                    // Update Globals
                    totalGet += totalMy;
                    totalLost += totalOpp;

                    // Result Char
                    let res = '(分)';
                    if (totalMy > totalOpp) res = '(勝)';
                    if (totalMy < totalOpp) res = '(負)';

                    // Main Header Line (Combined)
                    text += `vs ${m.opponent} ${totalMy}-${totalOpp} ${res}\n`;

                    // Detail Lines
                    // First Half
                    const g1 = (m.events || []).filter(e => e.type === 'goal').map(g => Store.getPlayerName(g.playerId)).join(', ');
                    text += `  前半: ${myScore}-${oppScore} ${g1 ? '(' + g1 + ')' : ''}\n`;

                    // Second Half
                    const g2 = (nextMatch.events || []).filter(e => e.type === 'goal').map(g => Store.getPlayerName(g.playerId)).join(', ');
                    text += `  後半: ${my2}-${opp2} ${g2 ? '(' + g2 + ')' : ''}\n`;

                    text += '\n'; // Spacer
                    processedIds.add(m.id);
                    return; // Done with this combo
                }
            }

            // Normal Match (Not combined or no pair found)
            processedIds.add(m.id);
            totalGet += myScore;
            totalLost += oppScore;

            let res = '(分)';
            if (myScore > oppScore) res = '(勝)';
            if (myScore < oppScore) res = '(負)';

            text += `${m.label || '試合'} vs ${m.opponent} ${myScore}-${oppScore} ${res}\n`;

            // Scorers
            const goals = (m.events || []).filter(e => e.type === 'goal').map(g => Store.getPlayerName(g.playerId)).join(', ');
            if (goals) {
                text += `  得点: ${goals}\n`;
            }
            text += '\n';
        });

        text += `----------------\nTotal: ${totalGet}得点 ${totalLost}失点`;

        return text;
    },

    generateDetail(matches) {
        let text = '';
        matches.forEach(m => {
            text += `■ ${m.label || '試合'} vs ${m.opponent} (${m.scoreMyself}-${m.scoreOpponent})\n`;
            if (m.events && m.events.length > 0) {
                m.events.forEach(e => {
                    if (e.type === 'goal') {
                        const p = Store.getPlayerName(e.playerId);
                        const a = e.assistId ? `(As: ${Store.getPlayerName(e.assistId)})` : '';
                        text += `  ${e.time} GOAL: ${p} ${a}\n`;
                    } else if (e.type === 'opponent_goal') {
                        text += `  ${e.time} 失点\n`;
                    }
                });
            } else {
                text += '  (イベントなし)\n';
            }
            text += '\n';
        });
        return text;
    },

    generateCSV(matches) {
        let csv = 'MatchID,Date,Label,Opponent,MyScore,OppScore,Result\n';
        matches.forEach(m => {
            let res = 'Draw';
            if (parseInt(m.scoreMyself) > parseInt(m.scoreOpponent)) res = 'Win';
            if (parseInt(m.scoreMyself) < parseInt(m.scoreOpponent)) res = 'Lose';

            csv += `${m.id},${m.date},${m.label},${m.opponent},${m.scoreMyself},${m.scoreOpponent},${res}\n`;
        });
        return csv;
    },

    copyToClipboard() {
        const el = document.getElementById('report-content');
        if (!el) return;
        el.select();
        document.execCommand('copy');

        const fb = document.getElementById('copy-feedback');
        if (fb) {
            fb.classList.remove('opacity-0');
            setTimeout(() => fb.classList.add('opacity-0'), 2000);
        }
    }
};


// ---------------------------------------------------------
// 6. Initialization
// ---------------------------------------------------------
const app = {
    store: Store,
    router: Router,
    ui: UI,
    match: MatchLogic,
    report: ReportLogic,
    stats: StatsLogic,
    auth: AuthLogic,

    init() {
        AuthLogic.init();
        FirestoreStore.init();
        UI.setupEventListeners();
        Router.init();
        console.log('App Initialized (Cloud + Import Mode)');
    }
};

// GLOBAL EXPORTS FOR INLINE ONCLICK
window.app = app;
window.Store = Store; // Needed for inline Store.getSetting etc
window.UI = UI;
window.MatchLogic = MatchLogic;
window.Router = Router;

// Start App
window.addEventListener('DOMContentLoaded', () => {
    // alert('DOM Ready - Init App'); // Removed
    try {
        if (!window.app) throw new Error('App Object Missing');
        window.app.init();
    } catch (e) {
        alert('アプリ起動エラー: ' + e.message + '\n' + e.stack);
        console.error('Init Error:', e);
    }
});

// Helper for rescue
window.backupData = function () {
    // Kept for safety
    try {
        const data = localStorage.getItem('soccer-tracker-data');
        if (!data) {
            alert('保存するデータがありません');
            return;
        }
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'soccer-tracker-backup-' + new Date().toISOString().slice(0, 10) + '.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    } catch (e) { alert('Backup Error:' + e.message); }
};

// FORCE GLOBAL CLOSE FUNCTION
window.closeAppModal = function () {
    console.log('Global Force Close Modal');
    const m = document.getElementById('player-select-modal');
    if (m) m.classList.add('hidden');

    // Safety generic
    document.querySelectorAll('[id$="-modal"]').forEach(el => el.classList.add('hidden'));

    // Reset temp scorer on UI if UI exists
    if (window.UI) window.UI.tempScorer = null;
    if (window.app && window.app.ui) window.app.ui.tempScorer = null;
};
