# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Premium Chess is a browser-based chess game with three modes: AI (vs Stockfish), online multiplayer (Firebase), and local two-player.

**Tech Stack:** Vanilla JavaScript (ES6+), HTML5, CSS3. No build tools or package managers.

## Running the Project

This is a static web project. Simply open `index.html` in a web browser.

No build process, no npm install, no test runner.

## File Structure

```
index.html        # Main HTML with game layout and overlays
script.js         # Core chess logic (move validation, check/mate detection, timers)
ai.js            # Stockfish AI integration (difficulty levels, move calculation)
multiplayer.js   # Firebase Realtime Database for online play
style.css        # All styling (CSS variables, dark theme, responsive)
```

## Architecture

### Game State (`script.js`)
Centralized `gameState` object tracks:
- Board position (8x8 array)
- Current turn, selected square, valid moves
- Captured pieces, move history
- King positions (for check detection)
- Castling rights and piece movement history
- Game mode flags (`isOnline`, `isAI`, `myColor`, `aiColor`)
- Timers

### Move Validation
- `calculateValidMoves(row, col)` - entry point, filters moves that would expose king
- Piece-specific functions: `getPawnMoves`, `getRookMoves`, etc.
- `wouldMoveExposeKing()` - simulates move to check if king becomes attacked
- `isKingInCheck()` - scans all opponent pieces to see if they can attack king

### Special Moves
- **Castling:** Checked in `getKingMoves()`. Requires king and rook unmoved, clear path, not in check.
- **Pawn Promotion:** Auto-promotes to queen when reaching rank 0/1.
- **En Passant:** Not implemented.

### AI Mode (`ai.js`)
- Uses Stockfish.js v10.0.2 loaded via CDN
- Difficulty 1-10 maps to Stockfish search depth
- Player can choose white or black
- `triggerAiMove()` called when it's AI's turn

### Multiplayer Mode (`multiplayer.js`)
- Firebase Realtime Database syncs board state
- Game code (6-character) for joining
- Host chooses color, joiner gets opposite
- URL param `?game=CODE` for auto-join via shareable link
- Only current player can move (enforced by UI)

### Timer System
- Configurable presets: 5min, 10min, 30min, 45min, custom
- `setInitialTime(mins)` sets both clocks
- `startTimer()` counts down for current player
- `switchTimer()` called after each move
- Timeout ends game immediately

## Version Management

- `GAME_VERSION` constant in `script.js` (currently `v1.1.7`)
- Auto-displays in header and entry overlay
- Update this constant when making releases

## Firebase Configuration

Multiplayer requires Firebase config in `multiplayer.js`. The `firebaseConfig` object must be populated with your project's credentials. Do not commit real credentials.

## Audio

Background music and sound effects use external URLs (lichess for SFX, soundhelix for music). Volume sliders control music and SFX independently.
