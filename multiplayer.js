// ===================================
// MULTIPLAYER - FIREBASE INTEGRATION
// ===================================

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
    const createBtn = document.getElementById('createGameBtn');
    const joinBtn = document.getElementById('joinGameBtn');
    const gameCodeInput = document.getElementById('gameCodeInput');
    const copyLinkBtn = document.getElementById('copyLinkBtn');

    createBtn.addEventListener('click', createOnlineGame);
    joinBtn.addEventListener('click', () => joinOnlineGame(gameCodeInput.value.trim()));

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

function createOnlineGame() {
    gameId = generateGameCode();
    gameRef = database.ref('games/' + gameId);

    isHost = true;
    myColor = 'white';

    showStatus('Waiting for opponent...');
    showGameCode(gameId);
    hideMultiplayerControls();

    // Reset game data in database
    gameRef.set({
        host: true,
        moves: [],
        resetRequest: false,
        status: 'waiting'
    });

    // Listen for opponent joining
    gameRef.on('value', (snapshot) => {
        const data = snapshot.val();
        if (data && data.status === 'playing' && gameState.isOnline === false) {
            showStatus('Connected! You play as White', 'connected');
            setupGameListeners();

            // Start a new game
            initializeGame();
            gameState.isOnline = true;
            gameState.myColor = myColor;
            renderBoard();
            updateUI();
        }
    });
}

function joinOnlineGame(code) {
    if (!code) {
        alert('Please enter a game code!');
        return;
    }

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
        myColor = 'black';

        // Update status to playing
        gameRef.update({
            status: 'playing',
            guest: true
        });

        showStatus('Connected! You play as Black', 'connected');
        setupGameListeners();

        // Start a new game
        initializeGame();
        gameState.isOnline = true;
        gameState.myColor = myColor;
        renderBoard();
        updateUI();
    });
}

function setupGameListeners() {
    // Listen for moves
    gameRef.child('lastMove').on('value', (snapshot) => {
        const move = snapshot.val();
        if (move && move.color !== myColor) {
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
    if (gameRef) {
        gameRef.update({
            lastMove: {
                from,
                to,
                color: myColor,
                timestamp: firebase.database.ServerValue.TIMESTAMP
            }
        });
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
