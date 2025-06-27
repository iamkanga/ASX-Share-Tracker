/*
 * File: script.js
 * Version: 113
 * Last Updated: 2025-06-27
 *
 * Description:
 * This script provides the core functionality for the Share Tracker web application.
 * It integrates with Firebase Firestore for data storage (shares, watchlists, user preferences)
 * and Firebase Authentication for user management (Google Sign-In, anonymous, custom token).
 *
 * Key Features:
 * - User Authentication: Google Sign-In and anonymous sign-in via custom token.
 * - Share Management: Add, edit, delete shares with details like code, entered price, target price,
 * dividend amount, franking credits, and comments.
 * - Watchlist Management: Create, select, edit, and delete custom watchlists.
 * - Real-time Data: Uses Firestore's onSnapshot for real-time updates to share and watchlist data.
 * - UI Rendering: Dynamically renders share data in a table for desktop and cards for mobile.
 * - Filtering & Sorting: Filters shares by selected watchlist and sorts them by various criteria.
 * - Calculators: Includes a standard calculator and a dividend yield calculator.
 * - Theming: Allows users to switch between multiple color themes (light, dark, and 18 new vivid themes).
 * - Responsive Design: Adapts UI for optimal viewing on desktop and mobile devices.
 * - Modals: Manages various modal dialogs for forms, details, and calculators.
 * - Scroll-to-Top Button: Provides quick navigation back to the top of the page.
 * - Error Handling: Displays messages for Firebase initialization issues.
 *
 * Global Variables from index.html (window object):
 * - firestoreDb: Firebase Firestore instance.
 * - firebaseAuth: Firebase Auth instance.
 * - getFirebaseAppId(): Function to get the current Firebase project ID.
 * - firestore: Object containing Firestore functions (collection, doc, getDoc, etc.).
 * - authFunctions: Object containing Auth functions (GoogleAuthProviderInstance, signInAnonymously, etc.).
 * - __initial_auth_token: Custom auth token for initial anonymous sign-in (if available).
 */

document.addEventListener('DOMContentLoaded', async () => {
    console.log("script.js (v113) loaded and DOMContentLoaded fired."); // Updated version number

    // --- Firebase Initialization and Authentication Setup ---
    const db = window.firestoreDb;
    const auth = window.firebaseAuth;
    const currentAppId = window.getFirebaseAppId();
    const firestore = window.firestore;
    const authFns = window.authFunctions;

    let currentUser = null;
    let currentUserId = null;
    let isAuthReady = false; // Flag to indicate when auth state is known

    // UI Elements
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const mainTitle = document.getElementById('mainTitle');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const shareTableBody = document.querySelector('#shareTable tbody');
    const mobileShareCardsContainer = document.getElementById('mobileShareCards');
    const watchlistSelect = document.getElementById('watchlistSelect');
    const sortSelect = document.getElementById('sortSelect');
    const asxCodeButtonsContainer = document.getElementById('asxCodeButtonsContainer');

    // Modals and their elements
    const shareFormModal = document.getElementById('shareFormSection');
    const shareFormCloseBtn = shareFormModal.querySelector('.form-close-button');
    const formTitle = document.getElementById('formTitle');
    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsFormContainer = document.getElementById('commentsFormContainer');
    const addCommentSectionBtn = document.getElementById('addCommentSectionBtn');
    const saveShareBtn = document.getElementById('saveShareBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const deleteShareFromFormBtn = document.getElementById('deleteShareFromFormBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const shareDetailCloseBtn = shareDetailModal.querySelector('.close-button');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalEnteredPrice = document.getElementById('modalEnteredPrice');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalUnfrankedYield = document.getElementById('modalUnfrankedYield');
    const modalFrankedYield = document.getElementById('modalFrankedYield');
    const modalCommentsContainer = document.getElementById('modalCommentsContainer');
    const modalMarketIndexLink = document.getElementById('modalMarketIndexLink');
    const modalFoolLink = document.getElementById('modalFoolLink');
    const modalCommSecLink = document.getElementById('modalCommSecLink');
    const editShareFromDetailBtn = document.getElementById('editShareFromDetailBtn');

    const addWatchlistModal = document.getElementById('addWatchlistModal');
    const addWatchlistCloseBtn = addWatchlistModal.querySelector('.close-button');
    const newWatchlistNameInput = document.getElementById('newWatchlistName');
    const saveWatchlistBtn = document.getElementById('saveWatchlistBtn');
    const cancelAddWatchlistBtn = document.getElementById('cancelAddWatchlistBtn');

    const manageWatchlistModal = document.getElementById('manageWatchlistModal');
    const manageWatchlistCloseBtn = manageWatchlistModal.querySelector('.close-button');
    const editWatchlistNameInput = document.getElementById('editWatchlistName');
    const saveWatchlistNameBtn = document.getElementById('saveWatchlistNameBtn');
    const deleteWatchlistInModalBtn = document.getElementById('deleteWatchlistInModalBtn');
    const cancelManageWatchlistBtn = document.getElementById('cancelManageWatchlistBtn');

    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal');
    const dividendCalcCloseBtn = dividendCalculatorModal.querySelector('.close-button');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYield = document.getElementById('calcUnfrankedYield');
    const calcFrankedYield = document.getElementById('calcFrankedYield');
    const investmentValueSelect = document.getElementById('investmentValueSelect');
    const calcEstimatedDividend = document.getElementById('calcEstimatedDividend');

    const standardCalculatorModal = document.getElementById('calculatorModal');
    const standardCalcCloseBtn = standardCalculatorModal.querySelector('.close-button');
    const calculatorInput = document.getElementById('calculatorInput');
    const calculatorResult = document.getElementById('calculatorResult');
    const calculatorButtons = standardCalculatorModal.querySelector('.calculator-buttons');

    const customDialogModal = document.getElementById('customDialogModal');
    const customDialogMessage = document.getElementById('customDialogMessage');
    const customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    const customDialogCancelBtn = document.getElementById('customDialogCancelBtn');

    // Sidebar elements
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const appSidebar = document.getElementById('appSidebar');
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const newShareBtn = document.getElementById('newShareBtn');
    const addShareHeaderBtn = document.getElementById('addShareHeaderBtn'); // New header add share button
    const addWatchlistBtn = document.getElementById('addWatchlistBtn');
    const editWatchlistBtn = document.getElementById('editWatchlistBtn');
    const standardCalcBtn = document.getElementById('standardCalcBtn');
    const dividendCalcBtn = document.getElementById('dividendCalcBtn');
    const themeToggleBtn = document.getElementById('themeToggleBtn');

    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    // State variables
    let allShares = [];
    let currentWatchlists = [];
    let currentSelectedShareId = null;
    let currentSelectedWatchlistId = 'all'; // Default to 'all' shares
    let currentSortOrder = 'entryDate-desc'; // Default sort order
    let currentThemeIndex = 0; // Index for the current theme
    const themes = [
        '', // Default (Light)
        'dark-theme',
        'orange-theme',
        'green-theme',
        'blue-theme',
        'purple-theme',
        'red-theme',
        'cyan-theme',
        'magenta-theme',
        'lime-theme',
        'teal-theme',
        'indigo-theme',
        'pink-theme',
        'brown-theme',
        'amber-theme',
        'deep-orange-theme',
        'light-green-theme',
        'deep-purple-theme',
        'grey-blue-theme',
        'warm-grey-theme',
        'dark-cyan-theme'
    ];

    // --- Utility Functions ---

    /**
     * Shows a custom dialog modal with a message and configurable buttons.
     * @param {string} message - The message to display.
     * @param {boolean} showCancel - Whether to show the cancel button.
     * @returns {Promise<boolean>} Resolves true if confirmed, false if cancelled.
     */
    function showCustomDialog(message, showCancel = false) {
        return new Promise(resolve => {
            customDialogMessage.textContent = message;
            customDialogCancelBtn.style.display = showCancel ? 'inline-block' : 'none';
            customDialogModal.style.display = 'block';

            const confirmHandler = () => {
                customDialogModal.style.display = 'none';
                customDialogConfirmBtn.removeEventListener('click', confirmHandler);
                customDialogCancelBtn.removeEventListener('click', cancelHandler);
                resolve(true);
            };

            const cancelHandler = () => {
                customDialogModal.style.display = 'none';
                customDialogConfirmBtn.removeEventListener('click', confirmHandler);
                customDialogCancelBtn.removeEventListener('click', cancelHandler);
                resolve(false);
            };

            customDialogConfirmBtn.addEventListener('click', confirmHandler);
            customDialogCancelBtn.addEventListener('click', cancelHandler);
        });
    }

    /**
     * Formats a number as a currency string.
     * @param {number} value - The number to format.
     * @returns {string} Formatted currency string.
     */
    function formatCurrency(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return new Intl.NumberFormat('en-AU', {
            style: 'currency',
            currency: 'AUD'
        }).format(value);
    }

    /**
     * Formats a number as a percentage string.
     * @param {number} value - The number to format.
     * @returns {string} Formatted percentage string.
     */
    function formatPercentage(value) {
        if (value === null || value === undefined || isNaN(value)) {
            return '-';
        }
        return `${value.toFixed(2)}%`;
    }

    /**
     * Calculates the unfranked and franked dividend yields.
     * @param {number} currentPrice - The current share price.
     * @param {number} dividendAmount - The annual dividend amount per share.
     * @param {number} frankingCredits - The franking credits percentage (e.g., 70 for 70%).
     * @returns {{unfrankedYield: number, frankedYield: number}} Yields in percentage.
     */
    function calculateYields(currentPrice, dividendAmount, frankingCredits) {
        if (currentPrice <= 0 || dividendAmount <= 0) {
            return { unfrankedYield: 0, frankedYield: 0 };
        }

        const unfrankedYield = (dividendAmount / currentPrice) * 100;
        const grossUpFactor = 1 / (1 - (frankingCredits / 100) * 0.3); // 30% company tax rate
        const frankedYield = unfrankedYield * grossUpFactor;

        return { unfrankedYield, frankedYield };
    }

    /**
     * Opens a modal.
     * @param {HTMLElement} modalElement - The modal DOM element.
     */
    function openModal(modalElement) {
        modalElement.style.display = 'block';
        document.body.classList.add('modal-open'); // Add class to body to prevent scrolling
    }

    /**
     * Closes a modal.
     * @param {HTMLElement} modalElement - The modal DOM element.
     */
    function closeModal(modalElement) {
        modalElement.style.display = 'none';
        document.body.classList.remove('modal-open'); // Remove class from body
    }

    /**
     * Closes the sidebar menu.
     */
    function closeSidebar() {
        appSidebar.classList.remove('open');
        sidebarOverlay.classList.remove('open');
        document.body.classList.remove('sidebar-active');
    }

    /**
     * Toggles the sidebar menu.
     */
    function toggleSidebar() {
        appSidebar.classList.toggle('open');
        sidebarOverlay.classList.toggle('open');
        document.body.classList.toggle('sidebar-active');
    }

    /**
     * Applies the selected theme to the body.
     * @param {string} themeClass - The CSS class for the theme.
     */
    function applyTheme(themeClass) {
        document.body.className = themeClass; // Remove all existing theme classes and apply new one
        localStorage.setItem('selectedTheme', themeClass);
    }

    /**
     * Cycles through the available themes.
     */
    function cycleTheme() {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        applyTheme(themes[currentThemeIndex]);
    }

    /**
     * Loads the theme preference from local storage.
     */
    function loadThemePreference() {
        const savedTheme = localStorage.getItem('selectedTheme');
        if (savedTheme) {
            const index = themes.indexOf(savedTheme);
            if (index !== -1) {
                currentThemeIndex = index;
            } else {
                currentThemeIndex = 0; // Fallback to default if saved theme is invalid
            }
            applyTheme(themes[currentThemeIndex]);
        } else {
            applyTheme(themes[0]); // Apply default theme if no preference saved
        }
    }

    // --- Firebase Auth State Listener ---
    if (auth && authFns) {
        authFns.onAuthStateChanged(auth, async (user) => {
            currentUser = user;
            isAuthReady = true; // Auth state is now known

            if (currentUser) {
                currentUserId = currentUser.uid;
                mainTitle.textContent = `Share Watchlist (${currentUser.isAnonymous ? 'Guest' : currentUser.displayName || currentUser.email || 'User'})`;
                googleAuthBtn.textContent = 'Sign Out';
                googleAuthBtn.classList.add('signed-in');
                googleAuthBtn.removeEventListener('click', handleGoogleSignIn);
                googleAuthBtn.addEventListener('click', handleSignOut);
                console.log("Firebase: User signed in:", currentUser.uid, currentUser.isAnonymous ? "(Anonymous)" : "(Authenticated)");

                // Start listening to data only after auth is ready
                if (db && firestore) {
                    await fetchWatchlists();
                    await fetchShares();
                    // Load user preferences for theme and current watchlist
                    await loadUserPreferences(); // Await this to ensure preferences are loaded before other UI updates
                } else {
                    console.error("Firestore or Firestore functions not available after auth state change.");
                }
            } else {
                // User is signed out or not authenticated. Attempt anonymous sign-in.
                currentUserId = null;
                mainTitle.textContent = 'Share Watchlist';
                googleAuthBtn.textContent = 'Sign In';
                googleAuthBtn.classList.remove('signed-in');
                googleAuthBtn.removeEventListener('click', handleSignOut);
                googleAuthBtn.addEventListener('click', handleGoogleSignIn);
                console.log("Firebase: User signed out. Attempting anonymous sign-in...");

                if (authFns && db && firestore) {
                    try {
                        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
                            await authFns.signInWithCustomToken(auth, __initial_auth_token);
                            console.log("Firebase: Signed in anonymously with custom token.");
                        } else {
                            await authFns.signInAnonymously(auth);
                            console.log("Firebase: Signed in anonymously.");
                        }
                    } catch (error) {
                        console.error("Firebase: Anonymous sign-in failed:", error);
                        // If anonymous sign-in fails, ensure UI reflects no user
                        currentUserId = null;
                        mainTitle.textContent = 'Share Watchlist (Not Signed In)';
                        googleAuthBtn.textContent = 'Sign In';
                        googleAuthBtn.classList.remove('signed-in');
                        googleAuthBtn.removeEventListener('click', handleSignOut);
                        googleAuthBtn.addEventListener('click', handleGoogleSignIn);
                        showCustomDialog("Failed to sign in. Please try again later or sign in with Google.", false);
                    }
                } else {
                    console.error("Firebase Auth functions or Firestore not available for anonymous sign-in.");
                }
            }
            // Ensure loading indicator is hidden once auth state is processed
            loadingIndicator.style.display = 'none';
        });
    } else {
        console.error("Firebase Auth or Firestore is not available. Check Firebase initialization.");
        document.getElementById('firebaseInitError').style.display = 'block';
        loadingIndicator.style.display = 'none';
    }

    // --- Firebase Authentication Handlers ---

    /**
     * Handles Google Sign-In.
     */
    async function handleGoogleSignIn() {
        if (!auth || !authFns) {
            showCustomDialog("Firebase authentication is not available.", false);
            return;
        }
        try {
            const provider = authFns.GoogleAuthProviderInstance;
            await authFns.signInWithPopup(auth, provider);
            // onAuthStateChanged listener will handle UI updates
        } catch (error) {
            console.error("Google Sign-In failed:", error);
            showCustomDialog(`Google Sign-In failed: ${error.message}`, false);
        }
    }

    /**
     * Handles user sign out.
     */
    async function handleSignOut() {
        if (!auth || !authFns) {
            showCustomDialog("Firebase authentication is not available.", false);
            return;
        }
        const confirmed = await showCustomDialog("Are you sure you want to sign out?", true);
        if (confirmed) {
            try {
                await authFns.signOut(auth);
                // onAuthStateChanged listener will handle UI updates
                currentUserId = null;
                allShares = [];
                currentWatchlists = [];
                currentSelectedWatchlistId = 'all';
                renderShares();
                populateWatchlistDropdown();
                mainTitle.textContent = 'Share Watchlist';
                console.log("User signed out.");
            } catch (error) {
                console.error("Sign out failed:", error);
                showCustomDialog(`Sign out failed: ${error.message}`, false);
            }
        }
    }

    // --- Firestore Data Operations ---

    /**
     * Gets the Firestore collection path for shares.
     * @returns {string} The Firestore collection path.
     */
    function getSharesCollectionPath() {
        // Changed to public/data path based on user's existing data structure
        return `artifacts/${currentAppId}/public/data/shares`;
    }

    /**
     * Gets the Firestore collection path for watchlists.
     * @returns {string} The Firestore collection path.
     */
    function getWatchlistsCollectionPath() {
        // Changed to public/data path based on user's existing data structure
        return `artifacts/${currentAppId}/public/data/watchlists`;
    }

    /**
     * Fetches shares from Firestore in real-time.
     */
    async function fetchShares() {
        if (!db || !firestore || !currentUserId) { // currentUserId is still required for auth status
            console.warn("Firestore not ready or no user ID to fetch shares.");
            loadingIndicator.style.display = 'none';
            return;
        }

        loadingIndicator.style.display = 'block';
        const sharesColRef = firestore.collection(db, getSharesCollectionPath());
        const q = firestore.query(sharesColRef);

        firestore.onSnapshot(q, (snapshot) => {
            allShares = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Shares fetched:", allShares.length);
            renderShares();
            loadingIndicator.style.display = 'none';
        }, (error) => {
            console.error("Error fetching shares:", error);
            showCustomDialog(`Error fetching shares: ${error.message}`, false);
            loadingIndicator.style.display = 'none';
        });
    }

    /**
     * Fetches watchlists from Firestore in real-time.
     */
    async function fetchWatchlists() {
        if (!db || !firestore || !currentUserId) { // currentUserId is still required for auth status
            console.warn("Firestore not ready or no user ID to fetch watchlists.");
            return;
        }

        const watchlistsColRef = firestore.collection(db, getWatchlistsCollectionPath());
        const q = firestore.query(watchlistsColRef);

        firestore.onSnapshot(q, (snapshot) => {
            currentWatchlists = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            console.log("Watchlists fetched:", currentWatchlists.length);
            populateWatchlistDropdown();
        }, (error) => {
            console.error("Error fetching watchlists:", error);
            showCustomDialog(`Error fetching watchlists: ${error.message}`, false);
        });
    }

    /**
     * Saves a share to Firestore (add or update).
     * @param {object} shareData - The share data to save.
     * @param {string|null} shareId - The ID of the share if updating, null if adding.
     */
    async function saveShare(shareData, shareId = null) {
        if (!db || !firestore || !currentUserId) {
            showCustomDialog("Please sign in to save shares.", false);
            return;
        }
        try {
            const sharesColRef = firestore.collection(db, getSharesCollectionPath());
            if (shareId) {
                // Update existing share
                const shareDocRef = firestore.doc(sharesColRef, shareId);
                await firestore.setDoc(shareDocRef, shareData, { merge: true });
                console.log("Share updated successfully:", shareId);
                showCustomDialog("Share updated successfully!", false);
            } else {
                // Add new share
                await firestore.addDoc(sharesColRef, shareData);
                console.log("Share added successfully.");
                showCustomDialog("Share added successfully!", false);
            }
            closeModal(shareFormModal);
        } catch (error) {
            console.error("Error saving share:", error);
            showCustomDialog(`Error saving share: ${error.message}`, false);
        }
    }

    /**
     * Deletes a share from Firestore.
     * @param {string} shareId - The ID of the share to delete.
     */
    async function deleteShare(shareId) {
        if (!db || !firestore || !currentUserId) {
            showCustomDialog("Please sign in to delete shares.", false);
            return;
        }
        const confirmed = await showCustomDialog("Are you sure you want to delete this share?", true);
        if (confirmed) {
            try {
                const sharesColRef = firestore.collection(db, getSharesCollectionPath());
                const shareDocRef = firestore.doc(sharesColRef, shareId);
                await firestore.deleteDoc(shareDocRef);
                console.log("Share deleted successfully:", shareId);
                showCustomDialog("Share deleted successfully!", false);
                closeModal(shareFormModal);
                closeModal(shareDetailModal);
            } catch (error) {
                console.error("Error deleting share:", error);
                showCustomDialog(`Error deleting share: ${error.message}`, false);
            }
        }
    }

    /**
     * Saves a watchlist to Firestore (add or update).
     * @param {string} watchlistName - The name of the watchlist.
     * @param {string|null} watchlistId - The ID of the watchlist if updating, null if adding.
     */
    async function saveWatchlist(watchlistName, watchlistId = null) {
        if (!db || !firestore || !currentUserId) {
            showCustomDialog("Please sign in to save watchlists.", false);
            return;
        }
        try {
            const watchlistsColRef = firestore.collection(db, getWatchlistsCollectionPath());
            const data = { name: watchlistName, userId: currentUserId }; // Still associate with userId for potential future filtering/ownership

            if (watchlistId) {
                // Update existing watchlist
                const watchlistDocRef = firestore.doc(watchlistsColRef, watchlistId);
                await firestore.setDoc(watchlistDocRef, data, { merge: true });
                console.log("Watchlist updated successfully:", watchlistId);
                showCustomDialog("Watchlist updated successfully!", false);
            } else {
                // Add new watchlist
                await firestore.addDoc(watchlistsColRef, data);
                console.log("Watchlist added successfully:", watchlistName);
                showCustomDialog("Watchlist added successfully!", false);
            }
            closeModal(addWatchlistModal);
            closeModal(manageWatchlistModal);
        } catch (error) {
            console.error("Error saving watchlist:", error);
            showCustomDialog(`Error saving watchlist: ${error.message}`, false);
        }
    }

    /**
     * Deletes a watchlist from Firestore and unlinks all shares from it.
     * @param {string} watchlistId - The ID of the watchlist to delete.
     */
    async function deleteWatchlist(watchlistId) {
        if (!db || !firestore || !currentUserId) {
            showCustomDialog("Please sign in to delete watchlists.", false);
            return;
        }
        const confirmed = await showCustomDialog("Deleting this watchlist will remove it from all shares. Are you sure?", true);
        if (confirmed) {
            try {
                const batch = firestore.writeBatch(db);

                // 1. Delete the watchlist document
                const watchlistDocRef = firestore.doc(firestore.collection(db, getWatchlistsCollectionPath()), watchlistId);
                batch.delete(watchlistDocRef);

                // 2. Unlink shares from this watchlist
                const sharesColRef = firestore.collection(db, getSharesCollectionPath());
                const q = firestore.query(sharesColRef, firestore.where('watchlistId', '==', watchlistId));
                const sharesToUpdateSnapshot = await firestore.getDocs(q);

                sharesToUpdateSnapshot.forEach((doc) => {
                    const shareRef = firestore.doc(sharesColRef, doc.id);
                    batch.update(shareRef, { watchlistId: firestore.deleteField() });
                });

                await batch.commit();
                console.log("Watchlist and associated share links deleted successfully:", watchlistId);
                showCustomDialog("Watchlist deleted successfully!", false);
                closeModal(manageWatchlistModal);
                // Reset selected watchlist if the deleted one was active
                if (currentSelectedWatchlistId === watchlistId) {
                    currentSelectedWatchlistId = 'all';
                    watchlistSelect.value = 'all';
                    renderShares();
                }
            } catch (error) {
                console.error("Error deleting watchlist and unlinking shares:", error);
                showCustomDialog(`Error deleting watchlist: ${error.message}`, false);
            }
        }
    }

    /**
     * Saves user preferences (current theme and selected watchlist) to Firestore.
     */
    async function saveUserPreferences() {
        if (!db || !firestore || !currentUserId || !isAuthReady) {
            console.warn("Cannot save user preferences: Firestore not ready or no user ID.");
            return;
        }
        try {
            // User preferences are explicitly stored under the user's private path.
            const userPrefsDocRef = firestore.doc(db, `users/${currentUserId}/preferences/app_settings`);
            const themeClass = themes[currentThemeIndex];
            await firestore.setDoc(userPrefsDocRef, {
                selectedTheme: themeClass,
                selectedWatchlistId: currentSelectedWatchlistId
            }, { merge: true });
            console.log("User preferences saved.");
        } catch (error) {
            console.error("Error saving user preferences:", error);
        }
    }

    /**
     * Loads user preferences (current theme and selected watchlist) from Firestore.
     */
    async function loadUserPreferences() {
        if (!db || !firestore || !currentUserId || !isAuthReady) {
            console.warn("Cannot load user preferences: Firestore not ready or no user ID.");
            return;
        }
        try {
            // User preferences are explicitly stored under the user's private path.
            const userPrefsDocRef = firestore.doc(db, `users/${currentUserId}/preferences/app_settings`);
            const docSnap = await firestore.getDoc(userPrefsDocRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                console.log("User preferences loaded:", data);
                // Load theme
                if (data.selectedTheme) {
                    const index = themes.indexOf(data.selectedTheme);
                    if (index !== -1) {
                        currentThemeIndex = index;
                    } else {
                        currentThemeIndex = 0; // Fallback to default if saved theme is invalid
                    }
                    applyTheme(themes[currentThemeIndex]);
                }
                // Load selected watchlist
                if (data.selectedWatchlistId) {
                    currentSelectedWatchlistId = data.selectedWatchlistId;
                    // Ensure the dropdown is populated before setting value
                    // This is handled by populateWatchlistDropdown after watchlists are fetched
                }
            } else {
                console.log("No user preferences found. Using defaults.");
            }
        } catch (error) {
            console.error("Error loading user preferences:", error);
        }
    }

    // --- UI Rendering Functions ---

    /**
     * Populates the watchlist dropdown with available watchlists.
     */
    function populateWatchlistDropdown() {
        watchlistSelect.innerHTML = ''; // Clear existing options

        // Add default "All Shares" option
        const allOption = document.createElement('option');
        allOption.value = 'all';
        allOption.textContent = 'All Shares';
        watchlistSelect.appendChild(allOption);

        // Add each custom watchlist
        currentWatchlists.forEach(watchlist => {
            const option = document.createElement('option');
            option.value = watchlist.id;
            option.textContent = watchlist.name;
            watchlistSelect.appendChild(option);
        });

        // Set the selected value based on currentSelectedWatchlistId
        // Ensure the option exists before setting, otherwise default to 'all'
        if (Array.from(watchlistSelect.options).some(option => option.value === currentSelectedWatchlistId)) {
            watchlistSelect.value = currentSelectedWatchlistId;
        } else {
            watchlistSelect.value = 'all';
            currentSelectedWatchlistId = 'all';
        }
    }

    /**
     * Renders the share data into the table (desktop) and mobile cards.
     */
    function renderShares() {
        shareTableBody.innerHTML = '';
        mobileShareCardsContainer.innerHTML = '';
        asxCodeButtonsContainer.innerHTML = '';

        let filteredShares = allShares;

        // Filter by watchlist
        if (currentSelectedWatchlistId !== 'all') {
            filteredShares = filteredShares.filter(share => share.watchlistId === currentSelectedWatchlistId);
        }

        // Sort shares
        filteredShares.sort((a, b) => {
            const [sortBy, sortOrder] = currentSortOrder.split('-');
            let valA, valB;

            switch (sortBy) {
                case 'entryDate':
                    valA = a.entryDate ? new Date(a.entryDate) : 0;
                    valB = b.entryDate ? new Date(b.entryDate) : 0;
                    break;
                case 'shareName':
                    valA = a.shareName.toLowerCase();
                    valB = b.shareName.toLowerCase();
                    break;
                case 'dividendAmount':
                    valA = parseFloat(a.dividendAmount || 0);
                    valB = parseFloat(b.dividendAmount || 0);
                    break;
                default:
                    valA = a[sortBy];
                    valB = b[sortBy];
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // Generate ASX code buttons for currently displayed shares
        const uniqueAsxCodes = new Set(filteredShares.map(share => share.shareName.toUpperCase()));
        uniqueAsxCodes.forEach(code => {
            const button = document.createElement('button');
            button.className = 'asx-code-btn';
            button.textContent = code;
            button.dataset.asxCode = code;
            button.addEventListener('click', () => filterByAsxCode(code));
            asxCodeButtonsContainer.appendChild(button);
        });


        if (filteredShares.length === 0) {
            shareTableBody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">No shares found in this watchlist.</td></tr>';
            mobileShareCardsContainer.innerHTML = '<p style="text-align: center; padding: 20px; color: var(--label-color);">No shares found in this watchlist.</p>';
            return;
        }

        filteredShares.forEach(share => {
            const { unfrankedYield, frankedYield } = calculateYields(
                parseFloat(share.currentPrice || 0),
                parseFloat(share.dividendAmount || 0),
                parseFloat(share.frankingCredits || 0)
            );

            // Desktop Table Row
            const row = shareTableBody.insertRow();
            row.dataset.shareId = share.id;
            row.innerHTML = `
                <td>${share.shareName || '-'}</td>
                <td>${formatCurrency(share.currentPrice)}</td>
                <td>${formatCurrency(share.targetPrice)}</td>
                <td>
                    <span class="unfranked-yield">U: ${formatPercentage(unfrankedYield)}</span><br>
                    <span class="franked-yield">F: ${formatPercentage(frankedYield)}</span>
                </td>
                <td>${share.comments && share.comments.length > 0 && share.comments[0].text ? share.comments[0].text.substring(0, 50) + '...' : '-'}</td>
            `;
            row.addEventListener('click', () => {
                // Remove 'selected' class from previously selected row
                const currentSelectedRow = shareTableBody.querySelector('.selected');
                if (currentSelectedRow) {
                    currentSelectedRow.classList.remove('selected');
                }
                row.classList.add('selected'); // Add 'selected' class to the clicked row
                openShareDetailModal(share.id);
            });

            // Mobile Card
            const card = document.createElement('div');
            card.className = 'mobile-card';
            card.dataset.shareId = share.id;
            card.innerHTML = `
                <h3>${share.shareName || '-'}</h3>
                <p><strong>Entered Price:</strong> ${formatCurrency(share.currentPrice)}</p>
                <p><strong>Target Price:</strong> ${formatCurrency(share.targetPrice)}</p>
                <p><strong>Dividends:</strong> U: ${formatPercentage(unfrankedYield)}, F: ${formatPercentage(frankedYield)}</p>
                <p><strong>Comments:</strong> ${share.comments && share.comments.length > 0 && share.comments[0].text ? share.comments[0].text.substring(0, 50) + '...' : '-'}</p>
            `;
            card.addEventListener('click', () => {
                // Remove 'selected' class from previously selected card
                const currentSelectedCard = mobileShareCardsContainer.querySelector('.selected');
                if (currentSelectedCard) {
                    currentSelectedCard.classList.remove('selected');
                }
                card.classList.add('selected'); // Add 'selected' class to the clicked card
                openShareDetailModal(share.id);
            });
            mobileShareCardsContainer.appendChild(card);
        });
    }

    /**
     * Filters shares by ASX code button click.
     * @param {string} code - The ASX code to filter by.
     */
    function filterByAsxCode(code) {
        // This function is currently just for highlighting the button.
        // The main filtering logic is handled by the watchlist and sort dropdowns.
        // If a more persistent filter is needed, this would update a filter state.
        const buttons = asxCodeButtonsContainer.querySelectorAll('.asx-code-btn');
        buttons.forEach(btn => {
            if (btn.dataset.asxCode === code) {
                btn.classList.toggle('active');
            } else {
                btn.classList.remove('active');
            }
        });
        // For now, re-render shares to reflect the current filter
        // In a more complex scenario, you'd add a 'filteredAsxCode' state
        // and include it in the renderShares filtering logic.
    }

    // --- Share Form Modal Functions ---

    /**
     * Resets the share form fields.
     */
    function resetShareForm() {
        shareNameInput.value = '';
        currentPriceInput.value = '';
        targetPriceInput.value = '';
        dividendAmountInput.value = '';
        frankingCreditsInput.value = '';
        commentsFormContainer.innerHTML = '<h3>Comments <button type="button" id="addCommentSectionBtn" class="add-section-btn">+</button></h3>';
        // Re-attach event listener for the new add comment button
        document.getElementById('addCommentSectionBtn').addEventListener('click', addCommentSection);
        deleteShareFromFormBtn.style.display = 'none'; // Hide delete button for new share
        currentSelectedShareId = null;
    }

    /**
     * Adds a new comment section to the share form.
     * @param {string} [commentText=''] - Initial text for the comment.
     */
    function addCommentSection(commentText = '') {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-section';
        commentDiv.innerHTML = `
            <button type="button" class="comment-delete-btn">&times;</button>
            <label>Comment:</label>
            <textarea placeholder="Enter your comment here...">${commentText}</textarea>
        `;
        commentsFormContainer.appendChild(commentDiv);

        // Attach delete event listener to the new button
        commentDiv.querySelector('.comment-delete-btn').addEventListener('click', () => {
            commentDiv.remove();
        });
    }

    /**
     * Opens the share form modal for adding a new share.
     */
    function openNewShareForm() {
        formTitle.textContent = 'Add New Share';
        resetShareForm();
        addCommentSection(); // Add one empty comment section by default
        openModal(shareFormModal);
    }

    /**
     * Opens the share form modal for editing an existing share.
     * @param {string} shareId - The ID of the share to edit.
     */
    function openEditShareForm(shareId) {
        const share = allShares.find(s => s.id === shareId);
        if (!share) {
            showCustomDialog("Share not found.", false);
            return;
        }

        formTitle.textContent = 'Edit Share';
        currentSelectedShareId = shareId;
        shareNameInput.value = share.shareName || '';
        currentPriceInput.value = share.currentPrice || '';
        targetPriceInput.value = share.targetPrice || '';
        dividendAmountInput.value = share.dividendAmount || '';
        frankingCreditsInput.value = share.frankingCredits || '';

        // Clear existing comments and add from share data
        commentsFormContainer.innerHTML = '<h3>Comments <button type="button" id="addCommentSectionBtn" class="add-section-btn">+</button></h3>';
        document.getElementById('addCommentSectionBtn').addEventListener('click', addCommentSection);
        if (share.comments && share.comments.length > 0) {
            share.comments.forEach(comment => addCommentSection(comment.text));
        } else {
            addCommentSection(); // Add one empty comment section if no comments exist
        }

        deleteShareFromFormBtn.style.display = 'inline-flex'; // Show delete button for existing share
        openModal(shareFormModal);
    }

    /**
     * Handles saving share data from the form.
     */
    async function handleSaveShare() {
        const shareName = shareNameInput.value.trim();
        const currentPrice = parseFloat(currentPriceInput.value);
        const targetPrice = parseFloat(targetPriceInput.value);
        const dividendAmount = parseFloat(dividendAmountInput.value);
        const frankingCredits = parseFloat(frankingCreditsInput.value);

        if (!shareName) {
            showCustomDialog("Share Code is required.", false);
            return;
        }

        // Collect comments
        const commentElements = commentsFormContainer.querySelectorAll('.comment-section textarea');
        const comments = Array.from(commentElements)
            .map(textarea => ({ text: textarea.value.trim() }))
            .filter(comment => comment.text !== ''); // Only save non-empty comments

        const shareData = {
            shareName: shareName,
            currentPrice: isNaN(currentPrice) ? null : currentPrice,
            targetPrice: isNaN(targetPrice) ? null : targetPrice,
            dividendAmount: isNaN(dividendAmount) ? null : dividendAmount,
            frankingCredits: isNaN(frankingCredits) ? null : frankingCredits,
            comments: comments,
            watchlistId: currentSelectedWatchlistId !== 'all' ? currentSelectedWatchlistId : firestore.deleteField(), // Link to current watchlist or unlink
            entryDate: currentSelectedShareId ? allShares.find(s => s.id === currentSelectedShareId)?.entryDate : new Date().toISOString() // Preserve existing date or set new
        };

        await saveShare(shareData, currentSelectedShareId);
    }

    // --- Share Detail Modal Functions ---

    /**
     * Opens the share detail modal and populates it with data.
     * @param {string} shareId - The ID of the share to display.
     */
    function openShareDetailModal(shareId) {
        const share = allShares.find(s => s.id === shareId);
        if (!share) {
            showCustomDialog("Share details not found.", false);
            return;
        }

        currentSelectedShareId = shareId; // Set for edit button

        modalShareName.textContent = share.shareName || 'N/A';
        modalEntryDate.textContent = share.entryDate ? new Date(share.entryDate).toLocaleDateString() : 'N/A';
        modalEnteredPrice.textContent = formatCurrency(share.currentPrice);
        modalTargetPrice.textContent = formatCurrency(share.targetPrice);
        modalDividendAmount.textContent = formatCurrency(share.dividendAmount);
        modalFrankingCredits.textContent = formatPercentage(share.frankingCredits);

        const { unfrankedYield, frankedYield } = calculateYields(
            parseFloat(share.currentPrice || 0),
            parseFloat(share.dividendAmount || 0),
            parseFloat(share.frankingCredits || 0)
        );
        modalUnfrankedYield.textContent = formatPercentage(unfrankedYield);
        modalFrankedYield.textContent = formatPercentage(frankedYield);

        // Populate comments
        modalCommentsContainer.innerHTML = '<h3>Comments</h3>'; // Clear existing
        if (share.comments && share.comments.length > 0) {
            share.comments.forEach(comment => {
                const commentItem = document.createElement('div');
                commentItem.className = 'modal-comment-item';
                commentItem.innerHTML = `
                    <strong>${new Date(share.entryDate).toLocaleDateString()}:</strong>
                    <p>${comment.text}</p>
                `;
                modalCommentsContainer.appendChild(commentItem);
            });
        } else {
            modalCommentsContainer.innerHTML += '<p class="ghosted-text">No comments for this share.</p>';
        }

        // Set external links
        const marketIndexCode = share.shareName.toUpperCase();
        modalMarketIndexLink.href = `https://www.marketindex.com.au/asx/${marketIndexCode}`;
        modalFoolLink.href = `https://www.fool.com.au/quote/${marketIndexCode}/`;
        modalCommSecLink.href = `https://www2.commsec.com.au/quotes/company-details?code=${marketIndexCode}`;

        openModal(shareDetailModal);
    }

    // --- Watchlist Modals Functions ---

    /**
     * Opens the add watchlist modal.
     */
    function openAddWatchlistModal() {
        newWatchlistNameInput.value = '';
        openModal(addWatchlistModal);
    }

    /**
     * Handles saving a new watchlist.
     */
    async function handleSaveNewWatchlist() {
        const watchlistName = newWatchlistNameInput.value.trim();
        if (!watchlistName) {
            showCustomDialog("Watchlist name cannot be empty.", false);
            return;
        }
        await saveWatchlist(watchlistName);
    }

    /**
     * Opens the manage watchlist modal for the currently selected watchlist.
     */
    function openManageWatchlistModal() {
        if (currentSelectedWatchlistId === 'all') {
            showCustomDialog("You cannot edit 'All Shares' watchlist.", false);
            return;
        }
        const selectedWatchlist = currentWatchlists.find(wl => wl.id === currentSelectedWatchlistId);
        if (selectedWatchlist) {
            editWatchlistNameInput.value = selectedWatchlist.name;
            deleteWatchlistInModalBtn.style.display = 'inline-flex';
            openModal(manageWatchlistModal);
        } else {
            showCustomDialog("Please select a watchlist to edit.", false);
        }
    }

    /**
     * Handles saving the edited watchlist name.
     */
    async function handleSaveWatchlistName() {
        const newName = editWatchlistNameInput.value.trim();
        if (!newName) {
            showCustomDialog("Watchlist name cannot be empty.", false);
            return;
        }
        if (currentSelectedWatchlistId && currentSelectedWatchlistId !== 'all') {
            await saveWatchlist(newName, currentSelectedWatchlistId);
        }
    }

    /**
     * Handles deleting the currently selected watchlist.
     */
    async function handleDeleteWatchlist() {
        if (currentSelectedWatchlistId && currentSelectedWatchlistId !== 'all') {
            await deleteWatchlist(currentSelectedWatchlistId);
        }
    }

    // --- Calculator Functions ---

    /**
     * Updates the dividend calculator results.
     */
    function updateDividendCalculator() {
        const price = parseFloat(calcCurrentPriceInput.value);
        const dividend = parseFloat(calcDividendAmountInput.value);
        const franking = parseFloat(calcFrankingCreditsInput.value);
        const investment = parseFloat(investmentValueSelect.value);

        if (isNaN(price) || isNaN(dividend) || isNaN(franking)) {
            calcUnfrankedYield.textContent = '-';
            calcFrankedYield.textContent = '-';
            calcEstimatedDividend.textContent = '-';
            return;
        }

        const { unfrankedYield, frankedYield } = calculateYields(price, dividend, franking);
        calcUnfrankedYield.textContent = formatPercentage(unfrankedYield);
        calcFrankedYield.textContent = formatPercentage(frankedYield);

        if (!isNaN(investment) && price > 0) {
            const numShares = investment / price;
            const estimatedDividend = numShares * dividend;
            calcEstimatedDividend.textContent = formatCurrency(estimatedDividend);
        } else {
            calcEstimatedDividend.textContent = '-';
        }
    }

    // Standard Calculator Logic
    let currentInput = '0';
    let operator = null;
    let previousInput = '';
    let resetInput = false;

    /**
     * Updates the standard calculator display.
     */
    function updateCalculatorDisplay() {
        calculatorInput.textContent = previousInput + (operator || '') + currentInput;
        calculatorResult.textContent = currentInput;
    }

    /**
     * Handles number and decimal button clicks for the standard calculator.
     * @param {string} value - The button value.
     */
    function inputDigit(value) {
        if (resetInput) {
            currentInput = value;
            resetInput = false;
        } else {
            if (value === '.' && currentInput.includes('.')) return;
            currentInput = currentInput === '0' && value !== '.' ? value : currentInput + value;
        }
        updateCalculatorDisplay();
    }

    /**
     * Handles operator button clicks for the standard calculator.
     * @param {string} nextOperator - The next operator.
     */
    function inputOperator(nextOperator) {
        if (operator && !resetInput) {
            calculate();
        }
        previousInput = currentInput;
        operator = nextOperator;
        resetInput = true;
        updateCalculatorDisplay();
    }

    /**
     * Performs the calculation for the standard calculator.
     */
    function calculate() {
        let result;
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);

        if (isNaN(prev) || isNaN(current) || !operator) return;

        switch (operator) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '×':
                result = prev * current;
                break;
            case '÷':
                result = prev / current;
                break;
            case '%':
                result = prev % current;
                break;
            default:
                return;
        }
        currentInput = result.toString();
        operator = null;
        previousInput = '';
        resetInput = true;
        updateCalculatorDisplay();
    }

    /**
     * Clears the standard calculator.
     */
    function clearCalculator() {
        currentInput = '0';
        operator = null;
        previousInput = '';
        resetInput = false;
        updateCalculatorDisplay();
    }

    /**
     * Handles standard calculator button clicks.
     * @param {Event} event - The click event.
     */
    function handleCalculatorButtonClick(event) {
        const button = event.target.closest('.calc-btn');
        if (!button) return;

        const value = button.dataset.value;
        const action = button.dataset.action;

        if (value) {
            inputDigit(value);
        } else if (action) {
            switch (action) {
                case 'clear':
                    clearCalculator();
                    break;
                case 'add':
                case 'subtract':
                case 'multiply':
                case 'divide':
                case 'percentage':
                    inputOperator(button.textContent);
                    break;
                case 'calculate':
                    calculate();
                    break;
            }
        }
    }

    // --- Event Listeners ---

    // Hamburger menu and sidebar
    hamburgerBtn.addEventListener('click', toggleSidebar);
    closeMenuBtn.addEventListener('click', closeSidebar);
    sidebarOverlay.addEventListener('click', closeSidebar); // Close sidebar when clicking overlay

    // Header "Add Share" button
    addShareHeaderBtn.addEventListener('click', openNewShareForm);

    // Sidebar menu buttons
    newShareBtn.addEventListener('click', () => {
        openNewShareForm();
        if (newShareBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });
    addWatchlistBtn.addEventListener('click', () => {
        openAddWatchlistModal();
        if (addWatchlistBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });
    editWatchlistBtn.addEventListener('click', () => {
        openManageWatchlistModal();
        if (editWatchlistBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });
    standardCalcBtn.addEventListener('click', () => {
        openModal(standardCalculatorModal);
        clearCalculator(); // Reset calculator when opening
        if (standardCalcBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });
    dividendCalcBtn.addEventListener('click', () => {
        openModal(dividendCalculatorModal);
        updateDividendCalculator(); // Initial calculation
        if (dividendCalcBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });
    themeToggleBtn.addEventListener('click', () => {
        cycleTheme();
        saveUserPreferences(); // Save theme preference immediately
        if (themeToggleBtn.dataset.actionClosesMenu === 'true') closeSidebar();
    });


    // Watchlist and Sort dropdowns
    watchlistSelect.addEventListener('change', (event) => {
        currentSelectedWatchlistId = event.target.value;
        renderShares();
        saveUserPreferences(); // Save selected watchlist preference
    });
    sortSelect.addEventListener('change', (event) => {
        currentSortOrder = event.target.value;
        renderShares();
    });

    // Share Form Modal
    shareFormCloseBtn.addEventListener('click', () => closeModal(shareFormModal));
    cancelFormBtn.addEventListener('click', () => closeModal(shareFormModal));
    saveShareBtn.addEventListener('click', handleSaveShare);
    deleteShareFromFormBtn.addEventListener('click', async () => {
        if (currentSelectedShareId) {
            await deleteShare(currentSelectedShareId);
        }
    });
    addCommentSectionBtn.addEventListener('click', addCommentSection); // Initial listener for the first button

    // Share Detail Modal
    shareDetailCloseBtn.addEventListener('click', () => closeModal(shareDetailModal));
    editShareFromDetailBtn.addEventListener('click', () => {
        closeModal(shareDetailModal);
        if (currentSelectedShareId) {
            openEditShareForm(currentSelectedShareId);
        }
    });

    // Add Watchlist Modal
    addWatchlistCloseBtn.addEventListener('click', () => closeModal(addWatchlistModal));
    cancelAddWatchlistBtn.addEventListener('click', () => closeModal(addWatchlistModal));
    saveWatchlistBtn.addEventListener('click', handleSaveNewWatchlist);

    // Manage Watchlist Modal
    manageWatchlistCloseBtn.addEventListener('click', () => closeModal(manageWatchlistModal));
    cancelManageWatchlistBtn.addEventListener('click', () => closeModal(manageWatchlistModal));
    saveWatchlistNameBtn.addEventListener('click', handleSaveWatchlistName);
    deleteWatchlistInModalBtn.addEventListener('click', handleDeleteWatchlist);

    // Dividend Calculator Modal
    dividendCalcCloseBtn.addEventListener('click', () => closeModal(dividendCalculatorModal));
    calcCurrentPriceInput.addEventListener('input', updateDividendCalculator);
    calcDividendAmountInput.addEventListener('input', updateDividendCalculator);
    calcFrankingCreditsInput.addEventListener('input', updateDividendCalculator);
    investmentValueSelect.addEventListener('change', updateDividendCalculator);

    // Standard Calculator Modal
    standardCalcCloseBtn.addEventListener('click', () => closeModal(standardCalculatorModal));
    calculatorButtons.addEventListener('click', handleCalculatorButtonClick);

    // Close modals when clicking outside (on the overlay)
    window.addEventListener('click', (event) => {
        if (event.target === shareFormModal) closeModal(shareFormModal);
        if (event.target === shareDetailModal) closeModal(shareDetailModal);
        if (event.target === addWatchlistModal) closeModal(addWatchlistModal);
        if (event.target === manageWatchlistModal) closeModal(manageWatchlistModal);
        if (event.target === dividendCalculatorModal) closeModal(dividendCalculatorModal);
        if (event.target === standardCalculatorModal) closeModal(standardCalculatorModal);
        if (event.target === customDialogModal) {
            // For custom dialog, clicking outside acts like a cancel if cancel button is present
            if (customDialogCancelBtn.style.display === 'inline-block') {
                customDialogCancelBtn.click();
            } else {
                customDialogConfirmBtn.click(); // If no cancel, clicking outside acts like OK
            }
        }
    });

    // Scroll-to-Top Button visibility
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) { // Show button after scrolling 200px
            scrollToTopBtn.style.display = 'flex';
        } else {
            scrollToTopBtn.style.display = 'none';
        }
    });

    scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // Initial load of theme preference
    loadThemePreference();

    // Initial render of shares (will be updated by onSnapshot once auth is ready)
    renderShares();
});
