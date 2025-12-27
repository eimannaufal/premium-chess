// ===================================
// MULTIPLAYER - FIREBASE INTEGRATION
// ===================================
console.log("[MULTIPLAYER] File loaded and executing...");

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyBJTIrPmc1-ryMkMf8BP2euSFVYiwS_bMU",
    authDomain: "premium-chess-6d0f5.firebaseapp.com",
    databaseURL: "https://premium-chess-6d0f5-default-rtdb.asia-southeast1.firebasedatabase.app",
    projectId: "premium-chess-6d0f5",
    storageBucket: "premium-chess-6d0f5.firebasestorage.app",
    messagingSenderId: "38471159988",
    appId: "1:38471159988:web:310ba57dc7b703399647e1"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let gameId = null;
let gameRef = null;
let isHost = false;
let myColor = null; // 'white' or 'black'

// Initialize multiplayer  
function initializeMultiplayer() {
    // Note: The 'Create' button is handled in initializeStartOverlay in script.js

    const joinBtn = document.getElementById('hubJoinGameBtn');
    const gameCodeInput = document.getElementById('hubGameCodeInput');
    const copyLinkBtn = document.getElementById('copyLinkBtn');

    if (joinBtn && gameCodeInput) {
        joinBtn.addEventListener('click', () => joinOnlineGame(gameCodeInput.value.trim()));

        gameCodeInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                joinOnlineGame(gameCodeInput.value.trim());
            }
        });
    }

    if (copyLinkBtn) {
        copyLinkBtn.addEventListener('click', () => {

            const link = document.getElementById('displayedLink').textContent;
            navigator.clipboard.writeText(link).then(() => {
                const originalText = copyLinkBtn.innerHTML;
                copyLinkBtn.textContent = '✅';
                setTimeout(() => {
                    copyLinkBtn.innerHTML = originalText;
                }, 2000);
            });
        });
    }

    gameCodeInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            joinOnlineGame(gameCodeInput.value.trim());
        }
    });

    // Check for game code in URL
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('game');
    if (code) {
        joinOnlineGame(code);
    }
}

function createOnlineGame(chosenColor = 'white') {
    gameId = generateGameCode();
    gameRef = database.ref('games/' + gameId);

    isHost = true;
    myColor = chosenColor;

    showStatus('Waiting for opponent...');
    showGameCode(gameId);
    hideMultiplayerControls();

    // Reset game data in database
    gameRef.set({
        host: true,
        moves: [],
        resetRequest: false,
        status: 'waiting',
        hostColor: chosenColor,
        initialTime: gameState.timers.initial
    });



    // Listen for opponent joining
    console.log("[MULTIPLAYER] Starting status listener for game:", gameId);

    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (!data) return;

        console.log("[MULTIPLAYER] Data updated. Status:", data.status, "IsOnline:", gameState.isOnline);

        if (data && data.status === 'playing' && !gameState.isOnline) {
            console.log("[MULTIPLAYER] Opponent detected! Transitioning to Online mode...");

            const hostCol = data.hostColor || 'white';

            // Set the state BEFORE calling setupGameListeners
            gameState.isOnline = true;
            gameState.myColor = hostCol;
            myColor = hostCol; // Global variable update

            showStatus(`Connected! You play as ${hostCol.charAt(0).toUpperCase() + hostCol.slice(1)}`, 'connected');
            setupGameListeners();

            // Start a new game
            initializeGame();

            // Restore online status after initializeGame might have reset it
            gameState.isOnline = true;
            gameState.myColor = hostCol;

            renderBoard();
            updateUI();
            console.log("[MULTIPLAYER] Host game ready. Online status confirmed.");
        }

    }, (error) => {
        console.error("[MULTIPLAYER] Database listener error:", error);
    });
}

function joinOnlineGame(code) {
    if (!code) {
        alert('Please enter a game code!');
        return;
    }

    // If joining from Hub, hide Hub
    const overlay = document.getElementById('startOverlay');
    if (overlay) overlay.classList.add('hidden');

    const cleanCode = code.toUpperCase();

    gameId = cleanCode;
    gameRef = database.ref('games/' + cleanCode);

    showStatus('Connecting...');
    hideMultiplayerControls();

    gameRef.once('value').then((snapshot) => {
        const data = snapshot.val();

        if (!data) {
            alert('Game not found!');
            showMultiplayerControls();
            hideStatus();
            return;
        }

        if (data.status === 'playing') {
            alert('Game is already full!');
            showMultiplayerControls();
            hideStatus();
            return;
        }

        isHost = false;
        const hostCol = data.hostColor || 'white';
        const guestCol = hostCol === 'white' ? 'black' : 'white';
        myColor = guestCol;

        // Update status to playing
        gameRef.update({
            status: 'playing',
            guest: true
        });

        // Set local state
        gameState.isOnline = true;
        gameState.myColor = guestCol;
        myColor = guestCol; // Global variable update

        // Sync timer from host
        if (data.initialTime) {
            console.log("[MULTIPLAYER] Syncing timer from host:", data.initialTime);
            setInitialTime(data.initialTime / 60);
        }


        console.log(`[MULTIPLAYER] Successfully joined as ${guestCol}. ID:`, gameId);
        showStatus(`Connected! You play as ${guestCol.charAt(0).toUpperCase() + guestCol.slice(1)}`, 'connected');
        setupGameListeners();

        // Start a new game
        initializeGame();

        // Restore state after init
        gameState.isOnline = true;
        gameState.myColor = guestCol;

        renderBoard();
        updateUI();

    }).catch(error => {
        console.error("[MULTIPLAYER] Join game failed:", error);
        alert('Failed to join game. Please check your connection.');
        showMultiplayerControls();
        hideStatus();
    });
}

function setupGameListeners() {
    // Listen for moves
    gameRef.child('lastMove').on('value', (snapshot) => {
        const move = snapshot.val();
        if (move && move.color !== (gameState.myColor || myColor)) {
            console.log("Received remote move:", move);
            handleRemoteMove(move);
        }
    });

    // Listen for resets
    gameRef.child('resetRequest').on('value', (snapshot) => {
        const resetTrigger = snapshot.val();
        if (resetTrigger && resetTrigger.initiatedBy !== myColor) {
            if (confirm('Opponent wants to start a new game. Accept?')) {
                initializeGame();
                gameState.isOnline = true;
                gameState.myColor = myColor;
                renderBoard();
                updateUI();
                // Clear the request
                gameRef.update({ resetRequest: false });
            } else {
                gameRef.update({ resetRequest: false });
            }
        }
    });

    // Listen for disconnection
    gameRef.onDisconnect().update({
        status: 'disconnected'
    });

    gameRef.child('status').on('value', (snapshot) => {
        if (snapshot.val() === 'disconnected') {
            showStatus('Opponent disconnected', 'disconnected');
            gameState.isOnline = false;
            setTimeout(() => {
                showMultiplayerControls();
                hideStatus();
            }, 3000);
        }
    });
}

function handleRemoteMove(move) {
    // Apply the move received from opponent
    const { from, to } = move;
    movePiece(from, to);
    renderBoard();
    updateUI();
}

function sendMove(from, to) {
    if (gameRef && gameState.isOnline) {
        console.log("Sending move to Firebase:", from, to);
        gameRef.update({
            lastMove: {
                from,
                to,
                color: gameState.myColor,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }
        }).catch(err => console.error("Error sending move:", err));
    }
}

function generateGameCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

function showStatus(message, status = '') {
    const statusEl = document.getElementById('connectionStatus');
    const statusText = document.getElementById('statusText');
    statusEl.style.display = 'flex';
    statusText.textContent = message;

    statusEl.className = 'connection-status';
    if (status) {
        statusEl.classList.add(status);
    }
}

function hideStatus() {
    document.getElementById('connectionStatus').style.display = 'none';
}

function showGameCode(code) {
    const codeDisplay = document.getElementById('gameCodeDisplay');
    const displayedCode = document.getElementById('displayedCode');
    const displayedLink = document.getElementById('displayedLink');

    codeDisplay.style.display = 'block';
    displayedCode.textContent = code;

    const url = new URL(window.location.href);
    url.searchParams.set('game', code);
    displayedLink.textContent = url.toString();
}

function hideGameCode() {
    document.getElementById('gameCodeDisplay').style.display = 'none';
}

function showMultiplayerControls() {
    document.getElementById('multiplayerControls').style.display = 'block';
    hideGameCode();
}

function hideMultiplayerControls() {
    document.getElementById('multiplayerControls').style.display = 'none';
}

// Modify the existing handleSquareClick to check if it's player's turn
const originalHandleSquareClick = handleSquareClick;
// Note: handleSquareClick is a global function from script.js
window.addEventListener('load', () => {
    const oldHandle = handleSquareClick;
    handleSquareClick = function (row, col) {
        // If online game, check if it's my turn
        if (gameState.isOnline && gameState.myColor && gameState.currentTurn !== gameState.myColor) {
            showGameMessage("It's not your turn!", 'warning');
            return;
        }
        oldHandle(row, col);
    };

    const oldMove = movePiece;
    movePiece = function (from, to) {
        // Send move to opponent if online
        if (gameState.isOnline && gameState.myColor === gameState.currentTurn) {
            sendMove(from, to);
        }
        oldMove(from, to);
    };

    const oldInit = initializeGame;
    initializeGame = function () {
        const wasOnline = gameState.isOnline;
        const savedMyColor = gameState.myColor;

        oldInit();

        if (wasOnline) {
            gameState.isOnline = true;
            gameState.myColor = savedMyColor;
        }
    };

    // Add listener to the new game button to handle online reset
    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (gameState.isOnline && gameRef) {
                gameRef.update({
                    resetRequest: {
                        initiatedBy: myColor,
                        timestamp: firebase.database.ServerValue.TIMESTAMP
                    }
                });
            }
        });
    }

    initializeMultiplayer();
});
