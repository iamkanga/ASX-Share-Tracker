/*
 * File: script.js
 * Version: 116
 * Last Updated: 2025-06-27
 *
 * Description:
 * This script powers the Share Tracker web application, managing UI interactions,
 * data persistence with Firebase Firestore, and various utility functions.
 * It handles adding, editing, displaying, and deleting share data, managing watchlists,
 * and providing calculator functionalities. The script is designed with a focus on
 * responsiveness, user experience, and real-time data synchronization.
 *
 * Key Features:
 * - Firebase Authentication (Anonymous and Google Sign-In).
 * - Firestore integration for real-time data storage and retrieval.
 * - Dynamic rendering of share data in both table (desktop) and card (mobile) views.
 * - Watchlist management (add, edit, select, delete).
 * - Share details view with external links.
 * - Dividend and Standard calculator functionalities.
 * - Theme toggling with multiple vivid themes.
 * - Responsive UI adjustments for different screen sizes.
 * - Offline support via Service Worker (registration handled here).
 * - Custom dialog/alert system to replace browser's alert/confirm.
 * - Improved caching strategy with versioning for all assets.
 */

// Global Firebase and Firestore instances, exposed from index.html
let db;
let auth;
let firestore;
let authFunctions;
let currentAppId;

// UI Elements
const ui = {
    shareTableBody: document.querySelector('#shareTable tbody'),
    mobileShareCardsContainer: document.getElementById('mobileShareCards'),
    shareFormSection: document.getElementById('shareFormSection'),
    shareDetailModal: document.getElementById('shareDetailModal'),
    addWatchlistModal: document.getElementById('addWatchlistModal'),
    manageWatchlistModal: document.getElementById('manageWatchlistModal'),
    dividendCalculatorModal: document.getElementById('dividendCalculatorModal'),
    calculatorModal: document.getElementById('calculatorModal'),
    customDialogModal: document.getElementById('customDialogModal'),
    customDialogMessage: document.getElementById('customDialogMessage'),
    customDialogConfirmBtn: document.getElementById('customDialogConfirmBtn'),
    customDialogCancelBtn: document.getElementById('customDialogCancelBtn'),
    watchlistSelect: document.getElementById('watchlistSelect'),
    sortSelect: document.getElementById('sortSelect'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    appSidebar: document.getElementById('appSidebar'),
    closeMenuBtn: document.getElementById('closeMenuBtn'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    newShareBtn: document.getElementById('newShareBtn'),
    addShareHeaderBtn: document.getElementById('addShareHeaderBtn'),
    addWatchlistBtn: document.getElementById('addWatchlistBtn'),
    editWatchlistBtn: document.getElementById('editWatchlistBtn'),
    standardCalcBtn: document.getElementById('standardCalcBtn'),
    dividendCalcBtn: document.getElementById('dividendCalcBtn'),
    themeToggleBtn: document.getElementById('themeToggleBtn'),
    scrollToTopBtn: document.getElementById('scrollToTopBtn'),
    loadingIndicator: document.getElementById('loadingIndicator'),
    mainTitle: document.getElementById('mainTitle'),
    asxCodeButtonsContainer: document.getElementById('asxCodeButtonsContainer') // New container for ASX code buttons
};

// Application State
const appState = {
    shares: [],
    watchlists: [],
    currentWatchlistId: 'allShares', // Default to 'All Shares'
    selectedShareId: null,
    currentUserId: null,
    isAuthReady: false,
    theme: 'light-theme', // Default theme
    userPreferences: {
        theme: 'light-theme',
        selectedWatchlistId: 'allShares',
        sortOrder: 'entryDate-desc'
    },
    calculator: {
        input: '',
        result: '0',
        operator: null,
        prevValue: null,
        resetResult: false
    }
};

// Constants
const COLLECTIONS = {
    SHARES: 'shares',
    WATCHLISTS: 'watchlists',
    USER_PREFERENCES: 'preferences' // Renamed to 'preferences' as per your Firestore structure
};

const DEFAULT_WATCHLISTS = [
    { id: 'allShares', name: 'All Shares', isDefault: true },
    { id: 'myWatchlist', name: 'My Watchlist', isDefault: true }
];

// --- Utility Functions ---

/**
 * Displays a custom dialog modal with a message and optional confirm/cancel buttons.
 * Replaces browser's native alert/confirm.
 * @param {string} message - The message to display.
 * @param {boolean} showCancel - Whether to show the cancel button.
 * @returns {Promise<boolean>} - Resolves to true if confirmed, false if cancelled.
 */
async function showCustomDialog(message, showCancel = false) {
    return new Promise(resolve => {
        ui.customDialogMessage.textContent = message;
        ui.customDialogCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
        ui.customDialogModal.style.display = 'block';
        document.body.classList.add('modal-open');

        const confirmHandler = () => {
            ui.customDialogModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            ui.customDialogConfirmBtn.removeEventListener('click', confirmHandler);
            ui.customDialogCancelBtn.removeEventListener('click', cancelHandler);
            resolve(true);
        };

        const cancelHandler = () => {
            ui.customDialogModal.style.display = 'none';
            document.body.classList.remove('modal-open');
            ui.customDialogConfirmBtn.removeEventListener('click', confirmHandler);
            ui.customDialogCancelBtn.removeEventListener('click', cancelHandler);
            resolve(false);
        };

        ui.customDialogConfirmBtn.addEventListener('click', confirmHandler);
        ui.customDialogCancelBtn.addEventListener('click', cancelHandler);
    });
}

/**
 * Formats a number as a currency string (e.g., $1,234.56).
 * @param {number} amount - The number to format.
 * @returns {string} - Formatted currency string.
 */
function formatCurrency(amount) {
    if (typeof amount !== 'number' || isNaN(amount)) {
        return '-';
    }
    return new Intl.NumberFormat('en-AU', {
        style: 'currency',
        currency: 'AUD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}

/**
 * Formats a number as a percentage string (e.g., 12.34%).
 * @param {number} value - The number to format.
 * @returns {string} - Formatted percentage string.
 */
function formatPercentage(value) {
    if (typeof value !== 'number' || isNaN(value)) {
        return '-';
    }
    return new Intl.NumberFormat('en-AU', {
        style: 'percent',
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    }).format(value / 100); // Divide by 100 as input is 0-100
}

/**
 * Formats a date object into a readable string (e.g., "DD/MM/YYYY HH:MM").
 * @param {Date} date - The date object to format.
 * @returns {string} - Formatted date string.
 */
function formatDate(date) {
    if (!(date instanceof Date) || isNaN(date)) {
        return '-';
    }
    const options = { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false };
    return date.toLocaleString('en-AU', options);
}

/**
 * Calculates the unfranked dividend yield.
 * @param {number} dividendAmount - Annual dividend amount per share.
 * @param {number} currentPrice - Current share price.
 * @returns {number} - Unfranked yield as a percentage.
 */
function calculateUnfrankedYield(dividendAmount, currentPrice) {
    if (currentPrice <= 0 || isNaN(dividendAmount) || isNaN(currentPrice)) {
        return 0;
    }
    return (dividendAmount / currentPrice) * 100;
}

/**
 * Calculates the franked dividend yield.
 * @param {number} unfrankedYield - The unfranked yield (as a percentage).
 * @param {number} frankingCredits - Franking credits percentage (0-100).
 * @returns {number} - Franked yield as a percentage.
 */
function calculateFrankedYield(unfrankedYield, frankingCredits) {
    if (isNaN(unfrankedYield) || isNaN(frankingCredits)) {
        return 0;
    }
    // Convert franking credits to a decimal (e.g., 70% -> 0.7)
    const frankingDecimal = frankingCredits / 100;
    // Gross-up factor for 30% company tax rate
    const grossUpFactor = 1 / (1 - 0.3);
    return unfrankedYield * (1 + (frankingDecimal * grossUpFactor));
}

/**
 * Calculates the estimated annual dividend for a given investment value.
 * @param {number} dividendAmount - Annual dividend amount per share.
 * @param {number} currentPrice - Current share price.
 * @param {number} investmentValue - Total investment value.
 * @returns {number} - Estimated annual dividend.
 */
function calculateEstimatedAnnualDividend(dividendAmount, currentPrice, investmentValue) {
    if (currentPrice <= 0 || isNaN(dividendAmount) || isNaN(currentPrice) || isNaN(investmentValue)) {
        return 0;
    }
    const numberOfShares = investmentValue / currentPrice;
    return numberOfShares * dividendAmount;
}

/**
 * Generates external links for a given share code.
 * @param {string} shareCode - The ASX share code.
 * @returns {object} - An object containing URLs for MarketIndex, Fool, and CommSec.
 */
function generateExternalLinks(shareCode) {
    const encodedCode = encodeURIComponent(shareCode.toUpperCase());
    return {
        marketIndex: `https://www.marketindex.com.au/asx/${encodedCode}`,
        fool: `https://www.fool.com.au/quote/${encodedCode}/`,
        commSec: `https://www.commsec.com.au/market-insights/company-research/ASX-${encodedCode}.html`
    };
}

/**
 * Debounce function to limit the rate at which a function can fire.
 * @param {Function} func - The function to debounce.
 * @param {number} delay - The delay in milliseconds.
 * @returns {Function} - The debounced function.
 */
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

// --- Firebase Initialization and Authentication ---

/**
 * Initializes Firebase instances from global variables exposed by index.html.
 * Displays an error if Firebase is not properly initialized.
 */
function initializeFirebase() {
    if (window.firestoreDb && window.firebaseAuth && window.firestore && window.authFunctions && window.getFirebaseAppId) {
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        firestore = window.firestore;
        authFunctions = window.authFunctions;
        currentAppId = window.getFirebaseAppId();
        console.log("Firebase: Instances retrieved from global scope.");
    } else {
        console.error("Firebase: Global instances not found. Displaying error message.");
        const errorDiv = document.getElementById('firebaseInitError');
        if (errorDiv) {
            errorDiv.style.display = 'block';
        }
    }
}

/**
 * Handles user authentication state changes.
 * Signs in anonymously if no user is logged in.
 * Updates UI based on authentication status.
 */
async function setupAuthListener() {
    if (!auth || !authFunctions) {
        console.error("Auth or authFunctions not available for listener setup.");
        return;
    }

    authFunctions.onAuthStateChanged(auth, async (user) => {
        if (user) {
            appState.currentUserId = user.uid;
            console.log("Firebase: User signed in:", user.uid, `(${user.isAnonymous ? 'Anonymous' : 'Authenticated'})`);
            ui.googleAuthBtn.textContent = 'Sign Out';
            ui.googleAuthBtn.classList.add('signed-in');
            appState.isAuthReady = true;
            await loadUserPreferences(); // Load preferences after auth is ready
            await loadWatchlists();
            await loadShares();
        } else {
            appState.currentUserId = null;
            console.log("User signed out. Attempting anonymous sign-in...");
            ui.googleAuthBtn.textContent = 'Sign In';
            ui.googleAuthBtn.classList.remove('signed-in');
            appState.isAuthReady = false; // Set to false until new sign-in
            // Clear existing data when signed out
            appState.shares = [];
            appState.watchlists = [];
            ui.shareTableBody.innerHTML = '';
            ui.mobileShareCardsContainer.innerHTML = '';
            populateWatchlistSelect(); // Clear watchlist dropdown
            ui.mainTitle.textContent = 'Share Watchlist'; // Reset title

            try {
                // Check if __initial_auth_token is available (Canvas environment)
                if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                    await authFunctions.signInWithCustomToken(auth, __initial_auth_token);
                    console.log("Firebase: Signed in with custom token.");
                } else {
                    // Fallback to anonymous sign-in if not in Canvas or token is missing
                    await authFunctions.signInAnonymously(auth);
                    console.log("Firebase: Signed in anonymously.");
                }
            } catch (error) {
                console.error("Firebase: Anonymous sign-in failed:", error);
                await showCustomDialog("Failed to sign in. Some features may not be available. Please check your internet connection.", false);
            }
        }
    });
}

/**
 * Handles Google Sign-In/Sign-Out.
 */
async function handleGoogleAuth() {
    if (!auth || !authFunctions) {
        await showCustomDialog("Authentication services are not available.", false);
        return;
    }

    if (auth.currentUser && !auth.currentUser.isAnonymous) {
        // User is signed in with Google, so sign out
        try {
            await authFunctions.signOut(auth);
            console.log("Firebase: User signed out.");
            await showCustomDialog("You have been signed out.", false);
        } catch (error) {
            console.error("Firebase: Error signing out:", error);
            await showCustomDialog("Error signing out. Please try again.", false);
        }
    } else {
        // User is anonymous or signed out, sign in with Google
        try {
            const provider = authFunctions.GoogleAuthProviderInstance;
            await authFunctions.signInWithPopup(auth, provider);
            console.log("Firebase: Signed in with Google.");
            // onAuthStateChanged listener will handle UI update and data loading
        } catch (error) {
            console.error("Firebase: Google sign-in failed:", error);
            if (error.code === 'auth/popup-closed-by-user') {
                await showCustomDialog("Google sign-in was cancelled.", false);
            } else {
                await showCustomDialog(`Google sign-in failed: ${error.message}`, false);
            }
        }
    }
}

// --- User Preferences ---

/**
 * Gets the document reference for user preferences.
 * Uses the user-specific path: artifacts/{appId}/users/{userId}/preferences/app_settings
 * @returns {object} - Firestore document reference.
 */
function getUserPreferencesDocRef() {
    if (!db || !appState.currentUserId) return null;

    // Path confirmed by user: artifacts/{appId}/users/{userId}/preferences/app_settings
    return firestore.doc(db, `artifacts/${currentAppId}/users/${appState.currentUserId}/${COLLECTIONS.USER_PREFERENCES}/app_settings`);
}

/**
 * Loads user preferences from Firestore.
 * If no preferences are found, default preferences are used.
 */
async function loadUserPreferences() {
    if (!appState.isAuthReady || !db || !firestore || !appState.currentUserId) {
        console.warn("Firebase not ready or no user ID to load preferences.");
        return;
    }

    const userPrefsDocRef = getUserPreferencesDocRef();
    if (!userPrefsDocRef) {
        console.error("Could not get user preferences document reference.");
        return;
    }

    try {
        const docSnap = await firestore.getDoc(userPrefsDocRef);
        if (docSnap.exists()) {
            appState.userPreferences = { ...appState.userPreferences, ...docSnap.data() };
            console.log("User preferences loaded:", appState.userPreferences);
        } else {
            console.log("No user preferences found. Using defaults.");
            // Save default preferences if none exist
            await saveUserPreferences();
        }
        applyUserPreferences();
    } catch (error) {
        console.error("Error loading user preferences:", error);
        await showCustomDialog("Failed to load user preferences. Using default settings.", false);
    }
}

/**
 * Saves current user preferences to Firestore.
 */
async function saveUserPreferences() {
    if (!appState.isAuthReady || !db || !firestore || !appState.currentUserId) {
        console.warn("Firebase not ready or no user ID to save preferences.");
        return;
    }

    const userPrefsDocRef = getUserPreferencesDocRef();
    if (!userPrefsDocRef) {
        console.error("Could not get user preferences document reference for saving.");
        return;
    }

    try {
        await firestore.setDoc(userPrefsDocRef, appState.userPreferences, { merge: true });
        console.log("User preferences saved:", appState.userPreferences);
    } catch (error) {
        console.error("Error saving user preferences:", error);
        await showCustomDialog("Failed to save user preferences.", false);
    }
}

/**
 * Applies the loaded user preferences to the UI.
 */
function applyUserPreferences() {
    // Apply theme
    document.body.className = appState.userPreferences.theme;
    appState.theme = appState.userPreferences.theme; // Update appState theme

    // Apply selected watchlist
    // This will be set after watchlists are loaded and populated
    appState.currentWatchlistId = appState.userPreferences.selectedWatchlistId;
    if (ui.watchlistSelect.value !== appState.currentWatchlistId) {
        ui.watchlistSelect.value = appState.currentWatchlistId;
    }

    // Apply sort order
    ui.sortSelect.value = appState.userPreferences.sortOrder;
}


// --- Watchlist Management ---

/**
 * Gets the collection reference for watchlists.
 * Uses the user-specific path: artifacts/{appId}/users/{userId}/watchlists
 * @returns {object} - Firestore collection reference.
 */
function getWatchlistsCollectionRef() {
    if (!db || !appState.currentUserId) return null;

    // Path confirmed by user: artifacts/{appId}/users/{userId}/watchlists
    return firestore.collection(db, `artifacts/${currentAppId}/users/${appState.currentUserId}/${COLLECTIONS.WATCHLISTS}`);
}

/**
 * Loads watchlists from Firestore and sets up a real-time listener.
 * Populates the watchlist select dropdown.
 */
async function loadWatchlists() {
    if (!appState.isAuthReady || !db || !firestore || !appState.currentUserId) {
        console.warn("Firebase not ready or no user ID to load watchlists.");
        return;
    }

    const watchlistsColRef = getWatchlistsCollectionRef();
    if (!watchlistsColRef) {
        console.error("Could not get watchlists collection reference.");
        return;
    }

    // Set up real-time listener for watchlists
    firestore.onSnapshot(watchlistsColRef, (snapshot) => {
        const fetchedWatchlists = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Ensure default watchlists are always present
        appState.watchlists = [...DEFAULT_WATCHLISTS];
        fetchedWatchlists.forEach(wl => {
            if (!appState.watchlists.some(dwl => dwl.id === wl.id)) {
                appState.watchlists.push(wl);
            }
        });

        console.log("Watchlists fetched:", appState.watchlists.length);
        populateWatchlistSelect();

        // If the current watchlist is no longer available (e.g., deleted), reset to 'All Shares'
        if (!appState.watchlists.some(wl => wl.id === appState.currentWatchlistId)) {
            appState.currentWatchlistId = 'allShares';
            appState.userPreferences.selectedWatchlistId = 'allShares';
            saveUserPreferences(); // Save the updated preference
        }
        ui.watchlistSelect.value = appState.currentWatchlistId;
        updateMainTitle(); // Update title based on selected watchlist
        loadShares(); // Reload shares for the current watchlist
    }, (error) => {
        console.error("Error fetching watchlists:", error);
        showCustomDialog("Failed to load watchlists. Please check your connection.", false);
    });
}

/**
 * Populates the watchlist select dropdown with available watchlists.
 */
function populateWatchlistSelect() {
    ui.watchlistSelect.innerHTML = ''; // Clear existing options

    // Sort watchlists alphabetically by name, keeping defaults at the top
    const sortedWatchlists = [...appState.watchlists].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
    });

    sortedWatchlists.forEach(watchlist => {
        const option = document.createElement('option');
        option.value = watchlist.id;
        option.textContent = watchlist.name;
        ui.watchlistSelect.appendChild(option);
    });

    // Set the selected value after options are populated
    ui.watchlistSelect.value = appState.currentWatchlistId;
}

/**
 * Handles adding a new watchlist.
 */
async function handleAddWatchlist() {
    const newWatchlistNameInput = document.getElementById('newWatchlistName');
    const newWatchlistName = newWatchlistNameInput.value.trim();

    if (!newWatchlistName) {
        await showCustomDialog("Watchlist name cannot be empty.", false);
        return;
    }

    if (appState.watchlists.some(wl => wl.name.toLowerCase() === newWatchlistName.toLowerCase())) {
        await showCustomDialog("A watchlist with this name already exists.", false);
        return;
    }

    if (!db || !firestore || !appState.currentUserId) {
        await showCustomDialog("Firebase not ready. Cannot add watchlist.", false);
        return;
    }

    const watchlistsColRef = getWatchlistsCollectionRef();
    if (!watchlistsColRef) {
        await showCustomDialog("Cannot access watchlists collection.", false);
        return;
    }

    try {
        await firestore.addDoc(watchlistsColRef, {
            name: newWatchlistName,
            createdAt: new Date(),
            isDefault: false // User-added watchlists are not default
        });
        await showCustomDialog(`Watchlist "${newWatchlistName}" added successfully!`, false);
        newWatchlistNameInput.value = ''; // Clear input
        closeModal(ui.addWatchlistModal);
    } catch (error) {
        console.error("Error adding watchlist:", error);
        await showCustomDialog("Failed to add watchlist. Please try again.", false);
    }
}

/**
 * Handles editing the current watchlist's name or deleting it.
 */
async function handleManageWatchlist() {
    const currentWatchlist = appState.watchlists.find(wl => wl.id === appState.currentWatchlistId);

    if (!currentWatchlist || currentWatchlist.isDefault) {
        await showCustomDialog("Default watchlists ('All Shares', 'My Watchlist') cannot be edited or deleted.", false);
        return;
    }

    const editWatchlistNameInput = document.getElementById('editWatchlistName');
    editWatchlistNameInput.value = currentWatchlist.name;
    ui.manageWatchlistModal.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Saves the edited watchlist name.
 */
async function saveEditedWatchlistName() {
    const editWatchlistNameInput = document.getElementById('editWatchlistName');
    const newName = editWatchlistNameInput.value.trim();
    const currentWatchlist = appState.watchlists.find(wl => wl.id === appState.currentWatchlistId);

    if (!currentWatchlist || currentWatchlist.isDefault) {
        await showCustomDialog("Default watchlists cannot be renamed.", false);
        return;
    }

    if (!newName) {
        await showCustomDialog("Watchlist name cannot be empty.", false);
        return;
    }

    if (appState.watchlists.some(wl => wl.name.toLowerCase() === newName.toLowerCase() && wl.id !== currentWatchlist.id)) {
        await showCustomDialog("A watchlist with this name already exists.", false);
        return;
    }

    if (!db || !firestore || !appState.currentUserId) {
        await showCustomDialog("Firebase not ready. Cannot update watchlist.", false);
        return;
    }

    const watchlistDocRef = firestore.doc(getWatchlistsCollectionRef(), currentWatchlist.id);

    try {
        await firestore.updateDoc(watchlistDocRef, { name: newName });
        await showCustomDialog(`Watchlist "${currentWatchlist.name}" renamed to "${newName}" successfully!`, false);
        closeModal(ui.manageWatchlistModal);
    } catch (error) {
        console.error("Error updating watchlist name:", error);
        await showCustomDialog("Failed to rename watchlist. Please try again.", false);
    }
}

/**
 * Deletes the current watchlist and moves its shares to 'All Shares'.
 */
async function deleteCurrentWatchlist() {
    const currentWatchlist = appState.watchlists.find(wl => wl.id === appState.currentWatchlistId);

    if (!currentWatchlist || currentWatchlist.isDefault) {
        await showCustomDialog("Default watchlists cannot be deleted.", false);
        return;
    }

    const confirmDelete = await showCustomDialog(`Are you sure you want to delete the watchlist "${currentWatchlist.name}"? All shares in this watchlist will be moved to "All Shares". This action cannot be undone.`, true);
    if (!confirmDelete) {
        return;
    }

    if (!db || !firestore || !appState.currentUserId) {
        await showCustomDialog("Firebase not ready. Cannot delete watchlist.", false);
        return;
    }

    const sharesColRef = getSharesCollectionRef();
    const watchlistDocRef = firestore.doc(getWatchlistsCollectionRef(), currentWatchlist.id);

    try {
        // Start a batch write
        const batch = firestore.writeBatch(db);

        // 1. Find all shares in this watchlist and update their watchlistId to 'allShares'
        const q = firestore.query(sharesColRef, firestore.where('watchlistId', '==', currentWatchlist.id));
        const querySnapshot = await firestore.getDocs(q);

        querySnapshot.forEach((doc) => {
            const shareRef = firestore.doc(sharesColRef, doc.id);
            batch.update(shareRef, { watchlistId: 'allShares' });
        });

        // 2. Delete the watchlist document
        batch.delete(watchlistDocRef);

        // Commit the batch
        await batch.commit();

        await showCustomDialog(`Watchlist "${currentWatchlist.name}" deleted and shares moved to "All Shares".`, false);
        appState.currentWatchlistId = 'allShares'; // Switch to 'All Shares'
        appState.userPreferences.selectedWatchlistId = 'allShares';
        await saveUserPreferences();
        closeModal(ui.manageWatchlistModal);
        // loadWatchlists will be triggered by snapshot listener, which will then trigger loadShares
    } catch (error) {
        console.error("Error deleting watchlist:", error);
        await showCustomDialog("Failed to delete watchlist. Please try again.", false);
    }
}

// --- Share Data Management ---

/**
 * Gets the collection reference for shares.
 * Uses the user-specific path: artifacts/{appId}/users/{userId}/shares
 * @returns {object} - Firestore collection reference.
 */
function getSharesCollectionRef() {
    if (!db || !appState.currentUserId) return null;

    // Path confirmed by user: artifacts/{appId}/users/{userId}/shares
    return firestore.collection(db, `artifacts/${currentAppId}/users/${appState.currentUserId}/${COLLECTIONS.SHARES}`);
}

/**
 * Loads shares from Firestore based on the current watchlist and sort order.
 * Sets up a real-time listener for shares.
 */
async function loadShares() {
    if (!appState.isAuthReady || !db || !firestore || !appState.currentUserId) {
        console.warn("Firebase not ready or no user ID to load shares.");
        return;
    }

    ui.loadingIndicator.style.display = 'block';
    ui.shareTableBody.innerHTML = '';
    ui.mobileShareCardsContainer.innerHTML = '';

    const sharesColRef = getSharesCollectionRef();
    if (!sharesColRef) {
        console.error("Could not get shares collection reference.");
        ui.loadingIndicator.style.display = 'none';
        return;
    }

    let q = sharesColRef;

    if (appState.currentWatchlistId !== 'allShares') {
        q = firestore.query(q, firestore.where('watchlistId', '==', appState.currentWatchlistId));
    }

    // No orderBy in Firestore query to avoid index issues. Sort in memory.

    // Set up real-time listener for shares
    firestore.onSnapshot(q, (snapshot) => {
        appState.shares = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            entryDate: doc.data().entryDate?.toDate ? doc.data().entryDate.toDate() : new Date(doc.data().entryDate) // Convert Firestore Timestamp to Date
        }));
        console.log("Shares fetched:", appState.shares.length);
        sortAndRenderShares(); // Sort and render whenever data changes
        ui.loadingIndicator.style.display = 'none';
        populateAsxCodeButtons(); // Populate ASX code buttons after shares are loaded
    }, (error) => {
        console.error("Error fetching shares:", error);
        showCustomDialog("Failed to load shares. Please check your connection.", false);
        ui.loadingIndicator.style.display = 'none';
    });
}

/**
 * Sorts the shares based on the current sort order and then renders them.
 */
function sortAndRenderShares() {
    const [sortBy, sortDirection] = appState.userPreferences.sortOrder.split('-');

    const sortedShares = [...appState.shares].sort((a, b) => {
        let valA, valB;

        switch (sortBy) {
            case 'entryDate':
                valA = a.entryDate ? a.entryDate.getTime() : 0;
                valB = b.entryDate ? b.entryDate.getTime() : 0;
                break;
            case 'shareName':
                valA = a.shareName.toLowerCase();
                valB = b.shareName.toLowerCase();
                break;
            case 'dividendAmount':
                valA = a.dividendAmount || 0;
                valB = b.dividendAmount || 0;
                break;
            default:
                valA = a.entryDate ? a.entryDate.getTime() : 0;
                valB = b.entryDate ? b.entryDate.getTime() : 0;
                break;
        }

        if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
        if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
        return 0;
    });

    renderShares(sortedShares);
}

/**
 * Renders the shares into the table (desktop) and mobile cards.
 * @param {Array} sharesToRender - The array of share objects to render.
 */
function renderShares(sharesToRender) {
    ui.shareTableBody.innerHTML = '';
    ui.mobileShareCardsContainer.innerHTML = '';

    if (sharesToRender.length === 0) {
        ui.shareTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No shares found in this watchlist.</td></tr>';
        ui.mobileShareCardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--label-color);">No shares found in this watchlist.</p>';
        return;
    }

    sharesToRender.forEach(share => {
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.currentPrice);
        const frankedYield = calculateFrankedYield(unfrankedYield, share.frankingCredits);

        // Desktop Table Row
        const row = ui.shareTableBody.insertRow();
        row.dataset.id = share.id;
        row.innerHTML = `
            <td>${share.shareName}</td>
            <td>${formatCurrency(share.currentPrice)}</td>
            <td>${formatCurrency(share.targetPrice)}</td>
            <td>
                <span class="unfranked-yield">${formatCurrency(share.dividendAmount)} (${unfrankedYield.toFixed(2)}%)</span>
                <span class="franked-yield">Gross: ${frankedYield.toFixed(2)}%</span>
            </td>
            <td>${share.comments && share.comments.length > 0 ? share.comments[0].text : '-'}</td>
        `;
        row.addEventListener('click', () => selectShare(share.id));
        row.addEventListener('dblclick', () => showShareDetails(share.id));

        // Mobile Card
        const card = document.createElement('div');
        card.classList.add('mobile-card');
        card.dataset.id = share.id;
        card.innerHTML = `
            <h3>${share.shareName}</h3>
            <p><strong>Entered Price:</strong> ${formatCurrency(share.currentPrice)}</p>
            <p><strong>Target Price:</strong> ${formatCurrency(share.targetPrice)}</p>
            <p><strong>Dividends:</strong> ${formatCurrency(share.dividendAmount)} (${unfrankedYield.toFixed(2)}% / Gross: ${frankedYield.toFixed(2)}%)</p>
            <p><strong>Comments:</strong> ${share.comments && share.comments.length > 0 ? share.comments[0].text : '-'}</p>
        `;
        card.addEventListener('click', () => selectShare(share.id));
        card.addEventListener('dblclick', () => showShareDetails(share.id));
        ui.mobileShareCardsContainer.appendChild(card);

        // Apply selected class if this share is currently selected
        if (appState.selectedShareId === share.id) {
            row.classList.add('selected');
            card.classList.add('selected');
        }
    });
}

/**
 * Selects a share in the UI (highlights row/card).
 * @param {string} shareId - The ID of the share to select.
 */
function selectShare(shareId) {
    // Remove 'selected' class from previously selected elements
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected'));

    if (appState.selectedShareId === shareId) {
        // Deselect if clicking the same share again
        appState.selectedShareId = null;
    } else {
        // Select new share
        appState.selectedShareId = shareId;
        document.querySelector(`#shareTable tbody tr[data-id="${shareId}"]`)?.classList.add('selected');
        document.querySelector(`#mobileShareCards .mobile-card[data-id="${shareId}"]`)?.classList.add('selected');
    }
}

/**
 * Opens the share form modal for adding a new share.
 */
function openAddShareForm() {
    appState.selectedShareId = null; // Clear any selected share
    document.querySelectorAll('.selected').forEach(el => el.classList.remove('selected')); // Deselect UI
    resetShareForm();
    document.getElementById('formTitle').textContent = 'Add New Share';
    document.getElementById('deleteShareFromFormBtn').style.display = 'none'; // Hide delete button for new share
    ui.shareFormSection.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Opens the share form modal for editing an existing share.
 * @param {string} shareId - The ID of the share to edit.
 */
function openEditShareForm(shareId) {
    const share = appState.shares.find(s => s.id === shareId);
    if (!share) {
        showCustomDialog("Share not found for editing.", false);
        return;
    }

    resetShareForm();
    document.getElementById('formTitle').textContent = 'Edit Share';
    document.getElementById('deleteShareFromFormBtn').style.display = 'inline-flex'; // Show delete button for existing share

    // Populate form fields
    document.getElementById('shareName').value = share.shareName || '';
    document.getElementById('currentPrice').value = share.currentPrice || '';
    document.getElementById('targetPrice').value = share.targetPrice || '';
    document.getElementById('dividendAmount').value = share.dividendAmount || '';
    document.getElementById('frankingCredits').value = share.frankingCredits || '';

    const commentsContainer = document.getElementById('commentsFormContainer');
    commentsContainer.innerHTML = '<h3>Comments <button type="button" id="addCommentSectionBtn" class="add-section-btn">+</button></h3>'; // Reset comments
    document.getElementById('addCommentSectionBtn').addEventListener('click', addCommentSection); // Re-add listener

    if (share.comments && share.comments.length > 0) {
        share.comments.forEach(comment => {
            addCommentSection(comment.date, comment.text);
        });
    } else {
        addCommentSection(); // Add one empty comment section if none exist
    }

    appState.selectedShareId = shareId; // Set selected share for saving
    ui.shareFormSection.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Resets the share form fields and comments.
 */
function resetShareForm() {
    document.getElementById('shareName').value = '';
    document.getElementById('currentPrice').value = '';
    document.getElementById('targetPrice').value = '';
    document.getElementById('dividendAmount').value = '';
    document.getElementById('frankingCredits').value = '';

    const commentsContainer = document.getElementById('commentsFormContainer');
    commentsContainer.innerHTML = '<h3>Comments <button type="button" id="addCommentSectionBtn" class="add-section-btn">+</button></h3>'; // Reset comments
    document.getElementById('addCommentSectionBtn').addEventListener('click', addCommentSection); // Re-add listener
    addCommentSection(); // Add one empty comment section by default
}

/**
 * Adds a new comment section to the share form.
 * @param {Date} [date=new Date()] - Optional date for the comment.
 * @param {string} [text=''] - Optional text for the comment.
 */
function addCommentSection(date = new Date(), text = '') {
    const commentsContainer = document.getElementById('commentsFormContainer');
    const commentSection = document.createElement('div');
    commentSection.classList.add('comment-section');
    commentSection.innerHTML = `
        <button type="button" class="comment-delete-btn">&times;</button>
        <label>Date:</label>
        <input type="datetime-local" class="comment-date" value="${formatDateForInput(date)}">
        <label>Comment:</label>
        <textarea class="comment-text" placeholder="Enter your comment here...">${text}</textarea>
    `;
    commentsContainer.appendChild(commentSection);

    commentSection.querySelector('.comment-delete-btn').addEventListener('click', (event) => {
        event.stopPropagation(); // Prevent modal from closing if this is inside a modal
        commentSection.remove();
    });
}

/**
 * Formats a Date object into 'YYYY-MM-DDTHH:MM' for datetime-local input.
 * @param {Date} date - The Date object.
 * @returns {string} - Formatted string.
 */
function formatDateForInput(date) {
    if (!date) return '';
    const year = date.getFullYear();
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Saves a new or updated share to Firestore.
 */
async function saveShare() {
    const shareName = document.getElementById('shareName').value.trim();
    const currentPrice = parseFloat(document.getElementById('currentPrice').value);
    const targetPrice = parseFloat(document.getElementById('targetPrice').value);
    const dividendAmount = parseFloat(document.getElementById('dividendAmount').value);
    const frankingCredits = parseFloat(document.getElementById('frankingCredits').value);

    if (!shareName) {
        await showCustomDialog("Share Code is required.", false);
        return;
    }
    if (isNaN(currentPrice) || isNaN(targetPrice) || isNaN(dividendAmount) || isNaN(frankingCredits)) {
        await showCustomDialog("Please enter valid numbers for all price and dividend fields.", false);
        return;
    }

    const comments = [];
    document.querySelectorAll('.comment-section').forEach(section => {
        const dateInput = section.querySelector('.comment-date');
        const textInput = section.querySelector('.comment-text');
        const commentDate = dateInput.value ? new Date(dateInput.value) : new Date();
        const commentText = textInput.value.trim();
        if (commentText) {
            comments.push({ date: commentDate, text: commentText });
        }
    });

    const shareData = {
        shareName: shareName.toUpperCase(), // Store in uppercase
        currentPrice: currentPrice,
        targetPrice: targetPrice,
        dividendAmount: dividendAmount,
        frankingCredits: frankingCredits,
        comments: comments,
        watchlistId: appState.currentWatchlistId // Assign to current watchlist
    };

    if (!db || !firestore || !appState.currentUserId) {
        await showCustomDialog("Firebase not ready. Cannot save share.", false);
        return;
    }

    const sharesColRef = getSharesCollectionRef();
    if (!sharesColRef) {
        await showCustomDialog("Cannot access shares collection.", false);
        return;
    }

    try {
        if (appState.selectedShareId) {
            // Update existing share
            const shareDocRef = firestore.doc(sharesColRef, appState.selectedShareId);
            await firestore.updateDoc(shareDocRef, shareData);
            await showCustomDialog("Share updated successfully!", false);
        } else {
            // Add new share
            shareData.entryDate = new Date(); // Set entry date only for new shares
            await firestore.addDoc(sharesColRef, shareData);
            await showCustomDialog("Share added successfully!", false);
        }
        closeModal(ui.shareFormSection);
        appState.selectedShareId = null; // Clear selected share after save
    } catch (error) {
        console.error("Error saving share:", error);
        await showCustomDialog("Failed to save share. Please try again.", false);
    }
}

/**
 * Deletes the currently selected share.
 */
async function deleteShare() {
    if (!appState.selectedShareId) {
        await showCustomDialog("No share selected to delete.", false);
        return;
    }

    const shareToDelete = appState.shares.find(s => s.id === appState.selectedShareId);
    if (!shareToDelete) {
        await showCustomDialog("Share not found for deletion.", false);
        return;
    }

    const confirmDelete = await showCustomDialog(`Are you sure you want to delete "${shareToDelete.shareName}"? This action cannot be undone.`, true);
    if (!confirmDelete) {
        return;
    }

    if (!db || !firestore || !appState.currentUserId) {
        await showCustomDialog("Firebase not ready. Cannot delete share.", false);
        return;
    }

    const sharesColRef = getSharesCollectionRef();
    const shareDocRef = firestore.doc(sharesColRef, appState.selectedShareId);

    try {
        await firestore.deleteDoc(shareDocRef);
        await showCustomDialog("Share deleted successfully!", false);
        closeModal(ui.shareFormSection);
        appState.selectedShareId = null; // Clear selected share after deletion
    } catch (error) {
        console.error("Error deleting share:", error);
        await showCustomDialog("Failed to delete share. Please try again.", false);
    }
}

/**
 * Displays the details of a specific share in a modal.
 * @param {string} shareId - The ID of the share to display.
 */
function showShareDetails(shareId) {
    const share = appState.shares.find(s => s.id === shareId);
    if (!share) {
        showCustomDialog("Share details not found.", false);
        return;
    }

    // Select the share in the UI
    selectShare(shareId);

    document.getElementById('modalShareName').textContent = share.shareName;
    document.getElementById('modalEntryDate').textContent = formatDate(share.entryDate);
    document.getElementById('modalEnteredPrice').textContent = formatCurrency(share.currentPrice);
    document.getElementById('modalTargetPrice').textContent = formatCurrency(share.targetPrice);
    document.getElementById('modalDividendAmount').textContent = formatCurrency(share.dividendAmount);
    document.getElementById('modalFrankingCredits').textContent = `${share.frankingCredits || 0}%`;

    const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.currentPrice);
    const frankedYield = calculateFrankedYield(unfrankedYield, share.frankingCredits);
    document.getElementById('modalUnfrankedYield').textContent = `${unfrankedYield.toFixed(2)}%`;
    document.getElementById('modalFrankedYield').textContent = `${frankedYield.toFixed(2)}%`;

    // Populate comments
    const modalCommentsContainer = document.getElementById('modalCommentsContainer');
    modalCommentsContainer.innerHTML = '<h3>Comments</h3>'; // Clear previous comments
    if (share.comments && share.comments.length > 0) {
        share.comments.sort((a, b) => (b.date?.toDate ? b.date.toDate().getTime() : new Date(b.date).getTime()) - (a.date?.toDate ? a.date.toDate().getTime() : new Date(a.date).getTime())) // Sort by date descending
            .forEach(comment => {
                const commentElement = document.createElement('div');
                commentElement.classList.add('modal-comment-item');
                const commentDate = comment.date?.toDate ? comment.date.toDate() : new Date(comment.date); // Handle Firestore Timestamp
                commentElement.innerHTML = `
                    <strong>${formatDate(commentDate)}</strong>
                    <p>${comment.text}</p>
                `;
                modalCommentsContainer.appendChild(commentElement);
            });
    } else {
        modalCommentsContainer.innerHTML += '<p>No comments for this share.</p>';
    }

    // Generate and set external links
    const links = generateExternalLinks(share.shareName);
    document.getElementById('modalMarketIndexLink').href = links.marketIndex;
    document.getElementById('modalFoolLink').href = links.fool;
    document.getElementById('modalCommSecLink').href = links.commSec;

    // Set selected share ID for potential editing from details modal
    appState.selectedShareId = shareId;
    ui.shareDetailModal.style.display = 'block';
    document.body.classList.add('modal-open');
}

/**
 * Populates the ASX code buttons container with unique share codes.
 */
function populateAsxCodeButtons() {
    ui.asxCodeButtonsContainer.innerHTML = ''; // Clear existing buttons
    const uniqueCodes = [...new Set(appState.shares.map(share => share.shareName))].sort(); // Get unique sorted codes

    uniqueCodes.forEach(code => {
        const button = document.createElement('button');
        button.classList.add('asx-code-btn');
        button.textContent = code;
        button.dataset.code = code;
        button.addEventListener('click', () => filterSharesByCode(code));
        ui.asxCodeButtonsContainer.appendChild(button);
    });
}

/**
 * Filters shares by the selected ASX code.
 * @param {string} code - The ASX code to filter by.
 */
function filterSharesByCode(code) {
    // Toggle active class on buttons
    document.querySelectorAll('.asx-code-btn').forEach(btn => {
        if (btn.dataset.code === code && !btn.classList.contains('active')) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });

    const filteredShares = appState.shares.filter(share => share.shareName === code);
    renderShares(filteredShares);
}

// --- Calculator Functions (Standard) ---

/**
 * Handles clicks on the standard calculator buttons.
 * @param {Event} event - The click event.
 */
function handleCalculatorButtonClick(event) {
    const button = event.target.closest('.calc-btn');
    if (!button) return;

    const { action, value } = button.dataset;
    const { calculator } = appState;

    if (action) {
        switch (action) {
            case 'clear':
                calculator.input = '';
                calculator.result = '0';
                calculator.operator = null;
                calculator.prevValue = null;
                calculator.resetResult = false;
                break;
            case 'percentage':
                if (calculator.result !== '0') {
                    calculator.result = (parseFloat(calculator.result) / 100).toString();
                    calculator.input = calculator.result;
                }
                break;
            case 'calculate':
                if (calculator.operator && calculator.prevValue !== null) {
                    calculator.result = evaluate(calculator.prevValue, parseFloat(calculator.result), calculator.operator).toString();
                    calculator.input = calculator.result;
                    calculator.operator = null;
                    calculator.prevValue = null;
                    calculator.resetResult = true;
                }
                break;
            case 'add':
            case 'subtract':
            case 'multiply':
            case 'divide':
                if (calculator.operator && calculator.prevValue !== null && !calculator.resetResult) {
                    calculator.result = evaluate(calculator.prevValue, parseFloat(calculator.result), calculator.operator).toString();
                    calculator.input = calculator.result + actionToSymbol(action);
                    calculator.prevValue = parseFloat(calculator.result);
                } else {
                    calculator.prevValue = parseFloat(calculator.result);
                    calculator.input = calculator.result + actionToSymbol(action);
                }
                calculator.operator = action;
                calculator.resetResult = true;
                break;
        }
    } else if (value) {
        if (calculator.resetResult) {
            calculator.result = value;
            calculator.input = value;
            calculator.resetResult = false;
        } else {
            if (calculator.result === '0' && value !== '.') {
                calculator.result = value;
                calculator.input = calculator.input.slice(0, -1) + value; // Replace last operator
            } else if (value === '.' && calculator.result.includes('.')) {
                // Do nothing if decimal already exists
            } else {
                calculator.result += value;
                calculator.input += value;
            }
        }
    }
    updateCalculatorDisplay();
}

/**
 * Converts a calculator action string to its corresponding symbol.
 * @param {string} action - The action string (e.g., 'add').
 * @returns {string} - The symbol (e.g., '+').
 */
function actionToSymbol(action) {
    switch (action) {
        case 'add': return '+';
        case 'subtract': return '-';
        case 'multiply': return '×';
        case 'divide': return '÷';
        default: return '';
    }
}

/**
 * Evaluates a simple arithmetic expression.
 * @param {number} num1 - First number.
 * @param {number} num2 - Second number.
 * @param {string} operator - The operator (add, subtract, multiply, divide).
 * @returns {number} - The result of the operation.
 */
function evaluate(num1, num2, operator) {
    switch (operator) {
        case 'add': return num1 + num2;
        case 'subtract': return num1 - num2;
        case 'multiply': return num1 * num2;
        case 'divide': return num2 !== 0 ? num1 / num2 : 0; // Handle division by zero
        default: return num2;
    }
}

/**
 * Updates the display of the standard calculator.
 */
function updateCalculatorDisplay() {
    document.getElementById('calculatorInput').textContent = appState.calculator.input;
    document.getElementById('calculatorResult').textContent = appState.calculator.result;
}

// --- Calculator Functions (Dividend) ---

/**
 * Calculates and displays dividend yields.
 */
const calculateDividendYields = debounce(() => {
    const currentPrice = parseFloat(document.getElementById('calcCurrentPrice').value);
    const dividendAmount = parseFloat(document.getElementById('calcDividendAmount').value);
    const frankingCredits = parseFloat(document.getElementById('calcFrankingCredits').value);
    const investmentValue = parseFloat(document.getElementById('investmentValueSelect').value);

    const unfrankedYield = calculateUnfrankedYield(dividendAmount, currentPrice);
    const frankedYield = calculateFrankedYield(unfrankedYield, frankingCredits);
    const estimatedDividend = calculateEstimatedAnnualDividend(dividendAmount, currentPrice, investmentValue);

    document.getElementById('calcUnfrankedYield').textContent = `${unfrankedYield.toFixed(2)}%`;
    document.getElementById('calcFrankedYield').textContent = `${frankedYield.toFixed(2)}%`;
    document.getElementById('calcEstimatedDividend').textContent = formatCurrency(estimatedDividend);
}, 200); // Debounce to prevent excessive calculations on input

/**
 * Resets dividend calculator fields.
 */
function resetDividendCalculator() {
    document.getElementById('calcCurrentPrice').value = '';
    document.getElementById('calcDividendAmount').value = '';
    document.getElementById('calcFrankingCredits').value = '';
    document.getElementById('investmentValueSelect').value = '10000'; // Reset to default
    document.getElementById('calcUnfrankedYield').textContent = '-';
    document.getElementById('calcFrankedYield').textContent = '-';
    document.getElementById('calcEstimatedDividend').textContent = '-';
}

// --- UI Event Handlers ---

/**
 * Closes a given modal.
 * @param {HTMLElement} modalElement - The modal element to close.
 */
function closeModal(modalElement) {
    modalElement.style.display = 'none';
    document.body.classList.remove('modal-open');
}

/**
 * Updates the main header title based on the selected watchlist.
 */
function updateMainTitle() {
    const selectedWatchlist = appState.watchlists.find(wl => wl.id === appState.currentWatchlistId);
    if (selectedWatchlist) {
        ui.mainTitle.textContent = selectedWatchlist.name;
    } else {
        ui.mainTitle.textContent = 'Share Watchlist'; // Fallback
    }
}

/**
 * Toggles the application theme. Cycles through available themes.
 */
function toggleTheme() {
    const themes = [
        'light-theme', 'dark-theme', 'orange-theme', 'green-theme', 'blue-theme',
        'purple-theme', 'red-theme', 'cyan-theme', 'magenta-theme', 'lime-theme',
        'teal-theme', 'indigo-theme', 'pink-theme', 'brown-theme', 'amber-theme',
        'deep-orange-theme', 'light-green-theme', 'deep-purple-theme',
        'grey-blue-theme', 'warm-grey-theme', 'dark-cyan-theme'
    ];
    const currentIndex = themes.indexOf(appState.theme);
    const nextIndex = (currentIndex + 1) % themes.length;
    appState.theme = themes[nextIndex];
    document.body.className = appState.theme;
    appState.userPreferences.theme = appState.theme;
    saveUserPreferences();
}

/**
 * Handles the scroll-to-top button visibility.
 */
function handleScrollToTopButton() {
    if (document.body.scrollTop > 20 || document.documentElement.scrollTop > 20) {
        ui.scrollToTopBtn.style.display = "flex"; // Use flex to center icon
    } else {
        ui.scrollToTopBtn.style.display = "none";
    }
}

/**
 * Scrolls the window to the top.
 */
function scrollToTop() {
    window.scrollTo({
        top: 0,
        behavior: 'smooth'
    });
}

// --- Service Worker Registration ---

/**
 * Registers the service worker for offline capabilities.
 */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Updated path to include repository name for GitHub Pages
            navigator.serviceWorker.register('/ASX-Share-Tracker/service-worker.js?v=32') 
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', async () => {
    console.log("script.js (v116) loaded and DOMContentLoaded fired."); // Updated version number
    initializeFirebase();
    registerServiceWorker(); // Register service worker early

    if (auth && authFunctions) {
        await setupAuthListener(); // This will trigger initial data load
    } else {
        console.error("Firebase Auth not available. Cannot set up auth listener.");
        await showCustomDialog("Firebase authentication is not available. Please check your configuration.", false);
    }

    // Header Buttons
    ui.hamburgerBtn.addEventListener('click', () => {
        ui.appSidebar.classList.add('open');
        ui.sidebarOverlay.classList.add('open');
        document.body.classList.add('sidebar-active');
    });
    ui.addShareHeaderBtn.addEventListener('click', openAddShareForm);

    // Sidebar Buttons
    ui.closeMenuBtn.addEventListener('click', () => {
        ui.appSidebar.classList.remove('open');
        ui.sidebarOverlay.classList.remove('open');
        document.body.classList.remove('sidebar-active');
    });
    ui.sidebarOverlay.addEventListener('click', () => {
        ui.appSidebar.classList.remove('open');
        ui.sidebarOverlay.classList.remove('open');
        document.body.classList.remove('sidebar-active');
    });

    // Close menu after action if data-action-closes-menu is true
    document.querySelectorAll('.menu-button-item').forEach(button => {
        button.addEventListener('click', (event) => {
            if (event.target.dataset.actionClosesMenu === 'true') {
                ui.appSidebar.classList.remove('open');
                ui.sidebarOverlay.classList.remove('open');
                document.body.classList.remove('sidebar-active');
            }
        });
    });

    ui.newShareBtn.addEventListener('click', openAddShareForm);
    ui.addWatchlistBtn.addEventListener('click', () => {
        document.getElementById('newWatchlistName').value = ''; // Clear input
        ui.addWatchlistModal.style.display = 'block';
        document.body.classList.add('modal-open');
    });
    ui.editWatchlistBtn.addEventListener('click', handleManageWatchlist);
    ui.standardCalcBtn.addEventListener('click', () => {
        appState.calculator = { input: '', result: '0', operator: null, prevValue: null, resetResult: false }; // Reset calculator state
        updateCalculatorDisplay();
        ui.calculatorModal.style.display = 'block';
        document.body.classList.add('modal-open');
    });
    ui.dividendCalcBtn.addEventListener('click', () => {
        resetDividendCalculator(); // Reset dividend calculator fields
        ui.dividendCalculatorModal.style.display = 'block';
        document.body.classList.add('modal-open');
    });
    ui.themeToggleBtn.addEventListener('click', toggleTheme);


    // Watchlist & Sort Selects
    ui.watchlistSelect.addEventListener('change', (event) => {
        appState.currentWatchlistId = event.target.value;
        appState.userPreferences.selectedWatchlistId = appState.currentWatchlistId;
        saveUserPreferences(); // Save the new selection
        updateMainTitle(); // Update title immediately
        loadShares(); // Reload shares for the new watchlist
    });

    ui.sortSelect.addEventListener('change', (event) => {
        appState.userPreferences.sortOrder = event.target.value;
        saveUserPreferences(); // Save the new sort order
        sortAndRenderShares(); // Re-sort and re-render shares
    });

    // Share Form Modal Buttons
    document.querySelector('#shareFormSection .form-close-button').addEventListener('click', () => closeModal(ui.shareFormSection));
    document.getElementById('cancelFormBtn').addEventListener('click', () => closeModal(ui.shareFormSection));
    document.getElementById('saveShareBtn').addEventListener('click', saveShare);
    document.getElementById('deleteShareFromFormBtn').addEventListener('click', deleteShare);
    document.getElementById('addCommentSectionBtn').addEventListener('click', addCommentSection); // Initial listener for comments

    // Share Detail Modal Buttons
    document.querySelector('#shareDetailModal .close-button').addEventListener('click', () => closeModal(ui.shareDetailModal));
    document.getElementById('editShareFromDetailBtn').addEventListener('click', () => {
        closeModal(ui.shareDetailModal);
        if (appState.selectedShareId) {
            openEditShareForm(appState.selectedShareId);
        } else {
            showCustomDialog("No share selected to edit.", false);
        }
    });

    // Add Watchlist Modal Buttons
    document.querySelector('#addWatchlistModal .close-button').addEventListener('click', () => closeModal(ui.addWatchlistModal));
    document.getElementById('cancelAddWatchlistBtn').addEventListener('click', () => closeModal(ui.addWatchlistModal));
    document.getElementById('saveWatchlistBtn').addEventListener('click', handleAddWatchlist);

    // Manage Watchlist Modal Buttons
    document.querySelector('#manageWatchlistModal .close-button').addEventListener('click', () => closeModal(ui.manageWatchlistModal));
    document.getElementById('cancelManageWatchlistBtn').addEventListener('click', () => closeModal(ui.manageWatchlistModal));
    document.getElementById('saveWatchlistNameBtn').addEventListener('click', saveEditedWatchlistName);
    document.getElementById('deleteWatchlistInModalBtn').addEventListener('click', deleteCurrentWatchlist);

    // Dividend Calculator Inputs
    document.getElementById('calcCurrentPrice').addEventListener('input', calculateDividendYields);
    document.getElementById('calcDividendAmount').addEventListener('input', calculateDividendYields);
    document.getElementById('calcFrankingCredits').addEventListener('input', calculateDividendYields);
    document.getElementById('investmentValueSelect').addEventListener('change', calculateDividendYields);
    document.querySelector('#dividendCalculatorModal .calc-close-button').addEventListener('click', () => closeModal(ui.dividendCalculatorModal));

    // Standard Calculator Buttons
    document.querySelector('#calculatorModal .close-button').addEventListener('click', () => closeModal(ui.calculatorModal));
    document.querySelector('.calculator-buttons').addEventListener('click', handleCalculatorButtonClick);

    // Google Auth Button
    ui.googleAuthBtn.addEventListener('click', handleGoogleAuth);

    // Scroll-to-top button
    window.addEventListener('scroll', handleScrollToTopButton);
    ui.scrollToTopBtn.addEventListener('click', scrollToTop);
});
