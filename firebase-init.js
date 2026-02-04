// ===================================
// FIREBASE INITIALIZATION
// ===================================
// This file MUST be loaded before auth.js to ensure Firebase is initialized
// before any auth operations are attempted.

console.log("[FIREBASE] Initializing Firebase...");

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

// Initialize Firebase (only once)
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
    console.log("[FIREBASE] Firebase initialized successfully");
} else {
    console.log("[FIREBASE] Firebase already initialized");
}

// Export database reference for use in other modules
window.firebaseDatabase = firebase.database();
