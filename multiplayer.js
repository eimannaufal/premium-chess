// ===================================
// MULTIPLAYER - PEERJS INTEGRATION
// ===================================

let peer = null;
let connection = null;
let isHost = false;
let myColor = null; // 'white' or 'black'

// Initialize multiplayer  
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
    const gameCode = urlParams.get('game');
    if (gameCode) {
        joinOnlineGame(gameCode);
    }
}

function createOnlineGame() {
    if (peer) {
        peer.destroy();
    }

    const gameCode = generateGameCode();
    peer = new Peer(gameCode);

    showStatus('Waiting for opponent...');
    showGameCode(gameCode);
    hideMultiplayerControls();

    isHost = true;
    myColor = 'white'; // Host plays white

    peer.on('open', (id) => {
        console.log('Peer created with ID:', id);
    });

    peer.on('connection', (conn) => {
        connection = conn;
        setupConnection();
        showStatus('Connected! You play as White', 'connected');

        // Start a new game
        initializeGame();
        gameState.isOnline = true;
        gameState.myColor = myColor;
        renderBoard();
        updateUI();
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showStatus('Connection error: ' + err.type, 'disconnected');
    });
}

function joinOnlineGame(gameCode) {
    if (!gameCode) {
        alert('Please enter a game code!');
        return;
    }

    if (peer) {
        peer.destroy();
    }

    peer = new Peer();

    showStatus('Connecting...');
    hideMultiplayerControls();

    isHost = false;
    myColor = 'black'; // Joiner plays black

    peer.on('open', () => {
        connection = peer.connect(gameCode.toUpperCase());

        connection.on('open', () => {
            setupConnection();
            showStatus('Connected! You play as Black', 'connected');

            // Start a new game
            initializeGame();
            gameState.isOnline = true;
            gameState.myColor = myColor;
            renderBoard();
            updateUI();
        });

        connection.on('error', (err) => {
            console.error('Connection error:', err);
            showStatus('Failed to connect', 'disconnected');
            showMultiplayerControls();
        });
    });

    peer.on('error', (err) => {
        console.error('Peer error:', err);
        showStatus('Connection error: ' + err.type, 'disconnected');
        showMultiplayerControls();
    });
}

function setupConnection() {
    connection.on('data', (data) => {
        handleRemoteMove(data);
    });

    connection.on('close', () => {
        showStatus('Opponent disconnected', 'disconnected');
        gameState.isOnline = false;
        setTimeout(() => {
            showMultiplayerControls();
            hideStatus();
        }, 3000);
    });
}

function handleRemoteMove(data) {
    if (data.type === 'move') {
        // Apply the move received from opponent
        const { from, to } = data;
        movePiece(from, to);
        renderBoard();
        updateUI();
    } else if (data.type === 'reset') {
        // Opponent wants to reset the game
        if (confirm('Opponent wants to start a new game. Accept?')) {
            initializeGame();
            gameState.isOnline = true;
            gameState.myColor = myColor;
            renderBoard();
            updateUI();
        }
    }
}

function sendMove(from, to) {
    if (connection && connection.open) {
        connection.send({
            type: 'move',
            from,
            to
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
handleSquareClick = function (row, col) {
    // If online game, check if it's my turn
    if (gameState.isOnline && gameState.myColor && gameState.currentTurn !== gameState.myColor) {
        showGameMessage("It's not your turn!", 'warning');
        return;
    }

    originalHandleSquareClick(row, col);
};

// Modify the existing movePiece to send move to opponent
const originalMovePiece = movePiece;
movePiece = function (from, to) {
    // Send move to opponent if online
    if (gameState.isOnline && gameState.myColor === gameState.currentTurn) {
        sendMove(from, to);
    }

    originalMovePiece(from, to);
};

// Update gameState initialization to include online properties
const originalInitializeGame = initializeGame;
initializeGame = function () {
    const wasOnline = gameState.isOnline;
    const savedMyColor = gameState.myColor;

    originalInitializeGame();

    if (wasOnline) {
        gameState.isOnline = true;
        gameState.myColor = savedMyColor;

        // Notify opponent about reset if we were the one who initiated it
        // (This is a bit tricky since initializeGame is called in many places)
        // We only send if color matches current turn or if it's a manual reset
    } else {
        gameState.isOnline = false;
        gameState.myColor = null;
    }
};

// Add listener to the new game button to handle online reset
const newGameBtn = document.getElementById('newGameBtn');
if (newGameBtn) {
    const originalNewGameHandler = newGameBtn.onclick; // This might be null if added via addEventListener
    // Since it's added via addEventListener in script.js, we can't easily remove it.
    // But we can add another listener.
    newGameBtn.addEventListener('click', () => {
        if (gameState.isOnline && connection && connection.open) {
            connection.send({ type: 'reset' });
        }
    });
}

// Initialize multiplayer when DOM is loaded
const originalDOMContentLoaded = document.querySelector('script[src="script.js"]');
if (originalDOMContentLoaded) {
    window.addEventListener('DOMContentLoaded', () => {
        initializeMultiplayer();
    });
} else {
    // If script is already loaded
    initializeMultiplayer();
}
