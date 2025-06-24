// File Version: v47
// Last Updated: 2025-06-25

// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    const mainTitle = document.getElementById('mainTitle');
    const newShareBtn = document.getElementById('newShareBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const standardCalcBtn = document.getElementById('standardCalcBtn');
    const dividendCalcBtn = document.getElementById('dividendCalcBtn');
    const asxCodeButtonsContainer = document.getElementById('asxCodeButtonsContainer');

    const shareFormSection = document.getElementById('shareFormSection');
    const formCloseButton = document.querySelector('.form-close-button');
    const formTitle = document.getElementById('formTitle');
    const saveShareBtn = document.getElementById('saveShareBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const deleteShareFromFormBtn = document.getElementById('deleteShareFromFormBtn');

    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice'); // Manual current price input
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsFormContainer = document.getElementById('commentsFormContainer'); // Container for dynamic comment sections in form
    const addCommentSectionBtn = document.getElementById('addCommentSectionBtn'); // Button to add new comment sections

    const shareTableBody = document.querySelector('#shareTable tbody');
    const mobileShareCardsContainer = document.getElementById('mobileShareCards');

    const loadingIndicator = document.getElementById('loadingIndicator');

    // Consolidated auth button
    const googleAuthBtn = document.getElementById('googleAuthBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPriceDetailed = document.getElementById('modalCurrentPriceDetailed'); // For detailed price display
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalCommentsContainer = document.getElementById('modalCommentsContainer'); // Container for structured comments display
    const modalUnfrankedYieldSpan = document.getElementById('modalUnfrankedYield');
    const modalFrankedYieldSpan = document.getElementById('modalFrankedYield');
    const editShareFromDetailBtn = document.getElementById('editShareFromDetailBtn'); // New button in detail modal

    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal');
    const calcCloseButton = document.querySelector('.calc-close-button');
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYieldSpan = document.getElementById('calcUnfrankedYield');
    const calcFrankedYieldSpan = document.getElementById('calcFrankedYield');
    const investmentValueSelect = document.getElementById('investmentValueSelect'); // New dropdown for investment value
    const calcEstimatedDividend = document.getElementById('calcEstimatedDividend'); // New display for estimated dividend

    const sortSelect = document.getElementById('sortSelect'); // New sort dropdown
    const currentWatchlistTitle = document.getElementById('currentWatchlistTitle'); // New element for dynamic watchlist title

    // Custom Dialog Modal elements
    const customDialogModal = document.getElementById('customDialogModal');
    const customDialogMessage = document.getElementById('customDialogMessage');
    const customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    const customDialogCancelBtn = document.getElementById('customDialogCancelBtn');

    // NEW Calculator elements
    const calculatorModal = document.getElementById('calculatorModal');
    const calculatorInput = document.getElementById('calculatorInput');
    const calculatorResult = document.getElementById('calculatorResult');
    const calculatorButtons = document.querySelector('.calculator-buttons');


    // NEW Watchlist Management elements
    const watchlistSelect = document.getElementById('watchlistSelect');
    const addWatchlistBtn = document.getElementById('addWatchlistBtn');
    const renameWatchlistBtn = document.getElementById('renameWatchlistBtn');


    // Array of all form input elements for easy iteration and form clearing (excluding dynamic comments)
    const formInputs = [
        shareNameInput, currentPriceInput, targetPriceInput,
        dividendAmountInput, frankingCreditsInput
    ];

    // --- State Variables ---
    let db;
    let auth;
    let currentUserId = null;
    let currentAppId;
    let selectedShareDocId = null;
    let allSharesData = []; // Array to hold all loaded share data
    let currentDialogCallback = null; // Stores the function to call after custom dialog closes
    let autoDismissTimeout = null; // For auto-dismissing alerts

    // Double-tap/click variables
    let lastTapTime = 0;
    let tapTimeout;
    let selectedElementForTap = null; // Store the element that was tapped first
    
    // Mobile long press variables (for edit)
    let longPressTimer;
    const LONG_PRESS_THRESHOLD = 500; // Milliseconds for long press
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TOUCH_MOVE_THRESHOLD = 10; // Pixels to detect significant movement

    const KANGA_EMAIL = 'iamkanga@gmail.com'; // Specific email for title logic

    // Calculator state variables
    let currentInput = '';
    let operator = null;
    let previousInput = '';
    let resultDisplayed = false;

    // Watchlist state variables
    const DEFAULT_WATCHLIST_NAME = 'My Watchlist';
    const DEFAULT_WATCHLIST_ID_SUFFIX = 'default'; // A stable ID part for the default watchlist
    let userWatchlists = []; // Array of { id: ..., name: ... }
    let currentWatchlistId = null; // The ID of the currently active watchlist
    let currentWatchlistName = ''; // Stores the name of the currently active watchlist


    // --- Initial UI Setup ---
    // Ensure all modals are hidden by default at page load using JavaScript and CSS !important rules.
    // This provides a failsafe against previous bleed-through issues.
    shareFormSection.style.display = 'none';
    dividendCalculatorModal.style.display = 'none';
    shareDetailModal.style.display = 'none'; 
    customDialogModal.style.display = 'none'; // Ensure custom dialog is hidden
    calculatorModal.style.display = 'none'; // Ensure calculator modal is hidden
    updateMainButtonsState(false);
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // Disable watchlist management elements initially
    if (watchlistSelect) watchlistSelect.disabled = true;
    if (addWatchlistBtn) addWatchlistBtn.disabled = true;
    if (renameWatchlistBtn) renameWatchlistBtn.disabled = true;


    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('Service Worker registered with scope:', registration.scope);
                })
                .catch(error => {
                    console.error('Service Worker registration failed:', error);
                });
        });
    }

    // --- Event Listeners for Input Fields ---
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    formInputs.forEach((input, index) => {
        if (input) {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (index === formInputs.length - 1) {
                        const currentCommentInputs = commentsFormContainer.querySelector('.comment-title-input');
                        if (currentCommentInputs) {
                            currentCommentInputs.focus();
                        } else if (saveShareBtn) {
                            saveShareBtn.click();
                        }
                    } else {
                        if (formInputs[index + 1]) formInputs[index + 1].focus();
                    }
                }
            });
        }
    });

    // --- Centralized Modal Closing Function ---
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal) {
                // Use setProperty with !important to ensure override of CSS !important.
                modal.style.setProperty('display', 'none', 'important');
            }
        });
        // Reset calculator state when closing calculator modal
        resetCalculator();
        // Clear any pending auto-dismiss timeout if modal is closed manually
        if (autoDismissTimeout) {
            clearTimeout(autoDismissTimeout);
            autoDismissTimeout = null;
        }
    }

    // --- Event Listeners for Modal Close Buttons ---
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', closeModals);
    });

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', handleCancelForm);
    }

    // --- Event Listener for Clicking Outside Modals ---
    window.addEventListener('click', (event) => {
        // Only close if the click is directly on the modal backdrop, not inside the modal-content
        if (event.target === shareDetailModal) {
            hideModal(shareDetailModal);
        }
        if (event.target === dividendCalculatorModal) {
            hideModal(dividendCalculatorModal);
        }
        if (event.target === shareFormSection) {
            hideModal(shareFormSection);
        }
        if (event.target === customDialogModal) {
            hideModal(customDialogModal);
            // If custom dialog is dismissed by clicking outside, clear any callback
            if (currentDialogCallback) {
                clearTimeout(autoDismissTimeout); // Clear auto-dismiss if manually dismissed
                currentDialogCallback = null;
            }
        }
        if (event.target === calculatorModal) {
            hideModal(calculatorModal);
        }
    });

    // --- Firebase Initialization and Authentication State Listener ---
    window.addEventListener('firebaseServicesReady', async () => {
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        currentAppId = window.getFirebaseAppId();

        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                updateAuthButtonText(true, user.email || user.displayName); // Pass user info to update button text
                console.log("[AuthState] User signed in:", user.uid);

                if (user.email && user.email.toLowerCase() === KANGA_EMAIL) {
                    mainTitle.textContent = "Kangas ASX Share Watchlist";
                } else {
                    mainTitle.textContent = "My ASX Share Watchlist";
                }
                
                updateMainButtonsState(true);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                
                // Load watchlists first, then shares
                await loadUserWatchlists();
            } else {
                currentUserId = null;
                updateAuthButtonText(false); // No user info needed for sign out state
                mainTitle.textContent = "My ASX Share Watchlist";
                console.log("[AuthState] User signed out.");
                updateMainButtonsState(false);
                clearShareList();
                clearWatchlistUI(); // Clear watchlist UI too
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });
    });

    // --- Authentication Functions ---
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            if (auth && auth.currentUser) { // User is signed in, so this is a Sign Out action
                try {
                    await window.authFunctions.signOut(auth);
                    console.log("[Auth] User signed out.");
                } catch (error) {
                    console.error("[Auth] Sign-Out failed:", error);
                    showCustomAlert("Sign-Out failed: " + error.message);
                }
            } else if (auth) { // User is not signed in, so this is a Sign In action
                try {
                    const provider = window.authFunctions.GoogleAuthProviderInstance;
                    if (!provider) {
                        console.error("[Auth] GoogleAuthProvider instance not found.");
                        showCustomAlert("Authentication service not ready. Please try again.");
                        return;
                    }
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("[Auth] Google Sign-In successful.");
                }
                catch (error) {
                    console.error("[Auth] Google Sign-In failed:", error.message);
                    showCustomAlert("Google Sign-In failed: " + error.message);
                }
            } else {
                 console.warn("[Auth] Auth service not initialized when Google Auth Button clicked.");
                 showCustomAlert("Authentication service not ready. Please try again.");
            }
        });
    }

    // --- Utility Functions for UI State Management ---
    function updateAuthButtonText(isSignedIn, userName = 'Sign In') {
        if (googleAuthBtn) {
            googleAuthBtn.textContent = isSignedIn ? (userName || '-') : 'Sign In';
        }
    }

    function updateMainButtonsState(enable) {
        if (newShareBtn) newShareBtn.disabled = !enable;
        // viewDetailsBtn disabled state is managed by selectShare function
        if (standardCalcBtn) standardCalcBtn.disabled = !enable;
        if (dividendCalcBtn) dividendCalcBtn.disabled = !enable;

        // Enable watchlist management elements based on auth state
        if (watchlistSelect) watchlistSelect.disabled = !enable;
        if (addWatchlistBtn) addWatchlistBtn.disabled = !enable;
        // Rename button only enabled if there are watchlists and one is selected
        if (renameWatchlistBtn) renameWatchlistBtn.disabled = !(enable && userWatchlists.length > 0 && currentWatchlistId);
    }

    function showModal(modalElement) {
        if (modalElement) {
            // Use 'flex' to make it visible and center content,
            // overriding 'display: none !important;' from CSS.
            modalElement.style.setProperty('display', 'flex', 'important');
            modalElement.scrollTop = 0; // Scroll to top of modal content
        }
    }

    function hideModal(modalElement) {
        if (modalElement) {
            // Use 'none' to hide it. The !important in CSS will re-apply
            modalElement.style.setProperty('display', 'none', 'important');
        }
    }

    // --- Custom Dialog (Alert/Confirm) Functions ---
    // Updated to auto-dismiss
    function showCustomAlert(message, duration = 1000) { // Default duration 1 second (1000ms)
        customDialogMessage.textContent = message;
        // Hide buttons for auto-dismissing alerts
        customDialogConfirmBtn.style.display = 'none'; 
        customDialogCancelBtn.style.display = 'none';
        showModal(customDialogModal);

        // Clear any existing auto-dismiss timeout
        if (autoDismissTimeout) {
            clearTimeout(autoDismissTimeout);
        }

        // Set new auto-dismiss timeout
        autoDismissTimeout = setTimeout(() => {
            hideModal(customDialogModal);
            autoDismissTimeout = null; // Reset timeout variable
        }, duration);
    }

    // This function is still available but will not be used for deletion as per request.
    // It's here for potential future "important" confirmations if needed.
    function showCustomConfirm(message, onConfirm, onCancel = null) {
        customDialogMessage.textContent = message;
        customDialogConfirmBtn.textContent = 'Yes';
        customDialogConfirmBtn.style.display = 'block';
        customDialogCancelBtn.textContent = 'No';
        customDialogCancelBtn.style.display = 'block'; // Show Cancel button
        showModal(customDialogModal);

        // Clear any existing auto-dismiss timeout if a confirmation is shown
        if (autoDismissTimeout) {
            clearTimeout(autoDismissTimeout);
            autoDismissTimeout = null;
        }

        customDialogConfirmBtn.onclick = () => {
            hideModal(customDialogModal);
            if (onConfirm) onConfirm();
            currentDialogCallback = null;
        };

        customDialogCancelBtn.onclick = () => {
            hideModal(customDialogModal);
            if (onCancel) onCancel();
            currentDialogCallback = null;
        };
        // Set currentDialogCallback to ensure consistent closing logic from outside clicks
        currentDialogCallback = () => {
            hideModal(customDialogModal);
            if (onCancel) onCancel(); // Treat outside click as a "No"
            currentDialogCallback = null;
        };
    }


    // --- Date Formatting Helper Functions (Australian Style) ---
    function formatDate(dateString) {
        if (!dateString) return ''; // Return empty string for missing date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Check for invalid date
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatDateTime(dateString) {
        if (!dateString) return ''; // Return empty string for missing date
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return ''; // Check for invalid date
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // 24-hour format
        });
    }

    // --- Watchlist Management Functions ---

    // Function to generate a consistent default watchlist ID
    function getDefaultWatchlistId(userId) {
        return `${userId}_${DEFAULT_WATCHLIST_ID_SUFFIX}`;
    }

    // Load watchlists from Firestore and set the current one
    async function loadUserWatchlists() {
        if (!db || !currentUserId) {
            console.warn("[Watchlist] Firestore DB or User ID not available for loading watchlists.");
            return;
        }

        userWatchlists = []; // Clear existing watchlists
        const watchlistsColRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists`);

        try {
            console.log("[Watchlist] Fetching user watchlists...");
            const querySnapshot = await window.firestore.getDocs(watchlistsColRef);
            querySnapshot.forEach(doc => {
                userWatchlists.push({ id: doc.id, name: doc.data().name });
            });
            console.log(`[Watchlist] Found ${userWatchlists.length} existing watchlists.`);

            // If no watchlists exist, create a default one
            if (userWatchlists.length === 0) {
                const defaultWatchlistRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists/${getDefaultWatchlistId(currentUserId)}`);
                await window.firestore.setDoc(defaultWatchlistRef, { name: DEFAULT_WATCHLIST_NAME, createdAt: new Date().toISOString() });
                userWatchlists.push({ id: getDefaultWatchlistId(currentUserId), name: DEFAULT_WATCHLIST_NAME });
                console.log("[Watchlist] Created default watchlist.");
            }

            // Sort watchlists alphabetically by name
            userWatchlists.sort((a, b) => a.name.localeCompare(b.name));

            // NEW LOGIC: Explicitly prioritize selecting the default watchlist.
            const defaultWatchlist = userWatchlists.find(w => w.name === DEFAULT_WATCHLIST_NAME);

            if (defaultWatchlist) {
                currentWatchlistId = defaultWatchlist.id;
                currentWatchlistName = defaultWatchlist.name;
                console.log(`[Watchlist] Setting current watchlist to default: '${currentWatchlistName}' (ID: ${currentWatchlistId})`);
            } else if (userWatchlists.length > 0) {
                // Fallback to the first watchlist if default somehow doesn't exist
                currentWatchlistId = userWatchlists[0].id;
                currentWatchlistName = userWatchlists[0].name;
                console.log(`[Watchlist] Setting current watchlist to first available: '${currentWatchlistName}' (ID: ${currentWatchlistId})`);
            } else {
                currentWatchlistId = null;
                currentWatchlistName = 'No Watchlist Selected';
                console.log("[Watchlist] No watchlists available. Current watchlist set to null.");
            }

            renderWatchlistSelect(); // Populate the dropdown and set its selected value
            updateMainButtonsState(true); // Re-enable buttons

            // --- Critical Order ---
            // 1. Run migration. This will update old shares to the default watchlist.
            // 2. If migration happens, it will call loadShares() itself.
            // 3. If no migration happens, we still need to call loadShares() to display current data.
            const migratedSomething = await migrateOldSharesToWatchlist();
            if (!migratedSomething) {
                console.log("[Watchlist] No old shares to migrate, directly loading shares for current watchlist.");
                await loadShares(); // Load shares for the (already determined) currentWatchlistId
            }
            // If migration occurred, loadShares was already called by migrateOldSharesToWatchlist.
            // The `renderWatchlist` call within `loadShares` should now correctly display.

        } catch (error) {
            console.error("[Watchlist] Error loading user watchlists:", error);
            showCustomAlert("Error loading watchlists: " + error.message);
        }
    }

    // Function to render options in the watchlist dropdown
    function renderWatchlistSelect() {
        if (!watchlistSelect) return;
        watchlistSelect.innerHTML = ''; // Clear existing options

        if (userWatchlists.length === 0) {
            const option = document.createElement('option');
            option.value = '';
            option.textContent = 'No Watchlists Available';
            watchlistSelect.appendChild(option);
            watchlistSelect.disabled = true;
            renameWatchlistBtn.disabled = true;
            if (currentWatchlistTitle) currentWatchlistTitle.textContent = 'No Watchlist Selected';
            return;
        }

        userWatchlists.forEach(watchlist => {
            const option = document.createElement('option');
            option.value = watchlist.id;
            option.textContent = watchlist.name;
            watchlistSelect.appendChild(option);
        });

        // Set the selected option based on currentWatchlistId
        if (currentWatchlistId) {
            watchlistSelect.value = currentWatchlistId;
            const selectedWatchlistObj = userWatchlists.find(w => w.id === currentWatchlistId);
            if (selectedWatchlistObj && currentWatchlistTitle) {
                currentWatchlistTitle.textContent = selectedWatchlistObj.name;
            }
            console.log(`[UI Update] Watchlist dropdown set to: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
        } else if (userWatchlists.length > 0) {
            // Fallback: If currentWatchlistId is somehow null but watchlists exist, select the first one in the dropdown
            watchlistSelect.value = userWatchlists[0].id;
            currentWatchlistId = userWatchlists[0].id; // Re-sync currentWatchlistId
            currentWatchlistName = userWatchlists[0].name; // Re-sync currentWatchlistName
            if (currentWatchlistTitle) currentWatchlistTitle.textContent = userWatchlists[0].name;
            console.warn(`[UI Update] currentWatchlistId was null, fallback to first watchlist: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
        } else {
            if (currentWatchlistTitle) currentWatchlistTitle.textContent = 'No Watchlist Selected';
        }

        watchlistSelect.disabled = false;
        renameWatchlistBtn.disabled = (userWatchlists.length === 0);
    }

    // Event listener for watchlist selection change
    if (watchlistSelect) {
        watchlistSelect.addEventListener('change', async () => {
            currentWatchlistId = watchlistSelect.value;
            const selectedWatchlistObj = userWatchlists.find(w => w.id === currentWatchlistId);
            if (selectedWatchlistObj) {
                currentWatchlistName = selectedWatchlistObj.name;
                if (currentWatchlistTitle) currentWatchlistTitle.textContent = currentWatchlistName;
                console.log(`[Watchlist Change] User selected: '${currentWatchlistName}' (ID: ${currentWatchlistId})`);
                await loadShares(); // Reload shares for the newly selected watchlist
            }
        });
    }

    // Add new watchlist handler
    if (addWatchlistBtn) {
        addWatchlistBtn.addEventListener('click', async () => {
            if (!currentUserId) {
                showCustomAlert("Please sign in to add a watchlist.");
                return;
            }
            const newWatchlistName = prompt("Enter the name for the new watchlist:");
            if (newWatchlistName && newWatchlistName.trim() !== '') {
                // Check if watchlist with this name already exists for the user
                const exists = userWatchlists.some(wl => wl.name.toLowerCase() === newWatchlistName.trim().toLowerCase());
                if (exists) {
                    showCustomAlert("A watchlist with this name already exists. Please choose a different name.");
                    return;
                }

                try {
                    const watchlistsColRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists`);
                    const newWatchlistDocRef = await window.firestore.addDoc(watchlistsColRef, {
                        name: newWatchlistName.trim(),
                        createdAt: new Date().toISOString(),
                        userId: currentUserId 
                    });
                    showCustomAlert(`Watchlist '${newWatchlistName}' added.`);
                    console.log(`[Watchlist] New watchlist added: ${newWatchlistName} (ID: ${newWatchlistDocRef.id})`);
                    await loadUserWatchlists(); // Reload watchlists to update UI and select new one
                    watchlistSelect.value = newWatchlistDocRef.id; // Select the newly created watchlist
                    currentWatchlistId = newWatchlistDocRef.id;
                    currentWatchlistName = newWatchlistName.trim();
                    if (currentWatchlistTitle) currentWatchlistTitle.textContent = currentWatchlistName;
                    await loadShares(); // Load shares for the new watchlist (will be empty)
                } catch (error) {
                    console.error("[Watchlist] Error adding watchlist:", error);
                    showCustomAlert("Failed to add watchlist: " + error.message);
                }
            } else if (newWatchlistName !== null) { // If user clicked OK but entered empty string
                showCustomAlert("Watchlist name cannot be empty.");
            }
        });
    }

    // Rename watchlist handler
    if (renameWatchlistBtn) {
        renameWatchlistBtn.addEventListener('click', async () => {
            if (!currentWatchlistId || !currentUserId) {
                showCustomAlert("Please select a watchlist to rename or sign in.");
                return;
            }
            // Disallow renaming the default watchlist if its ID is the specific default ID
            if (currentWatchlistId === getDefaultWatchlistId(currentUserId)) {
                showCustomAlert("The default watchlist cannot be renamed.");
                return;
            }

            const currentName = userWatchlists.find(wl => wl.id === currentWatchlistId)?.name || '';
            const newWatchlistName = prompt(`Rename watchlist '${currentName}' to:`, currentName);

            if (newWatchlistName && newWatchlistName.trim() !== '' && newWatchlistName.trim() !== currentName) {
                // Check for duplicate name (excluding the current watchlist's own name)
                const exists = userWatchlists.some(wl => wl.id !== currentWatchlistId && wl.name.toLowerCase() === newWatchlistName.trim().toLowerCase());
                if (exists) {
                    showCustomAlert("A watchlist with this name already exists. Please choose a different name.");
                    return;
                }

                try {
                    const watchlistDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists/${currentWatchlistId}`);
                    await window.firestore.updateDoc(watchlistDocRef, { name: newWatchlistName.trim() });
                    showCustomAlert(`Watchlist renamed to '${newWatchlistName}'.`);
                    console.log(`[Watchlist] Watchlist '${currentName}' renamed to '${newWatchlistName}'.`);
                    await loadUserWatchlists(); // Reload watchlists to update dropdown
                    // Ensure the dropdown still shows the renamed watchlist
                    watchlistSelect.value = currentWatchlistId;
                    currentWatchlistName = newWatchlistName.trim();
                    if (currentWatchlistTitle) currentWatchlistTitle.textContent = currentWatchlistName;
                } catch (error) {
                    console.error("[Watchlist] Error renaming watchlist:", error);
                    showCustomAlert("Failed to rename watchlist: " + error.message);
                }
            } else if (newWatchlistName !== null && newWatchlistName.trim() === '') {
                showCustomAlert("Watchlist name cannot be empty.");
            }
        });
    }

    // --- Share Data Management Functions ---
    async function loadShares() {
        if (!db || !currentUserId || !currentWatchlistId) {
            console.warn("[Shares] Firestore DB, User ID, or Watchlist ID not available for loading shares. Clearing list.");
            clearShareList();
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        allSharesData = []; // Clear previous data from the array

        try {
            const sharesCol = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            const q = window.firestore.query(
                sharesCol,
                window.firestore.where("watchlistId", "==", currentWatchlistId) 
            );
            console.log(`[Shares] Attempting to load shares for watchlist ID: ${currentWatchlistId} (Name: ${currentWatchlistName})`);
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                const share = { id: doc.id, ...doc.data() };
                allSharesData.push(share);
            });
            console.log(`[Shares] Shares loaded successfully for watchlist: '${currentWatchlistName}' (ID: ${currentWatchlistId}). Total shares: ${allSharesData.length}`);
            console.log("[Shares] All shares data (after load):", allSharesData);


            sortShares(); // This will also call renderWatchlist()
            renderAsxCodeButtons(); // Render ASX Code buttons
        } catch (error) {
            console.error("[Shares] Error loading shares:", error);
            showCustomAlert("Error loading shares: " + error.message);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // One-time migration function for old shares without a watchlistId
    // Returns true if migration occurred, false otherwise.
    async function migrateOldSharesToWatchlist() {
        if (!db || !currentUserId) {
            console.warn("[Migration] Firestore DB or User ID not available for migration.");
            return false;
        }

        const sharesCol = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
        const q = window.firestore.query(sharesCol);

        let sharesToMigrate = [];
        try {
            console.log("[Migration] Checking for old shares to migrate...");
            const querySnapshot = await window.firestore.getDocs(q);
            querySnapshot.forEach(doc => {
                const shareData = doc.data();
                if (!shareData.hasOwnProperty('watchlistId')) {
                    sharesToMigrate.push({ id: doc.id, ref: doc.ref });
                }
            });

            if (sharesToMigrate.length > 0) {
                console.log(`[Migration] Migrating ${sharesToMigrate.length} old shares to '${DEFAULT_WATCHLIST_NAME}'.`);
                const defaultWatchlistId = getDefaultWatchlistId(currentUserId);
                for (const share of sharesToMigrate) {
                    await window.firestore.updateDoc(share.ref, { watchlistId: defaultWatchlistId });
                }
                showCustomAlert(`Migrated ${sharesToMigrate.length} old shares to '${DEFAULT_WATCHLIST_NAME}'.`, 2000);
                console.log("[Migration] Migration complete. Reloading shares.");
                await loadShares(); // Reload shares *after* migration
                return true; // Indicate that migration happened
            }
            console.log("[Migration] No old shares found requiring migration.");
            return false; // Indicate no migration happened
        } catch (error) {
            console.error("[Migration] Error migrating old shares:", error);
            showCustomAlert("Error during share migration: " + error.message);
            return false; // Indicate migration failed
        }
    }


    // Function to re-render the watchlist (table and cards) after sorting or other changes
    function renderWatchlist() {
        console.log(`[Render] Rendering watchlist for currentWatchlistId: ${currentWatchlistId} (Name: ${currentWatchlistName})`);
        clearShareListUI();
        // Filter `allSharesData` based on `currentWatchlistId` before rendering
        const sharesToRender = allSharesData.filter(share => share.watchlistId === currentWatchlistId);
        console.log(`[Render] Shares filtered for rendering. Total shares to render: ${sharesToRender.length}`);
        console.log("[Render] Shares to render details:", sharesToRender); // **This is the new important debug log**

        sharesToRender.forEach((share) => {
            addShareToTable(share);
            if (window.matchMedia("(max-width: 768px)").matches) {
                 addShareToMobileCards(share);
            }
        });
        
        if (selectedShareDocId) {
             const stillExists = sharesToRender.some(share => share.id === selectedShareDocId);
             if (stillExists) {
                selectShare(selectedShareDocId);
             } else {
                deselectCurrentShare();
             }
        } else {
            if (viewDetailsBtn) viewDetailsBtn.disabled = true;
        }
    }

    function clearShareListUI() {
        if (shareTableBody) shareTableBody.innerHTML = '';
        if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
        console.log("[UI] Share list UI cleared.");
    }

    function clearShareList() {
        clearShareListUI();
        if (asxCodeButtonsContainer) asxCodeButtonsContainer.innerHTML = ''; // Clear ASX code buttons
        deselectCurrentShare(); // Ensure selection is cleared
        console.log("[UI] Full share list cleared (UI + buttons).");
    }

    // New function to clear watchlist specific UI elements
    function clearWatchlistUI() {
        if (watchlistSelect) watchlistSelect.innerHTML = '';
        userWatchlists = []; // Clear the internal array
        if (currentWatchlistTitle) currentWatchlistTitle.textContent = 'No Watchlist Selected';
        if (watchlistSelect) watchlistSelect.disabled = true;
        if (addWatchlistBtn) addWatchlistBtn.disabled = true; // Ensure add is disabled too when no watchlists
        if (renameWatchlistBtn) renameWatchlistBtn.disabled = true;
        console.log("[UI] Watchlist UI cleared.");
    }


    // New function to deselect currently highlighted share
    function deselectCurrentShare() {
        document.querySelectorAll('.share-list-section tr.selected, .mobile-share-cards .share-card.selected').forEach(el => {
            el.classList.remove('selected');
        });
        selectedShareDocId = null;
        if (viewDetailsBtn) viewDetailsBtn.disabled = true;
        console.log("[Selection] Share deselected.");
    }

    // --- Watchlist Sorting Logic ---
    function sortShares() {
        const sortValue = sortSelect.value;
        const [field, order] = sortValue.split('-');

        allSharesData.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            // Handle nulls/undefined for numerical fields for robust sorting
            // For 'asc', nulls go to end (treated as very large). For 'desc', nulls go to end (treated as very small).
            if (field === 'lastFetchedPrice' || field === 'dividendAmount' || field === 'currentPrice' || field === 'targetPrice' || field === 'frankingCredits') {
                valA = (valA === null || valA === undefined || isNaN(valA)) ? (order === 'asc' ? Infinity : -Infinity) : valA;
                valB = (valB === null || valB === undefined || isNaN(valB)) ? (order === 'asc' ? Infinity : -Infinity) : valB;
            } else if (field === 'shareName') { // String comparison
                 valA = valA || ''; // Treat null/undefined as empty string
                 valB = valB || '';
                 return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a.shareName);
            }

            if (order === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });
        console.log("[Sort] Shares sorted. Rendering watchlist.");
        renderWatchlist(); // Re-render the UI after sorting
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', sortShares);
    }

    // --- Add Share to UI Functions ---
    function addShareToTable(share) {
        console.log("[Render] addShareToTable: Processing share:", share); // NEW Debug: Full share object before rendering
        const row = shareTableBody.insertRow();
        row.dataset.docId = share.id;

        // Display shareName, or a placeholder if undefined/null/empty
        row.insertCell().textContent = (share.shareName && share.shareName.trim() !== '') ? share.shareName : '(No ASX Code)';

        const priceCell = row.insertCell();
        const priceDisplayDiv = document.createElement('div');
        priceDisplayDiv.className = 'current-price-display';

        const priceValueSpan = document.createElement('span');
        priceValueSpan.className = 'price';
        const displayPrice = (typeof share.lastFetchedPrice === 'number' && !isNaN(share.lastFetchedPrice)) ? `$${share.lastFetchedPrice.toFixed(2)}` : '-';
        priceValueSpan.textContent = displayPrice;

        if (typeof share.lastFetchedPrice === 'number' && typeof share.previousFetchedPrice === 'number' && !isNaN(share.lastFetchedPrice) && !isNaN(share.previousFetchedPrice)) {
            if (share.lastFetchedPrice > share.previousFetchedPrice) {
                priceValueSpan.classList.add('price-up');
            } else if (share.lastFetchedPrice < share.previousFetchedPrice) {
                priceValueSpan.classList.add('price-down');
            } else {
                priceValueSpan.classList.add('price-no-change');
            }
        } else {
            priceValueSpan.classList.add('price-no-change');
        }
        priceDisplayDiv.appendChild(priceValueSpan);

        const formattedDate = formatDate(share.lastPriceUpdateTime);
        if (formattedDate) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = `(${formattedDate})`;
            priceDisplayDiv.appendChild(dateSpan);
        }
        priceCell.appendChild(priceDisplayDiv);

        const displayTargetPrice = (typeof share.targetPrice === 'number' && !isNaN(share.targetPrice)) ? `$${share.targetPrice.toFixed(2)}` : '-';
        row.insertCell().textContent = displayTargetPrice;

        const dividendCell = row.insertCell();
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);
        
        const divAmountDisplay = (typeof share.dividendAmount === 'number' && !isNaN(share.dividendAmount)) ? `$${share.dividendAmount.toFixed(2)}` : '-';

        dividendCell.innerHTML = `
            <div class="dividend-yield-cell-content">
                <span>Dividend Yield:</span> <span class="value">${divAmountDisplay}</span>
            </div>
            <div class="dividend-yield-cell-content">
                <span>Unfranked Yield:</span> <span class="value">${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'}</span>
            </div>
            <div class="dividend-yield-cell-content">
                <span>Franked Yield:</span> <span class="value">${frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'}</span>
            </div>
        `;

        const commentsCell = row.insertCell();
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsCell.textContent = share.comments[0].text;
        } else {
            commentsCell.textContent = '-';
        }

        row.addEventListener('dblclick', function() {
            const docId = this.dataset.docId;
            selectShare(docId, this);
            showShareDetails();
        });

        row.addEventListener('click', function(event) {
            const docId = this.dataset.docId;
            selectShare(docId, this);
        });
        console.log(`[Render] Added share ${share.shareName || '(No Name)'} to table.`); // Updated log for visibility
    }

    function addShareToMobileCards(share) {
        console.log("[Render] addShareToMobileCards: Processing share:", share); // NEW Debug: Full share object before rendering
        if (!window.matchMedia("(max-width: 768px)").matches) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'share-card';
        card.dataset.docId = share.id;

        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);

        let priceClass = 'price-no-change';
        if (typeof share.lastFetchedPrice === 'number' && typeof share.previousFetchedPrice === 'number' && !isNaN(share.lastFetchedPrice) && !isNaN(share.previousFetchedPrice)) {
            if (share.lastFetchedPrice > share.previousFetchedPrice) {
                priceClass = 'price-up';
            } else if (share.lastFetchedPrice < share.previousFetchedPrice) {
                priceClass = 'price-down';
            }
        }

        let commentsSummary = '-';
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsSummary = share.comments[0].text;
        }

        const displayCurrentPrice = (typeof share.lastFetchedPrice === 'number' && !isNaN(share.lastFetchedPrice)) ? share.lastFetchedPrice.toFixed(2) : '-';
        const displayTargetPrice = (typeof share.targetPrice === 'number' && !isNaN(share.targetPrice)) ? share.targetPrice.toFixed(2) : '-';
        const displayDividendAmount = (typeof share.dividendAmount === 'number' && !isNaN(share.dividendAmount)) ? share.dividendAmount.toFixed(2) : '-';
        const displayFrankingCredits = (typeof share.frankingCredits === 'number' && !isNaN(share.frankingCredits)) ? `${share.frankingCredits}%` : '-';

        // Display shareName, or a placeholder if undefined/null/empty
        const displayShareName = (share.shareName && share.shareName.trim() !== '') ? share.shareName : '(No ASX Code)';

        card.innerHTML = `
            <h3>${displayShareName}</h3>
            <p><strong>Entered:</strong> ${formatDate(share.entryDate) || '-'}</p>
            <p><strong>Current:</strong> <span class="${priceClass}">$${displayCurrentPrice}</span> ${formatDate(share.lastPriceUpdateTime) ? `(${formatDate(share.lastPriceUpdateTime)})` : ''}</p>
            <p><strong>Target:</strong> $${displayTargetPrice}</p>
            <p><strong>Dividend Yield:</strong> $${displayDividendAmount}</p>
            <p><strong>Franking:</strong> ${displayFrankingCredits}</p>
            <p><strong>Unfranked Yield:</strong> ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'}</p>
            <p><strong>Franked Yield:</strong> ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'}</p>
            <p class="card-comments"><strong>Comments:</strong> ${commentsSummary}</p>
        `;
        mobileShareCardsContainer.appendChild(card);

        card.addEventListener('touchstart', function(e) {
            touchStartX = e.touches[0].clientX;
            touchStartY = e.touches[0].clientY;
            touchMoved = false;

            clearTimeout(longPressTimer);
            longPressTimer = setTimeout(() => {
                if (!touchMoved) {
                    const docId = e.currentTarget.dataset.docId;
                    selectShare(docId, e.currentTarget);
                    showEditFormForSelectedShare();
                    e.preventDefault();
                }
            }, LONG_PRESS_THRESHOLD);
        });

        card.addEventListener('touchmove', function(e) {
            const currentX = e.touches[0].clientX;
            const currentY = e.touches[0].clientY;
            const dx = Math.abs(currentX - touchStartX);
            const dy = Math.abs(currentY - touchStartY);

            if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
                touchMoved = true;
                clearTimeout(longPressTimer);
            }
        });

        card.addEventListener('touchend', function(e) {
            clearTimeout(longPressTimer);

            if (touchMoved) {
                return;
            }

            const currentTime = new Date().getTime();
            const tapLength = currentTime - lastTapTime;
            const docId = e.currentTarget.dataset.docId;

            if (tapLength < 300 && tapLength > 0 && selectedElementForTap === e.currentTarget) {
                clearTimeout(tapTimeout);
                lastTapTime = 0;
                selectedElementForTap = null;
                selectShare(docId, e.currentTarget);
                showShareDetails();
                e.preventDefault();
            } else {
                lastTapTime = currentTime;
                selectedElementForTap = e.currentTarget;
                tapTimeout = setTimeout(() => {
                    if (selectedElementForTap) {
                        selectShare(docId, selectedElementForTap);
                        selectedElementForTap = null;
                    }
                }, 300);
            }
        });
        console.log(`[Render] Added share ${share.shareName || '(No Name)'} to mobile cards.`); // Updated log for visibility
    }

    function selectShare(docId, element = null) {
        document.querySelectorAll('.share-list-section tr.selected, .mobile-share-cards .share-card.selected').forEach(el => {
            el.classList.remove('selected');
        });

        if (element) {
            element.classList.add('selected');
        } else {
            const row = shareTableBody.querySelector(`tr[data-doc-id="${docId}"]`);
            if (row) row.classList.add('selected');
            const card = mobileShareCardsContainer.querySelector(`.share-card[data-doc-id="${docId}"]`);
            if (card) card.classList.add('selected');
        }

        selectedShareDocId = docId;
        if (viewDetailsBtn) {
            viewDetailsBtn.disabled = (selectedShareDocId === null);
        }
        console.log("[Selection] Selected Share Doc ID set to:", selectedShareDocId);
    }


    // --- Form Modal Functions (Add/Edit Share) ---
    function showShareForm(isEdit = false) {
        if (!shareFormSection) return;
        clearForm();
        deleteShareFromFormBtn.disabled = !isEdit;
        formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share';
        showModal(shareFormSection);

        if (!isEdit || (isEdit && commentsFormContainer.querySelectorAll('.comment-input-group').length === 0)) {
            addCommentSection();
        }
        console.log(`[Form] Showing share form: Is Edit = ${isEdit}`);
    }

    function clearForm() {
        formInputs.forEach(input => {
            if (input) input.value = '';
        });
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = '';
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => group.remove());
        console.log("[Form] Form cleared.");
    }

    function populateForm(share) {
        console.log("[Form] populateForm: Received share object:", share);
        if (!share) {
            console.error("[Form] populateForm: Received null or undefined share object. Cannot populate form.");
            return;
        }

        shareNameInput.value = share.shareName || '';
        currentPriceInput.value = (typeof share.currentPrice === 'number' && !isNaN(share.currentPrice)) ? share.currentPrice : '';
        targetPriceInput.value = (typeof share.targetPrice === 'number' && !isNaN(share.targetPrice)) ? share.targetPrice : '';
        dividendAmountInput.value = (typeof share.dividendAmount === 'number' && !isNaN(share.dividendAmount)) ? share.dividendAmount : '';
        frankingCreditsInput.value = (typeof share.frankingCredits === 'number' && !isNaN(share.frankingCredits)) ? share.frankingCredits : '';
        document.getElementById('editDocId').value = share.id || '';
        selectedShareDocId = share.id;

        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => group.remove());

        if (share.comments && Array.isArray(share.comments)) {
            share.comments.forEach(comment => {
                addCommentSection(comment.title, comment.text);
            });
        }
        if (!share.comments || share.comments.length === 0) {
            addCommentSection();
        }
        console.log("[Form] Form populated for share ID:", share.id);
    }

    function handleCancelForm() {
        clearForm();
        hideModal(shareFormSection);
        console.log("[Form] Form canceled.");
    }

    // --- Dynamic Comment Section Management in Form ---
    if (addCommentSectionBtn) {
        addCommentSectionBtn.addEventListener('click', () => addCommentSection());
    }

    function addCommentSection(title = '', text = '') {
        const groupDiv = document.createElement('div');
        groupDiv.className = 'comment-input-group';

        const titleInput = document.createElement('input');
        titleInput.type = 'text';
        titleInput.placeholder = 'Comment Section Title';
        titleInput.value = title;
        titleInput.className = 'comment-title-input';

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.className = 'remove-section-btn';
        removeButton.addEventListener('click', () => groupDiv.remove());

        const textArea = document.createElement('textarea');
        textArea.placeholder = 'Your comments for this section...';
        textArea.value = text;
        textArea.className = 'comment-text-input';

        groupDiv.appendChild(removeButton);
        groupDiv.appendChild(titleInput);
        groupDiv.appendChild(textArea);

        commentsFormContainer.appendChild(groupDiv);
        console.log("[Form] Added new comment section.");
    }

    // --- Data Operations (Add, Update, Delete) ---
    async function saveShare() {
        if (!db || !currentUserId || !currentWatchlistId) {
            showCustomAlert("You need to sign in and have an active watchlist to save shares. Please sign in with Google.");
            console.error("[Save] Save failed: DB, User ID, or Watchlist ID missing.", { db, currentUserId, currentWatchlistId });
            return;
        }

        saveShareBtn.disabled = true;

        const shareName = shareNameInput.value.trim().toUpperCase();
        const currentPrice = parseFloat(currentPriceInput.value);
        const targetPrice = parseFloat(targetPriceInput.value);
        const dividendAmount = parseFloat(dividendAmountInput.value);
        const frankingCredits = parseFloat(frankingCreditsInput.value);

        const comments = [];
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => {
            const title = group.querySelector('.comment-title-input').value.trim();
            const text = group.querySelector('.comment-text-input').value.trim();
            if (title || text) {
                comments.push({ title: title, text: text });
            }
        });

        if (!shareName) {
            showCustomAlert("Share Name (ASX Code) is required.");
            saveShareBtn.disabled = false;
            return;
        }

        const docId = document.getElementById('editDocId').value;
        const now = new Date().toISOString();

        const shareData = {
            shareName,
            currentPrice: isNaN(currentPrice) ? null : currentPrice,
            targetPrice: isNaN(targetPrice) ? null : targetPrice,
            dividendAmount: isNaN(dividendAmount) ? null : dividendAmount,
            frankingCredits: isNaN(frankingCredits) ? null : frankingCredits,
            comments: comments,
            userId: currentUserId,
            entryDate: new Date().toISOString().split('T')[0],
            lastFetchedPrice: isNaN(currentPrice) ? null : currentPrice,
            previousFetchedPrice: isNaN(currentPrice) ? null : currentPrice,
            lastPriceUpdateTime: now,
            watchlistId: currentWatchlistId
        };

        try {
            if (docId) {
                const shareDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.updateDoc(shareDocRef, shareData);
                console.log("[Save] Share updated successfully:", docId, shareData);
                showCustomAlert("Share updated successfully!");
            } else {
                const sharesColRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
                await window.firestore.addDoc(sharesColRef, shareData);
                console.log("[Save] Share added successfully:", shareData);
                showCustomAlert("Share added successfully!");
            }
            hideModal(shareFormSection);
            await loadShares();
            deselectCurrentShare();
        } catch (error) {
            console.error("[Save] Error saving share:", error, error.message);
            showCustomAlert("Error saving share: " + error.message);
        } finally {
            saveShareBtn.disabled = false;
        }
    }

    async function deleteShare() {
        if (!selectedShareDocId || !db || !currentUserId) {
            showCustomAlert("No share selected for deletion or you are not signed in.");
            console.error("[Delete] Deletion failed: No share selected or user not signed in.");
            return;
        }

        try {
            const shareDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, selectedShareDocId);
            await window.firestore.deleteDoc(shareDocRef);
            console.log("[Delete] Share deleted successfully:", selectedShareDocId);
            showCustomAlert("Share deleted successfully!");
            hideModal(shareFormSection);
            await loadShares();
            deselectCurrentShare();
        } catch (error) {
            console.error("[Delete] Error deleting share:", error, error.message);
            showCustomAlert("Error deleting share: " + error.message);
        }
    }

    // --- Display Share Detail Modal ---
    function showShareDetails() {
        if (!selectedShareDocId) {
            showCustomAlert("Please select a share to view details.");
            return;
        }

        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        console.log("[Details] Attempting to show details for selectedShareDocId:", selectedShareDocId);
        console.log("[Details] Found selectedShare object:", selectedShare);

        if (selectedShare) {
            modalShareName.textContent = selectedShare.shareName || '-';
            modalEntryDate.textContent = formatDate(selectedShare.entryDate) || '-';

            const currentPriceVal = selectedShare.lastFetchedPrice;
            const prevPriceVal = selectedShare.previousFetchedPrice;
            let priceText = (typeof currentPriceVal === 'number' && !isNaN(currentPriceVal)) ? `$${currentPriceVal.toFixed(2)}` : '-';
            let changeText = '';
            let changeClass = '';

            if (typeof currentPriceVal === 'number' && typeof prevPriceVal === 'number' && !isNaN(currentPriceVal) && !isNaN(prevPriceVal) && prevPriceVal !== 0) {
                const changeAmount = currentPriceVal - prevPriceVal;
                const changePercent = (changeAmount / prevPriceVal) * 100;
                changeText = `(${changeAmount >= 0 ? '+' : ''}$${changeAmount.toFixed(2)} / ${changeAmount >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
                if (changeAmount > 0) changeClass = 'price-up';
                else if (changeAmount < 0) changeClass = 'price-down';
                else changeClass = 'price-no-change';
            } else if (typeof currentPriceVal === 'number' && !isNaN(currentPriceVal)) {
                changeText = '';
                changeClass = 'price-no-change';
            }

            modalCurrentPriceDetailed.innerHTML = `
                <span class="price-value ${changeClass}">${priceText}</span>
                <span class="price-change ${changeClass}">${changeText}</span><br>
                <span class="last-updated-date">Last Updated: ${formatDateTime(selectedShare.lastPriceUpdateTime) || '-'}</span>
            `;

            modalTargetPrice.textContent = (typeof selectedShare.targetPrice === 'number' && !isNaN(selectedShare.targetPrice)) ? `$${selectedShare.targetPrice.toFixed(2)}` : '-';
            modalDividendAmount.textContent = (typeof selectedShare.dividendAmount === 'number' && !isNaN(selectedShare.dividendAmount)) ? `$${selectedShare.dividendAmount.toFixed(2)}` : '-';
            modalFrankingCredits.textContent = (typeof selectedShare.frankingCredits === 'number' && !isNaN(selectedShare.frankingCredits)) ? `${selectedShare.frankingCredits}%` : '-';

            const unfrankedYield = calculateUnfrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice);
            const frankedYield = calculateFrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice, selectedShare.frankingCredits);

            modalUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-';
            modalFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-';

            renderModalComments(selectedShare.comments);

            showModal(shareDetailModal);
        } else {
            console.error("[Details] Selected share data not found for ID:", selectedShareDocId);
            showCustomAlert("Selected share data not found.");
        }
    }

    // Renders structured comments in the detail modal (full text)
    function renderModalComments(commentsArray) {
        modalCommentsContainer.innerHTML = '<h3>Detailed Comments</h3>';

        if (commentsArray && Array.isArray(commentsArray) && commentsArray.length > 0) {
            commentsArray.forEach(commentSection => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'comment-section';

                const sectionTitle = document.createElement('h4');
                sectionTitle.textContent = commentSection.title || 'Untitled Section';

                const sectionText = document.createElement('p');
                sectionText.textContent = commentSection.text || '-';

                sectionDiv.appendChild(sectionTitle);
                sectionDiv.appendChild(sectionText);
                modalCommentsContainer.appendChild(sectionDiv);
            });
        } else {
            const noComments = document.createElement('p');
            noComments.textContent = '-';
            noComments.style.fontStyle = 'italic';
            noComments.style.color = '#777';
            modalCommentsContainer.appendChild(noComments);
        }
    }

    function showEditFormForSelectedShare() {
        if (!selectedShareDocId) {
            showCustomAlert("Please select a share to edit.");
            return;
        }
        
        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        
        console.log("[Form] showEditFormForSelectedShare: Attempting to show edit form for selectedShareDocId:", selectedShareDocId);
        console.log("[Form] showEditFormForSelectedShare: Found selectedShare object for edit:", selectedShare);

        if (selectedShare) {
            setTimeout(() => {
                populateForm(selectedShare);
            }, 50);
            showShareForm(true);
        } else {
            console.error("[Form] showEditFormForSelectedShare: Selected share data not found in allSharesData for ID:", selectedShareDocId);
            showCustomAlert("Selected share data not found for editing. Please ensure a share is selected.");
        }
    }

    // --- Edit Share button in Detail Modal ---
    if (editShareFromDetailBtn) {
        editShareFromDetailBtn.addEventListener('click', () => {
            console.log("[UI] Edit Share button in detail modal clicked.");
            hideModal(shareDetailModal);
            showEditFormForSelectedShare();
        });
    }

    // --- Dividend Calculator Logic ---
    function calculateUnfrankedYield(dividend, price) {
        if (typeof dividend !== 'number' || typeof price !== 'number' || price <= 0 || isNaN(dividend) || isNaN(price)) {
            return null;
        }
        return (dividend / price) * 100;
    }

    function calculateFrankedYield(dividend, price, franking) {
        if (typeof dividend !== 'number' || typeof price !== 'number' || price <= 0 || isNaN(dividend) || isNaN(price)) {
            return null;
        }
        const effectiveFranking = (typeof franking === 'number' && franking >= 0 && franking <= 100 && !isNaN(franking)) ? (franking / 100) : 0;
        const grossedUpDividend = dividend / (1 - (0.3 * effectiveFranking));
        return (grossedUpDividend / price) * 100;
    }

    function calculateEstimatedDividendFromInvestment(investmentValue, dividendPerShare, currentPrice) {
        if (typeof investmentValue !== 'number' || typeof dividendPerShare !== 'number' || typeof currentPrice !== 'number' || currentPrice <= 0 || isNaN(investmentValue) || isNaN(dividendPerShare) || isNaN(currentPrice)) {
            return null;
        }
        const numberOfShares = investmentValue / currentPrice;
        return numberOfShares * dividendPerShare;
    }


    function updateDividendCalculations() {
        const dividend = parseFloat(calcDividendAmountInput.value);
        const price = parseFloat(calcCurrentPriceInput.value);
        const franking = parseFloat(calcFrankingCreditsInput.value);
        const investmentValue = parseFloat(investmentValueSelect.value);

        const unfrankedYield = calculateUnfrankedYield(dividend, price);
        const frankedYield = calculateFrankedYield(dividend, price, franking);
        const estimatedDividend = calculateEstimatedDividendFromInvestment(investmentValue, dividend, price);

        calcUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-';
        calcFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-';
        calcEstimatedDividend.textContent = estimatedDividend !== null ? `$${estimatedDividend.toFixed(2)}` : '-';
    }

    if (calcDividendAmountInput) calcDividendAmountInput.addEventListener('input', updateDividendCalculations);
    if (calcCurrentPriceInput) calcCurrentPriceInput.addEventListener('input', updateDividendCalculations);
    if (calcFrankingCreditsInput) calcFrankingCreditsInput.addEventListener('input', updateDividendCalculations);
    if (investmentValueSelect) investmentValueSelect.addEventListener('change', updateDividendCalculations);

    // --- Main Application Button Event Listeners ---
    if (newShareBtn) {
        newShareBtn.addEventListener('click', () => {
            console.log("[UI] Add button clicked.");
            showShareForm(false);
        });
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            console.log("[UI] View Details button clicked. Selected Share ID:", selectedShareDocId);
            showShareDetails();
        });
    }

    if (saveShareBtn) {
        saveShareBtn.addEventListener('click', saveShare);
    }

    if (deleteShareFromFormBtn) {
        deleteShareFromFormBtn.addEventListener('click', deleteShare);
    }

    if (standardCalcBtn) {
        standardCalcBtn.addEventListener('click', () => {
            console.log("[UI] Standard Calculator button clicked. Opening in-app calculator.");
            resetCalculator();
            showModal(calculatorModal);
        });
    }

    if (dividendCalcBtn) {
        dividendCalcBtn.addEventListener('click', () => {
            console.log("[UI] Dividend Calculator button clicked.");
            if (calcDividendAmountInput) calcDividendAmountInput.value = '';
            if (calcCurrentPriceInput) calcCurrentPriceInput.value = '';
            if (calcFrankingCreditsInput) calcFrankingCreditsInput.value = '';
            if (investmentValueSelect) investmentValueSelect.value = '10000';
            updateDividendCalculations();
            showModal(dividendCalculatorModal);
        });
    }

    // --- In-App Calculator Logic ---
    function updateCalculatorDisplay() {
        calculatorInput.textContent = previousInput + (operator ? (operator === 'divide' ? ' ÷ ' : operator === 'multiply' ? ' × ' : operator === 'add' ? ' + ' : ' - ') : '') + currentInput;
        calculatorResult.textContent = currentInput || '0';
    }

    function resetCalculator() {
        currentInput = '';
        operator = null;
        previousInput = '';
        resultDisplayed = false;
        updateCalculatorDisplay();
    }

    calculatorButtons.addEventListener('click', (event) => {
        const target = event.target;
        if (!target.classList.contains('calc-btn')) return;

        const value = target.dataset.value;
        const action = target.dataset.action;

        if (action === 'clear') {
            resetCalculator();
        } else if (action === 'calculate') {
            if (operator && previousInput !== '' && currentInput !== '') {
                let result;
                const prev = parseFloat(previousInput);
                const curr = parseFloat(currentInput);

                switch (operator) {
                    case 'add':
                        result = prev + curr;
                        break;
                    case 'subtract':
                        result = prev - curr;
                        break;
                    case 'multiply':
                        result = prev * curr;
                        break;
                    case 'divide':
                        if (curr === 0) {
                            showCustomAlert("Cannot divide by zero!");
                            resetCalculator();
                            return;
                        }
                        result = prev / curr;
                        break;
                    default:
                        return;
                }
                currentInput = String(result);
                operator = null;
                previousInput = '';
                resultDisplayed = true;
                updateCalculatorDisplay();
            }
        } else if (action === 'percentage') {
            if (currentInput !== '') {
                currentInput = String(parseFloat(currentInput) / 100);
            } else if (previousInput !== '') {
                currentInput = String(parseFloat(previousInput) / 100);
                previousInput = '';
                operator = null;
            }
            resultDisplayed = true;
            updateCalculatorDisplay();
        }
        else if (target.classList.contains('number')) {
            if (resultDisplayed) {
                currentInput = value;
                resultDisplayed = false;
            } else {
                currentInput += value;
            }
            updateCalculatorDisplay();
        } else if (target.classList.contains('operator')) {
            if (currentInput === '' && previousInput !== '') {
                operator = action;
            } else if (currentInput !== '') {
                if (previousInput === '') {
                    previousInput = currentInput;
                } else {
                    let result;
                    const prev = parseFloat(previousInput);
                    const curr = parseFloat(currentInput);
                    switch (operator) {
                        case 'add': result = prev + curr; break;
                        case 'subtract': result = prev - curr; break;
                        case 'multiply': result = prev * curr; break;
                        case 'divide':
                            if (curr === 0) { showCustomAlert("Cannot divide by zero!"); resetCalculator(); return; }
                            result = prev / curr; break;
                        default: return;
                    }
                    previousInput = String(result);
                }
                currentInput = '';
                operator = action;
            }
            resultDisplayed = false;
            updateCalculatorDisplay();
        } else if (target.classList.contains('decimal')) {
            if (resultDisplayed) {
                currentInput = '0.';
                resultDisplayed = false;
            } else if (!currentInput.includes('.')) {
                if (currentInput === '') {
                    currentInput = '0.';
                } else {
                    currentInput += '.';
                }
            }
            updateCalculatorDisplay();
        }
    });


    // --- Function to Populate and Update the ASX Code Buttons (above watchlist) ---
    function renderAsxCodeButtons() {
        if (!asxCodeButtonsContainer) return;
        asxCodeButtonsContainer.innerHTML = '';

        const sharesInCurrentWatchlist = allSharesData.filter(share => share.watchlistId === currentWatchlistId);

        if (sharesInCurrentWatchlist.length === 0) {
            const noSharesMsg = document.createElement('div');
            noSharesMsg.textContent = 'Add your first share to this watchlist!';
            noSharesMsg.style.padding = '5px 15px';
            noSharesMsg.style.textAlign = 'center';
            noSharesMsg.style.color = '#555';
            noSharesMsg.style.fontSize = '0.9em';
            asxCodeButtonsContainer.appendChild(noSharesMsg);
            console.log("[UI] No shares in current watchlist. Displaying 'add first share' message.");
            return;
        }

        const sortedShares = [...sharesInCurrentWatchlist].sort((a, b) => {
            // Sort by shareName, treating empty/null/undefined as a known string for sorting purposes
            const nameA = (a.shareName && a.shareName.trim() !== '') ? a.shareName : '\uffff'; // Sort 'No Code' last
            const nameB = (b.shareName && b.shareName.trim() !== '') ? b.shareName : '\uffff'; // \uffff is a high unicode character

            return nameA.localeCompare(nameB);
        });

        sortedShares.forEach(share => {
            const button = document.createElement('button');
            // Display shareName, or a placeholder if undefined/null/empty
            button.textContent = (share.shareName && share.shareName.trim() !== '') ? share.shareName : '(No Code)';
            button.className = 'asx-code-button';
            button.addEventListener('click', (event) => {
                event.stopPropagation();
                selectShare(share.id);
                showShareDetails();
            });
            asxCodeButtonsContainer.appendChild(button);
        });
        console.log(`[UI] Rendered ${sortedShares.length} ASX code buttons.`);
    }
});
