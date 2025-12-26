// ===================================
// CHESS GAME - COMPLETE IMPLEMENTATION
// ===================================

// Chess Piece Symbols (Unicode)
const PIECES = {
    white: {
        king: '♔',
        queen: '♕',
        rook: '♖',
        bishop: '♗',
        knight: '♘',
        pawn: '♙'
    },
    black: {
        king: '♚',
        queen: '♛',
        rook: '♜',
        bishop: '♝',
        knight: '♞',
        pawn: '♟'
    }
};

// Game State
let gameState = {
    board: [],
    currentTurn: 'white',
    selectedSquare: null,
    validMoves: [],
    capturedPieces: { white: [], black: [] },
    moveHistory: [],
    kings: { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } },
    isGameOver: false,
    checkState: { white: false, black: false },
    castlingRights: {
        white: { kingSide: true, queenSide: true },
        black: { kingSide: true, queenSide: true }
    },
    hasMoved: { white: { king: false, rookLeft: false, rookRight: false }, black: { king: false, rookLeft: false, rookRight: false } },
    isOnline: false,
    myColor: null
};

// ===================================
// INITIALIZATION
// ===================================

function initializeGame() {
    gameState = {
        board: createInitialBoard(),
        currentTurn: 'white',
        selectedSquare: null,
        validMoves: [],
        capturedPieces: { white: [], black: [] },
        moveHistory: [],
        kings: { white: { row: 7, col: 4 }, black: { row: 0, col: 4 } },
        isGameOver: false,
        checkState: { white: false, black: false },
        castlingRights: {
            white: { kingSide: true, queenSide: true },
            black: { kingSide: true, queenSide: true }
        },
        hasMoved: { white: { king: false, rookLeft: false, rookRight: false }, black: { king: false, rookLeft: false, rookRight: false } }
    };

    renderBoard();
    updateUI();
}

function createInitialBoard() {
    const board = Array(8).fill(null).map(() => Array(8).fill(null));

    // Black pieces (top)
    board[0] = [
        { type: 'rook', color: 'black' },
        { type: 'knight', color: 'black' },
        { type: 'bishop', color: 'black' },
        { type: 'queen', color: 'black' },
        { type: 'king', color: 'black' },
        { type: 'bishop', color: 'black' },
        { type: 'knight', color: 'black' },
        { type: 'rook', color: 'black' }
    ];
    // Create individual pawn objects for black
    board[1] = Array(8).fill(null).map(() => ({ type: 'pawn', color: 'black' }));

    // White pieces (bottom)
    // Create individual pawn objects for white
    board[6] = Array(8).fill(null).map(() => ({ type: 'pawn', color: 'white' }));
    board[7] = [
        { type: 'rook', color: 'white' },
        { type: 'knight', color: 'white' },
        { type: 'bishop', color: 'white' },
        { type: 'queen', color: 'white' },
        { type: 'king', color: 'white' },
        { type: 'bishop', color: 'white' },
        { type: 'knight', color: 'white' },
        { type: 'rook', color: 'white' }
    ];

    return board;
}

// ===================================
// BOARD RENDERING
// ===================================

function renderBoard() {
    const boardElement = document.getElementById('chessBoard');
    const wrapper = boardElement.parentElement;

    // Clear existing board
    boardElement.innerHTML = '';

    // Remove old coordinate labels if they exist
    wrapper.querySelectorAll('.coordinate-label').forEach(el => el.remove());

    // Add column labels (A-H) at the bottom
    for (let col = 0; col < 8; col++) {
        const label = document.createElement('div');
        label.className = 'coordinate-label col-label';
        label.textContent = String.fromCharCode(65 + col); // A-H
        label.style.left = `calc(2rem + ${col * 12.5}% + 6.25%)`;
        wrapper.appendChild(label);
    }

    // Add row labels (8-1) on the left
    for (let row = 0; row < 8; row++) {
        const label = document.createElement('div');
        label.className = 'coordinate-label row-label';
        label.textContent = 8 - row; // 8 to 1
        label.style.top = `calc(2rem + ${row * 12.5}% + 6.25%)`;
        wrapper.appendChild(label);
    }

    // Render squares and pieces
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const square = document.createElement('div');
            square.className = `square ${(row + col) % 2 === 0 ? 'light' : 'dark'}`;
            square.dataset.row = row;
            square.dataset.col = col;

            const piece = gameState.board[row][col];
            if (piece) {
                const pieceElement = document.createElement('div');
                pieceElement.className = `piece ${piece.color}`;
                pieceElement.textContent = PIECES[piece.color][piece.type];
                square.appendChild(pieceElement);

                if (piece.type !== 'king' && piece.type !== 'queen') {
                    square.classList.add('has-piece');
                }
            }

            square.addEventListener('click', () => handleSquareClick(row, col));
            boardElement.appendChild(square);
        }
    }

    highlightSquares();
    highlightTurnIndicator();
    highlightCheckState();
}

function highlightSquares() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => {
        square.classList.remove('selected', 'valid-move');
    });

    if (gameState.selectedSquare) {
        const { row, col } = gameState.selectedSquare;
        const selectedSquare = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (selectedSquare) {
            selectedSquare.classList.add('selected');
        }
    }

    gameState.validMoves.forEach(({ row, col }) => {
        const validSquare = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (validSquare) {
            validSquare.classList.add('valid-move');
        }
    });
}

function highlightTurnIndicator() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.classList.remove('turn-indicator'));

    const row = gameState.currentTurn === 'white' ? 7 : 0;
    for (let col = 0; col < 8; col++) {
        const square = document.querySelector(`[data-row="${row}"][data-col="${col}"]`);
        if (square) {
            square.classList.add('turn-indicator');
        }
    }
}

function highlightCheckState() {
    const squares = document.querySelectorAll('.square');
    squares.forEach(square => square.classList.remove('in-check'));

    // Highlight both kings if they are in check
    ['white', 'black'].forEach(color => {
        if (gameState.checkState[color]) {
            const kingPos = gameState.kings[color];
            const kingSquare = document.querySelector(`[data-row="${kingPos.row}"][data-col="${kingPos.col}"]`);
            if (kingSquare) {
                kingSquare.classList.add('in-check');
            }
        }
    });
}

// ===================================
// GAME LOGIC - MOVE HANDLING
// ===================================

function handleSquareClick(row, col) {
    if (gameState.isGameOver) {
        return;
    }

    const clickedPiece = gameState.board[row][col];

    // If a square is already selected
    if (gameState.selectedSquare) {
        const isValidMove = gameState.validMoves.some(
            move => move.row === row && move.col === col
        );

        if (isValidMove) {
            movePiece(gameState.selectedSquare, { row, col });
            gameState.selectedSquare = null;
            gameState.validMoves = [];
        } else if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
            // Select a different piece of the same color
            selectSquare(row, col);
        } else {
            // Deselect
            gameState.selectedSquare = null;
            gameState.validMoves = [];
        }
    } else {
        // Select a piece
        if (clickedPiece && clickedPiece.color === gameState.currentTurn) {
            selectSquare(row, col);
        }
    }

    renderBoard();
    updateUI();
}

function selectSquare(row, col) {
    gameState.selectedSquare = { row, col };
    gameState.validMoves = calculateValidMoves(row, col);
}

function movePiece(from, to) {
    const piece = gameState.board[from.row][from.col];
    const capturedPiece = gameState.board[to.row][to.col];

    // Capture piece if present
    if (capturedPiece) {
        gameState.capturedPieces[capturedPiece.color].push(capturedPiece);
        playSound('capture');
    } else {
        playSound('move');
    }

    // Check if this is a castling move
    const isCastling = piece.type === 'king' && Math.abs(to.col - from.col) === 2;

    // Move the piece
    gameState.board[to.row][to.col] = piece;
    gameState.board[from.row][from.col] = null;

    // Handle castling rook movement
    if (isCastling) {
        const isKingSide = to.col > from.col;
        const rookFromCol = isKingSide ? 7 : 0;
        const rookToCol = isKingSide ? to.col - 1 : to.col + 1;

        const rook = gameState.board[from.row][rookFromCol];
        gameState.board[from.row][rookToCol] = rook;
        gameState.board[from.row][rookFromCol] = null;
    }

    // Track piece movements for castling rights
    if (piece.type === 'king') {
        gameState.kings[piece.color] = { row: to.row, col: to.col };
        gameState.hasMoved[piece.color].king = true;
    }

    if (piece.type === 'rook') {
        if (from.col === 0) {
            gameState.hasMoved[piece.color].rookLeft = true;
        } else if (from.col === 7) {
            gameState.hasMoved[piece.color].rookRight = true;
        }
    }

    // Pawn promotion
    if (piece.type === 'pawn') {
        if ((piece.color === 'white' && to.row === 0) ||
            (piece.color === 'black' && to.row === 7)) {
            piece.type = 'queen'; // Auto-promote to queen
        }
    }

    // Record move
    let moveNotation;
    if (isCastling) {
        moveNotation = to.col > from.col ? '0-0 (King-side)' : '0-0-0 (Queen-side)';
    } else {
        moveNotation = `${getPieceSymbol(piece)} ${String.fromCharCode(97 + from.col)}${8 - from.row} → ${String.fromCharCode(97 + to.col)}${8 - to.row}`;
    }
    gameState.moveHistory.push(moveNotation);

    // Switch turns
    gameState.currentTurn = gameState.currentTurn === 'white' ? 'black' : 'white';

    // Check for check/checkmate
    checkGameState();
}

// ===================================
// MOVE VALIDATION
// ===================================

function calculateValidMoves(row, col) {
    const piece = gameState.board[row][col];
    if (!piece) return [];

    let moves = [];

    switch (piece.type) {
        case 'pawn':
            moves = getPawnMoves(row, col, piece.color);
            break;
        case 'rook':
            moves = getRookMoves(row, col, piece.color);
            break;
        case 'knight':
            moves = getKnightMoves(row, col, piece.color);
            break;
        case 'bishop':
            moves = getBishopMoves(row, col, piece.color);
            break;
        case 'queen':
            moves = getQueenMoves(row, col, piece.color);
            break;
        case 'king':
            moves = getKingMoves(row, col, piece.color);
            break;
    }

    // Filter out moves that would put own king in check
    return moves.filter(move => !wouldMoveExposeKing(row, col, move.row, move.col, piece.color));
}

function getPawnMoves(row, col, color) {
    const moves = [];
    const direction = color === 'white' ? -1 : 1;
    const startRow = color === 'white' ? 6 : 1;

    // Forward move
    if (isInBounds(row + direction, col) && !gameState.board[row + direction][col]) {
        moves.push({ row: row + direction, col });

        // Double move from starting position
        if (row === startRow && !gameState.board[row + 2 * direction][col]) {
            moves.push({ row: row + 2 * direction, col });
        }
    }

    // Diagonal captures
    [-1, 1].forEach(offset => {
        const newCol = col + offset;
        if (isInBounds(row + direction, newCol)) {
            const target = gameState.board[row + direction][newCol];
            if (target && target.color !== color) {
                moves.push({ row: row + direction, col: newCol });
            }
        }
    });

    return moves;
}

function getRookMoves(row, col, color) {
    const moves = [];
    const directions = [[0, 1], [0, -1], [1, 0], [-1, 0]];

    directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;

        while (isInBounds(r, c)) {
            const target = gameState.board[r][c];
            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target.color !== color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            r += dr;
            c += dc;
        }
    });

    return moves;
}

function getKnightMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-2, -1], [-2, 1], [-1, -2], [-1, 2],
        [1, -2], [1, 2], [2, -1], [2, 1]
    ];

    offsets.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isInBounds(r, c)) {
            const target = gameState.board[r][c];
            if (!target || target.color !== color) {
                moves.push({ row: r, col: c });
            }
        }
    });

    return moves;
}

function getBishopMoves(row, col, color) {
    const moves = [];
    const directions = [[1, 1], [1, -1], [-1, 1], [-1, -1]];

    directions.forEach(([dr, dc]) => {
        let r = row + dr;
        let c = col + dc;

        while (isInBounds(r, c)) {
            const target = gameState.board[r][c];
            if (!target) {
                moves.push({ row: r, col: c });
            } else {
                if (target.color !== color) {
                    moves.push({ row: r, col: c });
                }
                break;
            }
            r += dr;
            c += dc;
        }
    });

    return moves;
}

function getQueenMoves(row, col, color) {
    return [...getRookMoves(row, col, color), ...getBishopMoves(row, col, color)];
}

function getKingMoves(row, col, color) {
    const moves = getBasicKingMoves(row, col, color);

    // Castling logic - only check when not already in check
    if (!gameState.hasMoved[color].king && !isKingInCheck(color)) {
        const baseRow = color === 'white' ? 7 : 0;

        // King-side castling
        if (!gameState.hasMoved[color].rookRight) {
            if (!gameState.board[baseRow][5] && !gameState.board[baseRow][6]) {
                // Don't use wouldSquareBeAttacked to avoid recursion
                moves.push({ row: baseRow, col: 6 }); // King moves to g-file
            }
        }

        // Queen-side castling
        if (!gameState.hasMoved[color].rookLeft) {
            if (!gameState.board[baseRow][1] && !gameState.board[baseRow][2] && !gameState.board[baseRow][3]) {
                // Don't use wouldSquareBeAttacked to avoid recursion
                moves.push({ row: baseRow, col: 2 }); // King moves to c-file
            }
        }
    }

    return moves;
}

// Basic king moves without castling (prevents infinite recursion)
function getBasicKingMoves(row, col, color) {
    const moves = [];
    const offsets = [
        [-1, -1], [-1, 0], [-1, 1],
        [0, -1], [0, 1],
        [1, -1], [1, 0], [1, 1]
    ];

    offsets.forEach(([dr, dc]) => {
        const r = row + dr;
        const c = col + dc;
        if (isInBounds(r, c)) {
            const target = gameState.board[r][c];
            if (!target || target.color !== color) {
                moves.push({ row: r, col: c });
            }
        }
    });

    return moves;
}

function isInBounds(row, col) {
    return row >= 0 && row < 8 && col >= 0 && col < 8;
}

// ===================================
// CHECK AND CHECKMATE DETECTION
// ===================================

function wouldMoveExposeKing(fromRow, fromCol, toRow, toCol, color) {
    // Simulate the move
    const originalPiece = gameState.board[fromRow][fromCol];
    const capturedPiece = gameState.board[toRow][toCol];
    const originalKingPos = { ...gameState.kings[color] };

    gameState.board[toRow][toCol] = originalPiece;
    gameState.board[fromRow][fromCol] = null;

    if (originalPiece.type === 'king') {
        gameState.kings[color] = { row: toRow, col: toCol };
    }

    const inCheck = isKingInCheck(color);

    // Undo the move
    gameState.board[fromRow][fromCol] = originalPiece;
    gameState.board[toRow][toCol] = capturedPiece;
    gameState.kings[color] = originalKingPos;

    return inCheck;
}

function isKingInCheck(color) {
    const kingPos = gameState.kings[color];
    const opponentColor = color === 'white' ? 'black' : 'white';

    // Check if any opponent piece can attack the king
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            const piece = gameState.board[row][col];
            if (piece && piece.color === opponentColor) {
                const moves = calculatePieceMoves(row, col, piece);
                if (moves.some(move => move.row === kingPos.row && move.col === kingPos.col)) {
                    return true;
                }
            }
        }
    }

    return false;
}

function calculatePieceMoves(row, col, piece) {
    switch (piece.type) {
        case 'pawn': return getPawnMoves(row, col, piece.color);
        case 'rook': return getRookMoves(row, col, piece.color);
        case 'knight': return getKnightMoves(row, col, piece.color);
        case 'bishop': return getBishopMoves(row, col, piece.color);
        case 'queen': return getQueenMoves(row, col, piece.color);
        case 'king': return getBasicKingMoves(row, col, piece.color); // Use basic moves to avoid recursion
        default: return [];
    }
}

function checkGameState() {
    const currentColor = gameState.currentTurn;
    const inCheck = isKingInCheck(currentColor);

    gameState.checkState[currentColor] = inCheck;

    if (inCheck) {
        // Check if there are any valid moves (checkmate detection)
        let hasValidMoves = false;

        outerLoop:
        for (let row = 0; row < 8; row++) {
            for (let col = 0; col < 8; col++) {
                const piece = gameState.board[row][col];
                if (piece && piece.color === currentColor) {
                    const validMoves = calculateValidMoves(row, col);
                    if (validMoves.length > 0) {
                        hasValidMoves = true;
                        break outerLoop;
                    }
                }
            }
        }

        if (!hasValidMoves) {
            gameState.isGameOver = true;
            const winner = currentColor === 'white' ? 'Black' : 'White';
            showGameMessage(`Checkmate! ${winner} wins! 👑`, 'victory');
            playSound('victory');
        } else {
            showGameMessage('Check! Protect your king!', 'warning');
            playSound('check');
        }
    }
}

// ===================================
// UI UPDATES
// ===================================

function updateUI() {
    // Update turn indicator
    const turnValue = document.getElementById('turnValue');
    turnValue.textContent = gameState.currentTurn.charAt(0).toUpperCase() + gameState.currentTurn.slice(1);

    // Update captured pieces
    updateCapturedPieces();

    // Update move history
    updateMoveHistory();
}

function updateCapturedPieces() {
    const capturedWhite = document.getElementById('capturedWhite');
    const capturedBlack = document.getElementById('capturedBlack');

    capturedWhite.innerHTML = gameState.capturedPieces.white
        .map(piece => `<span class="captured-piece">${PIECES.white[piece.type]}</span>`)
        .join('');

    capturedBlack.innerHTML = gameState.capturedPieces.black
        .map(piece => `<span class="captured-piece">${PIECES.black[piece.type]}</span>`)
        .join('');
}

function updateMoveHistory() {
    const moveHistory = document.getElementById('moveHistory');

    if (gameState.moveHistory.length === 0) {
        moveHistory.innerHTML = '<div class="no-moves">No moves yet</div>';
    } else {
        moveHistory.innerHTML = gameState.moveHistory
            .map((move, index) => `
                <div class="move-entry">
                    <span class="move-number">${index + 1}.</span>
                    <span>${move}</span>
                </div>
            `)
            .reverse()
            .join('');
    }
}

function showGameMessage(message, type = 'info') {
    const gameMessage = document.getElementById('gameMessage');
    gameMessage.textContent = message;

    if (type === 'victory') {
        gameMessage.style.color = '#22c55e';
        gameMessage.style.fontWeight = 'bold';
        gameMessage.style.fontSize = '1.1rem';
    } else if (type === 'warning') {
        gameMessage.style.color = '#eab308';
        gameMessage.style.fontWeight = 'bold';
    } else {
        gameMessage.style.color = 'var(--text-secondary)';
        gameMessage.style.fontWeight = 'normal';
        gameMessage.style.fontSize = '0.95rem';
    }
}

function getPieceSymbol(piece) {
    return PIECES[piece.color][piece.type];
}

// ===================================
// EVENT LISTENERS
// ===================================

// ===================================
// AUDIO HANDLING
// ===================================

function initializeAudio() {
    const bgMusic = document.getElementById('bgMusic');
    const muteBtn = document.getElementById('muteBtn');
    const volumeSlider = document.getElementById('volumeSlider');

    if (!bgMusic || !muteBtn || !volumeSlider) return;

    // Set initial volume
    bgMusic.volume = volumeSlider.value;

    // Try to autoplay
    const playAudio = () => {
        bgMusic.play().then(() => {
            // Once played, remove listeners
            document.removeEventListener('click', playAudio);
            document.removeEventListener('keydown', playAudio);
        }).catch(err => {
            console.log("Autoplay blocked. Waiting for interaction.");
        });
    };

    // Browsers block autoplay without interaction
    document.addEventListener('click', playAudio);
    document.addEventListener('keydown', playAudio);

    muteBtn.addEventListener('click', () => {
        if (bgMusic.paused) {
            bgMusic.play();
            muteBtn.textContent = '🔊';
        } else {
            bgMusic.pause();
            muteBtn.textContent = '🔇';
        }
    });

    volumeSlider.addEventListener('input', (e) => {
        bgMusic.volume = e.target.value;
        if (bgMusic.volume === 0) {
            muteBtn.textContent = '🔇';
        } else if (bgMusic.paused) {
            // If they move slider while paused, keep it muted icon
            muteBtn.textContent = '🔇';
        } else {
            muteBtn.textContent = '🔊';
        }
    });
}

function playSound(type) {
    const bgMusic = document.getElementById('bgMusic');
    const sfx = {
        move: document.getElementById('sfxMove'),
        capture: document.getElementById('sfxCapture'),
        check: document.getElementById('sfxCheck'),
        victory: document.getElementById('sfxVictory')
    };

    const sound = sfx[type];
    if (sound) {
        const volumeSlider = document.getElementById('volumeSlider');
        sound.volume = volumeSlider ? volumeSlider.value : 0.3;

        const muteBtn = document.getElementById('muteBtn');
        if (muteBtn && muteBtn.textContent === '🔇') {
            return;
        }

        sound.currentTime = 0;
        sound.play().catch(e => console.log("SFX play blocked"));
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initializeGame();
    initializeAudio();

    const newGameBtn = document.getElementById('newGameBtn');
    if (newGameBtn) {
        newGameBtn.addEventListener('click', () => {
            if (confirm('Start a new game? Current progress will be lost.')) {
                initializeGame();
                showGameMessage('New game started! Good luck!', 'info');
            }
        });
    }
});

// ===================================
// UTILITY FUNCTIONS
// ===================================

// Prevent text selection during gameplay
document.addEventListener('selectstart', (e) => {
    if (e.target.closest('.chess-board')) {
        e.preventDefault();
    }
});
