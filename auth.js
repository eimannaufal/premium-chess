// ===================================
// AUTHENTICATION MODULE - FIREBASE AUTH
// ===================================

console.log("[AUTH] Module loaded...");

// Auth State
let currentUser = null;
let userStats = {
    wins: 0,
    losses: 0,
    draws: 0
};

// ===================================
// AUTH INITIALIZATION
// ===================================

function initializeAuth() {
    console.log("[AUTH] Initializing Firebase Auth...");

    // Verify Firebase is initialized
    if (!firebase.apps.length) {
        console.error("[AUTH] Firebase not initialized! firebase-init.js must be loaded before auth.js");
        return;
    }

    // Set up auth state observer
    firebase.auth().onAuthStateChanged((user) => {
        if (user) {
            // User is signed in
            currentUser = user;
            console.log("[AUTH] User signed in:", user.displayName);

            // Load user stats from database
            loadUserStats(user.uid);

            // Update UI
            updateAuthUI(user);
        } else {
            // User is signed out
            currentUser = null;
            userStats = { wins: 0, losses: 0, draws: 0 };
            console.log("[AUTH] User signed out");

            // Update UI
            updateAuthUI(null);
        }
    });

    // Set up click handlers for auth buttons
    setupAuthButtons();
}

// ===================================
// AUTH FUNCTIONS
// ===================================

function signInWithGoogle() {
    console.log("[AUTH] Initiating Google sign-in...");

    const provider = new firebase.auth.GoogleAuthProvider();

    firebase.auth().signInWithPopup(provider)
        .then((result) => {
            console.log("[AUTH] Sign-in successful:", result.user.displayName);

            // Create user stats if not exists
            createUserStats(result.user.uid, result.user);
        })
        .catch((error) => {
            console.error("[AUTH] Sign-in error:", error);
            showAuthError(error.message);
        });
}

function signOut() {
    console.log("[AUTH] Signing out...");

    firebase.auth().signOut()
        .then(() => {
            console.log("[AUTH] Sign-out successful");
        })
        .catch((error) => {
            console.error("[AUTH] Sign-out error:", error);
        });
}

// ===================================
// USER STATS FUNCTIONS
// ===================================

function loadUserStats(userId) {
    const statsRef = firebase.database().ref('users/' + userId + '/stats');

    statsRef.once('value').then((snapshot) => {
        const data = snapshot.val();
        if (data) {
            userStats = {
                wins: data.wins || 0,
                losses: data.losses || 0,
                draws: data.draws || 0
            };
            console.log("[AUTH] User stats loaded:", userStats);
            updateStatsDisplay();
        } else {
            // Initialize stats for new user
            userStats = { wins: 0, losses: 0, draws: 0 };
            updateStatsDisplay();
        }
    }).catch((error) => {
        console.error("[AUTH] Error loading stats:", error);
    });
}

function createUserStats(userId, user) {
    const userRef = firebase.database().ref('users/' + userId);

    userRef.once('value').then((snapshot) => {
        if (!snapshot.exists()) {
            // Create new user entry
            userRef.set({
                displayName: user.displayName,
                email: user.email,
                photoURL: user.photoURL,
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                stats: {
                    wins: 0,
                    losses: 0,
                    draws: 0
                }
            });
            console.log("[AUTH] Created new user stats");
        }
    });
}

function recordGameResult(result) {
    if (!currentUser) {
        console.log("[AUTH] No user logged in, skipping stats update");
        return;
    }

    console.log("[AUTH] Recording game result:", result);

    const statsRef = firebase.database().ref('users/' + currentUser.uid + '/stats');

    // Update local stats
    if (result === 'win') {
        userStats.wins++;
    } else if (result === 'loss') {
        userStats.losses++;
    } else if (result === 'draw') {
        userStats.draws++;
    }

    // Update in database
    statsRef.update(userStats)
        .then(() => {
            console.log("[AUTH] Stats updated successfully:", userStats);
            updateStatsDisplay();
        })
        .catch((error) => {
            console.error("[AUTH] Error updating stats:", error);
        });
}

// ===================================
// UI FUNCTIONS
// ===================================

function setupAuthButtons() {
    // Wait for DOM to be ready
    const setupBtns = () => {
        const signInBtn = document.getElementById('authSignInBtn');
        const signOutBtn = document.getElementById('authSignOutBtn');

        if (signInBtn) {
            signInBtn.onclick = signInWithGoogle;
        }

        if (signOutBtn) {
            signOutBtn.onclick = signOut;
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupBtns);
    } else {
        setupBtns();
    }
}

function updateAuthUI(user) {
    // Start Overlay Elements
    const authSignedIn = document.getElementById('authSignedIn');
    const authSignedOut = document.getElementById('authSignedOut');
    const authUserAvatar = document.getElementById('authUserAvatar');
    const authUserName = document.getElementById('authUserName');
    const authUserEmail = document.getElementById('authUserEmail');

    // Header Profile Indicator
    const headerProfile = document.getElementById('userProfileIndicator');
    const headerAvatar = document.getElementById('headerUserAvatar');

    if (user) {
        // User is signed in
        if (authSignedIn) authSignedIn.style.display = 'flex';
        if (authSignedOut) authSignedOut.style.display = 'none';

        if (authUserAvatar && user.photoURL) {
            authUserAvatar.src = user.photoURL;
        } else if (authUserAvatar) {
            authUserAvatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
        }

        if (authUserName) authUserName.textContent = user.displayName || 'Player';
        if (authUserEmail) authUserEmail.textContent = user.email || '';

        // Header profile indicator
        if (headerProfile && headerAvatar) {
            headerProfile.style.display = 'block';
            if (user.photoURL) {
                headerAvatar.src = user.photoURL;
            } else {
                headerAvatar.src = 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="%236366f1"%3E%3Cpath d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/%3E%3C/svg%3E';
            }
        }
    } else {
        // User is signed out
        if (authSignedIn) authSignedIn.style.display = 'none';
        if (authSignedOut) authSignedOut.style.display = 'flex';

        if (headerProfile) headerProfile.style.display = 'none';
    }
}

function updateStatsDisplay() {
    if (!currentUser) return;

    const authWins = document.getElementById('authWins');
    const authLosses = document.getElementById('authLosses');
    const authDraws = document.getElementById('authDraws');

    if (authWins) authWins.textContent = userStats.wins;
    if (authLosses) authLosses.textContent = userStats.losses;
    if (authDraws) authDraws.textContent = userStats.draws;
}

function showAuthError(message) {
    // Show error message to user
    const gameMessage = document.getElementById('gameMessage');
    if (gameMessage) {
        gameMessage.textContent = `Auth Error: ${message}`;
        gameMessage.style.color = '#ef4444';
        setTimeout(() => {
            gameMessage.textContent = 'Make your move';
            gameMessage.style.color = 'var(--text-secondary)';
        }, 3000);
    }
}

// ===================================
// EXPORTED FUNCTIONS
// ===================================

// Expose functions for use in other modules
window.AuthModule = {
    getCurrentUser: () => currentUser,
    getUserId: () => currentUser ? currentUser.uid : null,
    getUserName: () => currentUser ? currentUser.displayName : null,
    isSignedIn: () => currentUser !== null,
    recordGameResult: recordGameResult
};

// ===================================
// INITIALIZATION
// ===================================

// Initialize auth when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAuth);
} else {
    initializeAuth();
}
