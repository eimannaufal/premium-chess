// ===================================
// AI LOGIC - STOCKFISH INTEGRATION
// ===================================

const STOCKFISH_URL = 'https://cdnjs.cloudflare.com/ajax/libs/stockfish.js/10.0.2/stockfish.js';
let engine = null;
let aiDifficulty = 5;
let isAiThinking = false;
let playerChosenColor = 'white';
let expectingStockfishMove = false; // Track if we're waiting for Stockfish response

function initializeAI() {
    // Try to load the engine using Blob to bypass CORS worker issues
    fetch(STOCKFISH_URL)
        .then(response => response.text())
        .then(script => {
            const blob = new Blob([script], { type: 'application/javascript' });
            const blobUrl = URL.createObjectURL(blob);

            engine = new Worker(blobUrl);
            engine.onmessage = handleEngineMessage;
            engine.onerror = (err) => {
                console.error("AI Engine Worker Error:", err);
                showGameMessage("AI Engine Error. Reload page.", "warning");
            };

            // Basic UCI initialization
            engine.postMessage('uci');
            engine.postMessage('isready');
            console.log("[AI] Engine loaded successfully via Blob.");
        })
        .catch(err => {
            console.error("Failed to fetch Stockfish:", err);
            showGameMessage("Failed to load AI. Check connection.", "warning");
        });
}


function handleEngineMessage(event) {
    const line = event.data;
    console.log("[AI Engine]", line);

    if (line === 'uciok') {
        console.log("[AI] Engine UCI initialized.");
    }
    if (line === 'readyok') {
        console.log("[AI] Engine is ready.");
    }

    if (line.startsWith('bestmove')) {
        // Only process if we're expecting a Stockfish move
        if (!expectingStockfishMove) {
            console.log("[AI] Ignoring engine response (already made a blunder move)");
            return;
        }

        expectingStockfishMove = false;
        const move = line.split(' ')[1];
        if (move && move !== '(none)') {
            console.log("[AI] Engine recommends move:", move);
            executeAiMove(move);
        } else {
            console.warn("[AI] Engine returned no move. Game state might be blocked.");
        }
        setAiThinking(false);
    }
}


function startAiMatch(chosenColor = null, difficulty = null) {
    const finalColor = chosenColor || playerChosenColor;
    const finalDiff = difficulty || aiDifficulty;

    const startMatch = () => {
        initializeGame();
        gameState.isOnline = false;
        gameState.isAI = true;
        gameState.myColor = finalColor;
        gameState.aiColor = finalColor === 'white' ? 'black' : 'white';
        aiDifficulty = finalDiff; // Sync global difficulty

        hideAiPanel();
        showGameMessage(`AI Match Started! (Level ${aiDifficulty})`, 'info');

        // Instead of moving immediately, wait for the autoStartGameTimer to trigger
        autoStartGameTimer();
    };



    if (chosenColor) {
        startMatch();
    } else if (confirm(`Start match against AI as ${finalColor.charAt(0).toUpperCase() + finalColor.slice(1)}? This will reset the current game.`)) {
        startMatch();
    }
}



// ===================================
// AI DIFFICULTY CONFIGURATION
// ===================================

// Get blunder probability based on AI level (for levels 1-4)
function getBlunderProbability(level) {
    const blunderRates = { 1: 0.40, 2: 0.25, 3: 0.15, 4: 0.05 };
    return blunderRates[level] || 0;
}

// Get Stockfish skill level based on AI level
function getSkillLevel(level) {
    if (level <= 4) return 0; // Use error rate instead for low levels
    // Map 5-10 to Stockfish skill 2-20 (approx +3.6 per level)
    return Math.floor((level - 5) * 3.6 + 2);
}

// Get all legal moves for the current AI color
function getAllLegalMoves() {
    const moves = [];
    const aiColor = gameState.aiColor;

    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === aiColor) {
                const validMoves = calculateValidMoves(row, col);
                validMoves.forEach(move => {
                    moves.push({
                        from: { row, col },
                        to: move
                    });
                });
            }
        }
    }

    return moves;
}

// Convert a move object to Stockfish UCI notation
function moveToUci(move) {
    const files = 'abcdefgh';
    const ranks = '87654321';

    let uci = '';
    uci += files[move.from.col];
    uci += ranks[move.from.row];
    uci += files[move.to.col];
    uci += ranks[move.to.row];

    // Check for pawn promotion (simple check - if pawn reaches last rank)
    const piece = gameState.board[move.from.row][move.from.col];
    if (piece && piece.type === 'pawn') {
        const lastRank = piece.color === 'white' ? 0 : 7;
        if (move.to.row === lastRank) {
            uci += 'q'; // Default to queen promotion
        }
    }

    return uci;
}

// ===================================
// AI MOVE TRIGGER
// ===================================

function triggerAiMove() {
    if (!engine) {
        console.error("[AI] Engine not initialized!");
        return;
    }
    if (!gameState.isAI || gameState.isGameOver) {
        console.log("[AI] triggerAiMove skipped: Not AI mode or Game Over.");
        return;
    }

    setAiThinking(true);

    const FEN = boardToFEN();
    console.log("[AI] Analyzing position (FEN):", FEN);

    // Check if we should make a blunder (for levels 1-4)
    const blunderProb = getBlunderProbability(aiDifficulty);
    const shouldBlunder = Math.random() < blunderProb;

    if (shouldBlunder) {
        console.log(`[AI] Level ${aiDifficulty}: Making a random blunder!`);
        expectingStockfishMove = false; // Not expecting Stockfish response
        makeRandomMove();
    } else {
        // Use Stockfish for best move
        expectingStockfishMove = true; // Expecting Stockfish response
        requestStockfishMove(FEN);
    }
}

// Make a random legal move (for blunder behavior)
function makeRandomMove() {
    const legalMoves = getAllLegalMoves();

    if (legalMoves.length === 0) {
        console.warn("[AI] No legal moves available!");
        setAiThinking(false);
        return;
    }

    // Pick a random move
    const randomMove = legalMoves[Math.floor(Math.random() * legalMoves.length)];
    const uciMove = moveToUci(randomMove);

    console.log(`[AI] Random blunder move: ${uciMove}`);
    executeAiMove(uciMove);
}

// Request best move from Stockfish
function requestStockfishMove(fen) {
    // Ensure engine is ready for new command
    expectingStockfishMove = true;
    engine.postMessage('ucinewgame');

    // Set engine parameters based on difficulty
    const skillLevel = getSkillLevel(aiDifficulty);
    engine.postMessage(`setoption name Skill Level value ${skillLevel}`);
    console.log(`[AI] Level ${aiDifficulty}: Stockfish skill ${skillLevel}`);

    // Position
    engine.postMessage(`position fen ${fen}`);

    // Map difficulty to search depth/time
    // Level 1-4: 200ms (but these use blunders mostly)
    // Level 5-10: 400ms-2000ms
    const baseTime = aiDifficulty <= 4 ? 200 : aiDifficulty * 200;
    console.log(`[AI] Thinking for ${baseTime}ms (Level ${aiDifficulty})...`);
    engine.postMessage(`go movetime ${baseTime}`);
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
    const status = document.getElementById('aiStatusHub');
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
