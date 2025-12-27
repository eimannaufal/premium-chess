// ===================================
// AI LOGIC - STOCKFISH INTEGRATION
// ===================================

const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
let engine = null;
let aiDifficulty = 5;
let isAiThinking = false;
let playerChosenColor = 'white';

function initializeAI() {
    const startAiBtn = document.getElementById('startAiBtn');
    const difficultySlider = document.getElementById('aiDifficulty');
    const difficultyDisplay = document.getElementById('difficultyDisplay');
    const colorBtns = document.querySelectorAll('.color-btn');

    if (startAiBtn) {
        startAiBtn.addEventListener('click', startAiMatch);
    }

    if (colorBtns) {
        colorBtns.forEach(btn => {
            btn.addEventListener('click', () => {
                colorBtns.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                playerChosenColor = btn.dataset.color;
            });
        });
    }


    if (difficultySlider) {
        difficultySlider.addEventListener('input', (e) => {
            aiDifficulty = parseInt(e.target.value);
            difficultyDisplay.textContent = `Level ${aiDifficulty}`;
        });
    }

    // Try to load the engine in a worker
    try {
        engine = new Worker(STOCKFISH_URL);
        engine.onmessage = handleEngineMessage;

        // Basic UCI initialization
        engine.postMessage('uci');
        engine.postMessage('isready');
    } catch (e) {
        console.error("Failed to load Stockfish engine:", e);
        showGameMessage("AI Engine failed to load. Using local multiplayer.", "warning");
    }
}

function handleEngineMessage(event) {
    const line = event.data;
    console.log("[STOCKFISH]", line);

    if (line.startsWith('bestmove')) {
        const move = line.split(' ')[1];
        if (move && move !== '(none)') {
            executeAiMove(move);
        }
        setAiThinking(false);
    }
}

function startAiMatch() {
    if (confirm(`Start match against AI as ${playerChosenColor.charAt(0).toUpperCase() + playerChosenColor.slice(1)}? This will reset the current game.`)) {
        initializeGame();
        gameState.isOnline = false;
        gameState.isAI = true;
        gameState.myColor = playerChosenColor;
        gameState.aiColor = playerChosenColor === 'white' ? 'black' : 'white';

        hideAiPanel();
        showGameMessage(`AI Match Started! (Level ${aiDifficulty})`, 'info');

        // If AI is white, it moves first
        if (gameState.currentTurn === gameState.aiColor) {
            setTimeout(triggerAiMove, 600);
        }
    }
}


function triggerAiMove() {
    if (!engine || !gameState.isAI || gameState.isGameOver) return;

    setAiThinking(true);

    const FEN = boardToFEN();
    console.log("Sending FEN to AI:", FEN);

    // Set engine parameters based on difficulty
    // Skill Level 0-20
    const skillLevel = Math.floor((aiDifficulty - 1) * 2.22); // Map 1-10 to 0-20
    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);

    // Position
    engine.postMessage(`position fen ${FEN}`);

    // Map difficulty to search depth/time
    // Level 1: 100ms, Level 10: 2000ms
    const moveTime = aiDifficulty * 200;
    engine.postMessage(`go movetime ${moveTime}`);
}

function executeAiMove(moveStr) {
    // Parse move like "e2e4" or "e7e8q"
    const fromCol = moveStr.charCodeAt(0) - 97; // 'a' -> 0
    const fromRow = 8 - parseInt(moveStr[1]);
    const toCol = moveStr.charCodeAt(2) - 97;
    const toRow = 8 - parseInt(moveStr[3]);

    const from = { row: fromRow, col: fromCol };
    const to = { row: toRow, col: toCol };

    // Perform move logic
    movePiece(from, to);
    renderBoard();
    updateUI();
}

function setAiThinking(thinking) {
    isAiThinking = thinking;
    const status = document.getElementById('aiStatus');
    if (status) {
        status.style.display = thinking ? 'flex' : 'none';
    }
}

function boardToFEN() {
    let fen = '';

    for (let row = 0; row < 8; row++) {
        let emptyCount = 0;
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece) {
                if (emptyCount > 0) {
                    fen += emptyCount;
                    emptyCount = 0;
                }
                const symbol = getPieceLetter(piece.type);
                fen += piece.color === 'white' ? symbol.toUpperCase() : symbol.toLowerCase();
            } else {
                emptyCount++;
            }
        }
        if (emptyCount > 0) fen += emptyCount;
        if (row < 7) fen += '/';
    }

    // Turn
    fen += ` ${gameState.currentTurn === 'white' ? 'w' : 'b'}`;

    // Castling
    let castling = '';
    if (!gameState.hasMoved.white.king) {
        if (!gameState.hasMoved.white.rookRight) castling += 'K';
        if (!gameState.hasMoved.white.rookLeft) castling += 'Q';
    }
    if (!gameState.hasMoved.black.king) {
        if (!gameState.hasMoved.black.rookRight) castling += 'k';
        if (!gameState.hasMoved.black.rookLeft) castling += 'q';
    }
    fen += ` ${castling || '-'}`;


    // En passant (not fully implemented in current script.js, so use -)
    fen += ' -';

    // Half-move clock and full-move number
    fen += ' 0 1';

    return fen;
}

function getPieceLetter(type) {
    switch (type) {
        case 'pawn': return 'p';
        case 'rook': return 'r';
        case 'knight': return 'n';
        case 'bishop': return 'b';
        case 'queen': return 'q';
        case 'king': return 'k';
        default: return '';
    }
}

function hideAiPanel() {
    // Optional: maybe just highlight it's active
}

// Initialize when scripts are loaded
window.addEventListener('load', () => {
    initializeAI();

    // Inject AI hook into movePiece
    const originalMovePiece = movePiece;
    movePiece = function (from, to) {
        originalMovePiece(from, to);

        // After move, if it's AI turn and we are in AI mode
        if (gameState.isAI && !gameState.isGameOver && gameState.currentTurn === gameState.aiColor) {
            setTimeout(triggerAiMove, 500); // Small delay for realism
        }
    };

    // Inject AI hook into handleSquareClick to prevent moving for AI
    const originalHandleClick = handleSquareClick;
    handleSquareClick = function (row, col) {
        if (gameState.isAI && gameState.currentTurn === gameState.aiColor) {
            return; // Prevent human interaction during AI turn
        }
        originalHandleClick(row, col);
    };
});
