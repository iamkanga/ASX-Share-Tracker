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
    let currentAppId = null; // Initialize as null, will be set from window.getFirebaseAppId()
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
    let currentWatchlistName = DEFAULT_WATCHLIST_NAME; // Initialize with default name


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
        // Assign global instances to local variables *first*
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        currentAppId = window.getFirebaseAppId(); // Set appId here, will also be re-set in auth listener for robustness

        // Debugging logs to confirm initial values
        console.log("Firebase services ready. Initial values:");
        console.log("db is defined:", !!db);
        console.log("auth is defined:", !!auth);
        console.log("currentAppId:", currentAppId);

        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                // Re-assign currentAppId here as a failsafe, although it should already be set from firebaseServicesReady
                currentAppId = window.getFirebaseAppId(); // Ensure this is also re-read

                // CRITICAL DEBUGGING: Explicit checks before any Firestore operations
                console.log("User signed in. Checking critical variables before loading watchlists:");
                console.log("db:", db);
                console.log("currentUserId:", currentUserId);
                console.log("currentAppId:", currentAppId);

                // Ensure all required variables are present and strings
                if (!db || typeof currentUserId !== 'string' || !currentUserId || typeof currentAppId !== 'string' || !currentAppId) {
                    console.error("CRITICAL ERROR: Essential Firebase variables are undefined/null/not strings AFTER sign-in. Cannot proceed with data loading.");
                    showCustomAlert("App initialization error. Please refresh and ensure you are signed in. Details: DB, UserID, or AppID missing.", 3000);
                    clearShareList();
                    clearWatchlistUI();
                    if (loadingIndicator) loadingIndicator.style.display = 'none';
                    return; // Abort if critical dependencies are missing
                }

                updateAuthButtonText(true, user.email || user.displayName); // Pass user info to update button text
                console.log("User signed in:", currentUserId);

                if (user.email && user.email.toLowerCase() === KANGA_EMAIL) {
                    mainTitle.textContent = "Kangas ASX Share Watchlist";
                } else {
                    mainTitle.textContent = "My ASX Share Watchlist";
                }
                
                updateMainButtonsState(true);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                
                // Pass db, currentAppId, currentUserId explicitly to loadUserWatchlists
                await loadUserWatchlists(db, currentAppId, currentUserId);
            } else {
                currentUserId = null;
                updateAuthButtonText(false); // No user info needed for sign out state
                mainTitle.textContent = "My ASX Share Watchlist";
                console.log("User signed out.");
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
                    console.log("User signed out.");
                } catch (error) {
                    console.error("Sign-Out failed:", error);
                    showCustomAlert("Sign-Out failed: " + error.message);
                }
            } else if (auth) { // User is not signed in, so this is a Sign In action
                try {
                    const provider = window.authFunctions.GoogleAuthProviderInstance;
                    if (!provider) {
                        console.error("GoogleAuthProvider instance not found.");
                        showCustomAlert("Authentication service not ready. Please try again.");
                        return;
                    }
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("Google Sign-In successful.");
                }
                catch (error) {
                    console.error("Google Sign-In failed:", error.message);
                    showCustomAlert("Google Sign-In failed: " + error.message);
                }
            } else {
                 console.warn("Auth service not initialized when Google Auth Button clicked.");
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
        // Ensure userId is a non-empty string before using it
        if (typeof userId !== 'string' || !userId) {
            console.error("getDefaultWatchlistId: Invalid userId provided:", userId);
            // Return a safe fallback ID, but this indicates a deeper issue if hit
            return `invalid_user_id_${DEFAULT_WATCHLIST_ID_SUFFIX}`;
        }
        return `${userId}_${DEFAULT_WATCHLIST_ID_SUFFIX}`;
    }

    // Load watchlists from Firestore and set the current one
    async function loadUserWatchlists(_db, _appId, _userId) { // Accept parameters explicitly
        console.log("Entering loadUserWatchlists. Debug values (passed as arguments):");
        console.log("_db defined:", !!_db);
        console.log("_userId:", _userId, " (Type:", typeof _userId, ")");
        console.log("_appId:", _appId, " (Type:", typeof _appId, ")");

        // Comprehensive check for essential variables
        if (!_db || typeof _userId !== 'string' || !_userId || typeof _appId !== 'string' || !_appId) {
            console.error("loadUserWatchlists: Essential Firebase variables are undefined/null/not strings. Aborting.");
            showCustomAlert("Cannot load watchlists. Please ensure you are signed in and refresh the page. Details: DB, UserID, or AppID missing.", 3000);
            clearShareList();
            clearWatchlistUI();
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        userWatchlists = []; // Clear existing watchlists
        // Correct path for watchlists: artifacts/{_appId}/users/{_userId}/watchlists
        // Explicit String() conversion for path segments
        const watchlistsColPath = `artifacts/${String(_appId)}/users/${String(_userId)}/watchlists`;
        console.log("loadUserWatchlists: Attempting to get collection at path:", watchlistsColPath); // New debug log
        const watchlistsColRef = window.firestore.collection(_db, watchlistsColPath);

        try {
            const querySnapshot = await window.firestore.getDocs(watchlistsColRef);
            querySnapshot.forEach(doc => {
                userWatchlists.push({ id: doc.id, name: doc.data().name });
            });

            // If no watchlists exist, create a default one
            if (userWatchlists.length === 0) {
                const defaultWatchlistId = getDefaultWatchlistId(_userId); // Use explicitly validated _userId
                console.log("Creating default watchlist with ID:", defaultWatchlistId); // Debugging
                const defaultWatchlistDocPath = `artifacts/${String(_appId)}/users/${String(_userId)}/watchlists/${String(defaultWatchlistId)}`;
                console.log("loadUserWatchlists: Attempting to set default doc at path:", defaultWatchlistDocPath); // New debug log
                const defaultWatchlistRef = window.firestore.doc(_db, defaultWatchlistDocPath);
                await window.firestore.setDoc(defaultWatchlistRef, { name: DEFAULT_WATCHLIST_NAME, createdAt: new Date().toISOString(), userId: _userId });
                userWatchlists.push({ id: defaultWatchlistId, name: DEFAULT_WATCHLIST_NAME });
                console.log("Created default watchlist successfully.");
            }

            // Sort watchlists alphabetically by name
            userWatchlists.sort((a, b) => a.name.localeCompare(b.name));

            // Set current watchlist to the first one or default
            currentWatchlistId = userWatchlists[0] ? userWatchlists[0].id : null;
            if (currentWatchlistId) {
                // Ensure currentWatchlistName is up-to-date with the actual name
                const currentWatchlistObj = userWatchlists.find(w => w.id === currentWatchlistId);
                if (currentWatchlistObj) {
                    currentWatchlistName = currentWatchlistObj.name;
                }
            } else {
                currentWatchlistName = 'No Watchlist Selected'; // Should not happen if default is created
            }

            renderWatchlistSelect(); // Populate the dropdown
            updateMainButtonsState(true); // Re-enable buttons
            // Call loadShares with the same explicitly passed variables for consistency
            await loadShares(_db, _appId, _userId); 
            await migrateOldSharesToWatchlist(_db, _appId, _userId); // Also pass for migration
        } catch (error) {
            console.error("Error loading user watchlists:", error);
            showCustomAlert("Error loading watchlists. Please check your internet connection and Firebase Security Rules. Error: " + error.message, 3000);
        } finally {
            // Ensure loading indicator is hidden even on error
            if (loadingIndicator) loadingIndicator.style.display = 'none';
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
        } else if (userWatchlists.length > 0) {
            // If currentWatchlistId is somehow null but watchlists exist, select the first one
            watchlistSelect.value = userWatchlists[0].id;
            currentWatchlistId = userWatchlists[0].id;
            currentWatchlistName = userWatchlists[0].name;
            if (currentWatchlistTitle) currentWatchlistTitle.textContent = userWatchlists[0].name;
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
                await loadShares(db, currentAppId, currentUserId); // Pass current global vars
            }
        });
    }

    // Add new watchlist handler
    if (addWatchlistBtn) {
        addWatchlistBtn.addEventListener('click', async () => {
            // Ensure global variables are set and are strings before use
            if (!db || typeof currentUserId !== 'string' || !currentUserId || typeof currentAppId !== 'string' || !currentAppId) {
                showCustomAlert("Please sign in and ensure app is fully loaded to add a watchlist. Details: DB, UserID, or AppID missing.", 3000);
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
                    // Correct path for watchlists: artifacts/{appId}/users/{userId}/watchlists
                    const watchlistsColPath = `artifacts/${String(currentAppId)}/users/${String(currentUserId)}/watchlists`;
                    console.log("addWatchlistBtn: Attempting to add doc to collection at path:", watchlistsColPath); // New debug log
                    const watchlistsColRef = window.firestore.collection(db, watchlistsColPath);
                    const newWatchlistDocRef = await window.firestore.addDoc(watchlistsColRef, {
                        name: newWatchlistName.trim(),
                        createdAt: new Date().toISOString(),
                        userId: currentUserId // Ensure userId is stored with watchlist
                    });
                    showCustomAlert(`Watchlist '${newWatchlistName}' added.`);
                    await loadUserWatchlists(db, currentAppId, currentUserId); // Reload watchlists to update UI and select new one
                    watchlistSelect.value = newWatchlistDocRef.id; // Select the newly created watchlist
                    currentWatchlistId = newWatchlistDocRef.id;
                    currentWatchlistName = newWatchlistName.trim();
                    if (currentWatchlistTitle) currentWatchlistTitle.textContent = currentWatchlistName;
                    await loadShares(db, currentAppId, currentUserId); // Load shares for the new watchlist (will be empty)
                } catch (error) {
                    console.error("Error adding watchlist:", error);
                    showCustomAlert("Failed to add watchlist: " + error.message, 3000);
                }
            } else if (newWatchlistName !== null) { // If user clicked OK but entered empty string
                showCustomAlert("Watchlist name cannot be empty.");
            }
        });
    }

    // Rename watchlist handler
    if (renameWatchlistBtn) {
        renameWatchlistBtn.addEventListener('click', async () => {
            // Ensure global variables are set and are strings before use
            if (!currentWatchlistId || typeof currentUserId !== 'string' || !currentUserId || !db || typeof currentAppId !== 'string' || !currentAppId) {
                showCustomAlert("Please select a watchlist to rename or sign in. Details: DB, UserID, or AppID missing.", 3000);
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
                    // Correct path for watchlists: artifacts/{appId}/users/{userId}/watchlists
                    const watchlistDocPath = `artifacts/${String(currentAppId)}/users/${String(currentUserId)}/watchlists/${String(currentWatchlistId)}`;
                    console.log("renameWatchlistBtn: Attempting to update doc at path:", watchlistDocPath); // New debug log
                    const watchlistDocRef = window.firestore.doc(db, watchlistDocPath);
                    await window.firestore.updateDoc(watchlistDocRef, { name: newWatchlistName.trim() });
                    showCustomAlert(`Watchlist renamed to '${newWatchlistName}'.`);
                    await loadUserWatchlists(db, currentAppId, currentUserId); // Reload watchlists to update dropdown
                    // Ensure the dropdown still shows the renamed watchlist
                    watchlistSelect.value = currentWatchlistId;
                    currentWatchlistName = newWatchlistName.trim();
                    if (currentWatchlistTitle) currentWatchlistTitle.textContent = currentWatchlistName;
                } catch (error) {
                    console.error("Error renaming watchlist:", error);
                    showCustomAlert("Failed to rename watchlist: " + error.message, 3000);
                }
            } else if (newWatchlistName !== null && newWatchlistName.trim() === '') {
                showCustomAlert("Watchlist name cannot be empty.");
            }
        });
    }

    // --- Share Data Management Functions ---
    async function loadShares(_db, _appId, _userId) { // Accept parameters explicitly
        console.log("Entering loadShares. Debug values (passed as arguments):");
        console.log("_db defined:", !!_db);
        console.log("_userId:", _userId, " (Type:", typeof _userId, ")");
        console.log("_appId:", _appId, " (Type:", typeof _appId, ")");
        console.log("currentWatchlistId:", currentWatchlistId, " (Type:", typeof currentWatchlistId, ")");

        // Comprehensive check for essential variables
        if (!_db || typeof _userId !== 'string' || !_userId || typeof _appId !== 'string' || !_appId || typeof currentWatchlistId !== 'string' || !currentWatchlistId) {
            console.warn("loadShares: Essential Firebase variables are undefined/null/not strings. Clearing list. Details: DB, UserID, AppID, or WatchlistID missing.");
            clearShareList();
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        allSharesData = []; // Clear previous data from the array

        try {
            // Use passed _db and ensure shares collection path is correctly formed
            const sharesColPath = `artifacts/${String(_appId)}/users/${String(_userId)}/shares`;
            console.log("loadShares: Attempting to get collection at path:", sharesColPath); // New debug log
            const sharesCol = window.firestore.collection(_db, sharesColPath);
            
            // Filter shares by userId AND currentWatchlistId
            const q = window.firestore.query(
                sharesCol,
                window.firestore.where("userId", "==", _userId), // Use passed _userId
                window.firestore.where("watchlistId", "==", currentWatchlistId) // Filter by active watchlist
            );
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                const share = { id: doc.id, ...doc.data() };
                allSharesData.push(share);
            });
            console.log("Shares loaded successfully for watchlist:", currentWatchlistName, ". Total shares:", allSharesData.length);
            console.log("All shares data:", allSharesData);


            sortShares(); // This will also call renderWatchlist()
            renderAsxCodeButtons(); // Render ASX Code buttons
        } catch (error) {
            console.error("Error loading shares:", error);
            showCustomAlert("Error loading shares. Please check your internet connection and sign-in status. Error: " + error.message, 3000);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // One-time migration function for old shares without a watchlistId
    async function migrateOldSharesToWatchlist(_db, _appId, _userId) { // Accept parameters explicitly
        // Comprehensive check for essential variables
        if (!_db || typeof _userId !== 'string' || !_userId || typeof _appId !== 'string' || !_appId) {
            console.warn("Migration skipped: DB, User ID, or App ID not available or not strings.");
            return;
        }

        // Use passed _db and ensure shares collection path is correctly formed
        const sharesColPath = `artifacts/${String(_appId)}/users/${String(_userId)}/shares`;
        console.log("migrateOldSharesToWatchlist: Attempting to get collection at path:", sharesColPath); // New debug log
        const sharesCol = window.firestore.collection(_db, sharesColPath);

        // Query for shares belonging to the current user that DO NOT have a 'watchlistId' field
        // To handle shares that existed before the `watchlistId` field was introduced.
        // We cannot directly query for missing fields in Firestore.
        // So, we'll fetch all shares for the user and filter client-side.
        const q = window.firestore.query(
            sharesCol,
            window.firestore.where("userId", "==", _userId) // Use passed _userId
        );

        let sharesToMigrate = [];
        try {
            const querySnapshot = await window.firestore.getDocs(q);
            querySnapshot.forEach(doc => {
                const shareData = doc.data();
                // Check if share belongs to current user AND does NOT have a watchlistId
                if (shareData.userId === _userId && !shareData.hasOwnProperty('watchlistId')) { // Use passed _userId
                    sharesToMigrate.push({ id: doc.id, ref: doc.ref });
                }
            });

            if (sharesToMigrate.length > 0) {
                console.log(`Migrating ${sharesToMigrate.length} old shares to '${DEFAULT_WATCHLIST_NAME}'.`);
                const defaultWatchlistIdForMigration = getDefaultWatchlistId(_userId); // Use explicitly validated _userId
                for (const share of sharesToMigrate) {
                    console.log("migrateOldSharesToWatchlist: Migrating share ID:", share.id, " to watchlist ID:", defaultWatchlistIdForMigration); // New debug log
                    await window.firestore.updateDoc(share.ref, { watchlistId: defaultWatchlistIdForMigration });
                }
                showCustomAlert(`Migrated ${sharesToMigrate.length} old shares to '${DEFAULT_WATCHLIST_NAME}'.`, 2000); // Slightly longer alert for migration
                await loadShares(_db, _appId, _userId); // Reload all shares after migration with explicit params
            }
        } catch (error) {
            console.error("Error migrating old shares:", error);
            // Don't block app functionality for migration errors
        }
    }


    // Function to re-render the watchlist (table and cards) after sorting or other changes
    function renderWatchlist() {
        clearShareListUI();
        // Filter `allSharesData` based on `currentWatchlistId` before rendering
        const sharesToRender = allSharesData.filter(share => share.watchlistId === currentWatchlistId);

        sharesToRender.forEach((share) => {
            addShareToTable(share);
            // Only add to mobile cards if on a mobile viewport
            if (window.matchMedia("(max-width: 768px)").matches) {
                 addShareToMobileCards(share);
            }
        });
        // Do not automatically select after re-rendering.
        // The deselectCurrentShare() function will handle clearing selection.
        if (selectedShareDocId) {
             // If a share was previously selected, try to re-select it if it still exists
             const stillExists = sharesToRender.some(share => share.id === selectedShareDocId);
             if (stillExists) {
                selectShare(selectedShareDocId);
             } else {
                deselectCurrentShare(); // Deselect if the previously selected share was removed or moved
             }
        } else {
            if (viewDetailsBtn) viewDetailsBtn.disabled = true;
        }
    }

    function clearShareListUI() {
        if (shareTableBody) shareTableBody.innerHTML = '';
        if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
    }

    function clearShareList() {
        clearShareListUI();
        if (asxCodeButtonsContainer) asxCodeButtonsContainer.innerHTML = ''; // Clear ASX code buttons
        deselectCurrentShare(); // Ensure selection is cleared
    }

    // New function to clear watchlist specific UI elements
    function clearWatchlistUI() {
        if (watchlistSelect) watchlistSelect.innerHTML = '';
        userWatchlists = []; // Clear the internal array
        if (currentWatchlistTitle) currentWatchlistTitle.textContent = 'No Watchlist Selected';
        if (watchlistSelect) watchlistSelect.disabled = true;
        if (renameWatchlistBtn) renameWatchlistBtn.disabled = true;
    }


    // New function to deselect currently highlighted share
    function deselectCurrentShare() {
        document.querySelectorAll('.share-list-section tr.selected, .mobile-share-cards .share-card.selected').forEach(el => {
            el.classList.remove('selected');
        });
        selectedShareDocId = null;
        if (viewDetailsBtn) viewDetailsBtn.disabled = true;
        console.log("Share deselected.");
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
                 return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(a.shareName); // Corrected for string desc sort
            }

            if (order === 'asc') {
                return valA - valB;
            } else {
                return valB - valA;
            }
        });
        renderWatchlist(); // Re-render the UI after sorting
    }

    if (sortSelect) {
        sortSelect.addEventListener('change', sortShares);
    }

    // --- Add Share to UI Functions ---
    function addShareToTable(share) {
        const row = shareTableBody.insertRow();
        row.dataset.docId = share.id;

        row.insertCell().textContent = share.shareName || '-'; // Use hyphen

        const priceCell = row.insertCell();
        const priceDisplayDiv = document.createElement('div');
        priceDisplayDiv.className = 'current-price-display';

        const priceValueSpan = document.createElement('span');
        priceValueSpan.className = 'price';
        // Use lastFetchedPrice and previousFetchedPrice if available for color coding
        priceValueSpan.textContent = share.lastFetchedPrice ? `$${share.lastFetchedPrice.toFixed(2)}` : '-'; // Use hyphen

        // Apply color based on price movement
        if (share.lastFetchedPrice !== null && share.previousFetchedPrice !== null) {
            if (share.lastFetchedPrice > share.previousFetchedPrice) {
                priceValueSpan.classList.add('price-up');
            } else if (share.lastFetchedPrice < share.previousFetchedPrice) {
                priceValueSpan.classList.add('price-down');
            } else {
                priceValueSpan.classList.add('price-no-change');
            }
        } else {
            priceValueSpan.classList.add('price-no-change'); // Default color if no prev price for comparison
        }
        priceDisplayDiv.appendChild(priceValueSpan);

        // Date display for current price - ensure it's completely blank if no date
        const formattedDate = formatDate(share.lastPriceUpdateTime);
        if (formattedDate) { // Only append date span if there is content
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = `(${formattedDate})`;
            priceDisplayDiv.appendChild(dateSpan);
        }
        priceCell.appendChild(priceDisplayDiv);


        row.insertCell().textContent = share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : '-'; // Use hyphen

        // Dividend & Yields Cell (with updated label and alignment)
        const dividendCell = row.insertCell();
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);
        
        const divAmountDisplay = (share.dividendAmount !== null && !isNaN(share.dividendAmount)) ? `$${share.dividendAmount.toFixed(2)}` : '-';

        // Use a flex container for the content within the cell
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
        // Display only the first comment section's text, truncated for watchlist
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsCell.textContent = share.comments[0].text;
            // Truncation CSS handled by style.css for comments column
        } else {
            commentsCell.textContent = '-'; // Use hyphen for no comments
        }

        // Add event listeners for row selection (click) and double-click to open details
        row.addEventListener('dblclick', function() {
            const docId = this.dataset.docId;
            selectShare(docId, this);
            showShareDetails(); // Open detail modal on double click
        });

        row.addEventListener('click', function(event) {
            const docId = this.dataset.docId;
            selectShare(docId, this); // Select row on single click
        });
    }

    function addShareToMobileCards(share) {
        // Only proceed if it's a mobile viewport (to prevent desktop bleed-through)
        if (!window.matchMedia("(max-width: 768px)").matches) {
            return;
        }

        const card = document.createElement('div');
        card.className = 'share-card';
        card.dataset.docId = share.id;

        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);

        // Price display for cards with color coding and date
        let priceClass = 'price-no-change';
        if (share.lastFetchedPrice !== null && share.previousFetchedPrice !== null) {
            if (share.lastFetchedPrice > share.previousFetchedPrice) {
                priceClass = 'price-up';
            } else if (share.lastFetchedPrice < share.previousFetchedPrice) {
                priceClass = 'price-down';
            }
        }

        let commentsSummary = '-'; // Use hyphen for no comments
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsSummary = share.comments[0].text;
        }

        const divAmountDisplay = (share.dividendAmount !== null && !isNaN(share.dividendAmount)) ? `$${share.dividendAmount.toFixed(2)}` : '-'; // Conditional dollar sign

        card.innerHTML = `
            <h3>${share.shareName || '-'}</h3>
            <p><strong>Entered:</strong> ${formatDate(share.entryDate) || '-'}</p>
            <p><strong>Current:</strong> <span class="${priceClass}">$${share.lastFetchedPrice ? share.lastFetchedPrice.toFixed(2) : '-'}</span> ${formatDate(share.lastPriceUpdateTime) ? `(${formatDate(share.lastPriceUpdateTime)})` : ''}</p>
            <p><strong>Target:</strong> ${share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : '-'}</p>
            <p><strong>Dividend Yield:</strong> ${divAmountDisplay}</p> <!-- Updated label -->
            <p><strong>Franking:</strong> ${share.frankingCredits ? share.frankingCredits + '%' : '-'}</p>
            <p><strong>Unfranked Yield:</strong> ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'}</p>
            <p><strong>Franked Yield:</strong> ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'}</p>
            <p class="card-comments"><strong>Comments:</strong> ${commentsSummary}</p>
        `;
        mobileShareCardsContainer.appendChild(card);

        // --- Double-Tap Event Listener for Mobile Cards ---
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
        // The viewDetailsBtn should only be enabled if a share is selected
        if (viewDetailsBtn) {
            viewDetailsBtn.disabled = (selectedShareDocId === null);
        }
        console.log("Selected Share Doc ID set to:", selectedShareDocId); // Debug: Confirm ID is set on selection
    }


    // --- Form Modal Functions (Add/Edit Share) ---
    function showShareForm(isEdit = false) {
        if (!shareFormSection) return;
        clearForm();
        deleteShareFromFormBtn.disabled = !isEdit;
        formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share';
        showModal(shareFormSection);

        // Always ensure at least one comment section is present for editing or adding
        if (!isEdit || (isEdit && commentsFormContainer.querySelectorAll('.comment-input-group').length === 0)) {
            addCommentSection();
        }
        console.log(`Showing share form: Is Edit = ${isEdit}`); // Debug
    }

    function clearForm() {
        //selectedShareDocId = null; // Do NOT clear selectedShareDocId here, it's needed for populateForm/edit
        formInputs.forEach(input => {
            if (input) input.value = '';
        });
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = '';
        // Clear all dynamically added comment input groups
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => group.remove());
        console.log("Form cleared."); // Debug
    }

    function populateForm(share) {
        console.log("populateForm: Received share object:", share); // Debug: See what share object is received
        if (!share) {
            console.error("populateForm: Received null or undefined share object. Cannot populate form.");
            return;
        }

        // Set inputs from share object, use empty string if property is null/undefined or NaN for numbers
        shareNameInput.value = share.shareName || '';
        console.log(`populateForm: shareNameInput.value set to: '${shareNameInput.value}'`);
        
        // For number inputs, ensure value is a number and not NaN, otherwise set to empty string
        currentPriceInput.value = (typeof share.currentPrice === 'number' && !isNaN(share.currentPrice)) ? share.currentPrice : '';
        console.log(`populateForm: currentPriceInput.value set to: '${currentPriceInput.value}'`);
        
        targetPriceInput.value = (typeof share.targetPrice === 'number' && !isNaN(share.targetPrice)) ? share.targetPrice : '';
        console.log(`populateForm: targetPriceInput.value set to: '${targetPriceInput.value}'`);
        
        dividendAmountInput.value = (typeof share.dividendAmount === 'number' && !isNaN(share.dividendAmount)) ? share.dividendAmount : '';
        console.log(`populateForm: dividendAmountInput.value set to: '${dividendAmountInput.value}'`);
        
        frankingCreditsInput.value = (typeof share.frankingCredits === 'number' && !isNaN(share.frankingCredits)) ? share.frankingCredits : '';
        console.log(`populateForm: frankingCreditsInput.value set to: '${frankingCreditsInput.value}'`);
        
        document.getElementById('editDocId').value = share.id || '';
        console.log(`populateForm: editDocId.value set to: '${document.getElementById('editDocId').value}'`);
        
        selectedShareDocId = share.id; // Ensure selectedShareDocId is set when populating for edit
        console.log(`populateForm: selectedShareDocId set to: '${selectedShareDocId}'`);


        // Clear existing comment sections before populating
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => group.remove());

        // Populate dynamic comment sections
        if (share.comments && Array.isArray(share.comments)) {
            share.comments.forEach(comment => {
                addCommentSection(comment.title, comment.text);
            });
        }
        // If no comments found (e.g., old data or new share), add one empty section for editing
        if (!share.comments || share.comments.length === 0) {
            addCommentSection();
        }
        console.log("populateForm: Form populated for share ID:", share.id, ". All fields checked."); // Debug
    }

    function handleCancelForm() {
        clearForm();
        hideModal(shareFormSection);
        console.log("Form canceled."); // Debug
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
        titleInput.className = 'comment-title-input'; // Add a class for styling/selection

        const removeButton = document.createElement('button');
        removeButton.textContent = '×';
        removeButton.className = 'remove-section-btn';
        removeButton.addEventListener('click', () => groupDiv.remove());

        const textArea = document.createElement('textarea');
        textArea.placeholder = 'Your comments for this section...';
        textArea.value = text;
        textArea.className = 'comment-text-input'; // Add a class for styling/selection

        groupDiv.appendChild(removeButton); // Add remove button first for top-right positioning
        groupDiv.appendChild(titleInput);
        groupDiv.appendChild(textArea);

        commentsFormContainer.appendChild(groupDiv);
    }

    // --- Data Operations (Add, Update, Delete) ---
    async function saveShare() {
        // Ensure global variables are set and are strings before use
        if (!db || typeof currentUserId !== 'string' || !currentUserId || typeof currentWatchlistId !== 'string' || !currentWatchlistId || typeof currentAppId !== 'string' || !currentAppId) {
            showCustomAlert("You need to sign in and have an active watchlist to save shares. Please sign in with Google. Details: DB, UserID, AppID, or WatchlistID missing.", 3000);
            return;
        }

        // Disable save button to prevent double-click
        saveShareBtn.disabled = true;

        const shareName = shareNameInput.value.trim().toUpperCase();
        const currentPrice = parseFloat(currentPriceInput.value);
        const targetPrice = parseFloat(targetPriceInput.value);
        const dividendAmount = parseFloat(dividendAmountInput.value);
        const frankingCredits = parseFloat(frankingCreditsInput.value);

        // Collect dynamic comments
        const comments = [];
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => {
            const title = group.querySelector('.comment-title-input').value.trim();
            const text = group.querySelector('.comment-text-input').value.trim();
            if (title || text) { // Only save if either title or text is provided
                comments.push({ title: title, text: text });
            }
        });

        if (!shareName) {
            showCustomAlert("Share Name (ASX Code) is required.");
            saveShareBtn.disabled = false; // Re-enable if validation fails
            return;
        }

        const docId = document.getElementById('editDocId').value;

        const now = new Date().toISOString();

        const shareData = {
            shareName,
            currentPrice: isNaN(currentPrice) ? null : currentPrice, // Original manual input field (kept for form)
            targetPrice: isNaN(targetPrice) ? null : targetPrice,
            dividendAmount: isNaN(dividendAmount) ? null : dividendAmount,
            frankingCredits: isNaN(frankingCredits) ? null : frankingCredits,
            comments: comments, // Save as array of objects
            userId: currentUserId,
            entryDate: new Date().toISOString().split('T')[0], //YYYY-MM-DD format for entryDate for consistency in storage
            lastFetchedPrice: isNaN(currentPrice) ? null : currentPrice, // Initially set to manual current price
            previousFetchedPrice: isNaN(currentPrice) ? null : currentPrice, // Initially same as lastFetchedPrice
            lastPriceUpdateTime: now, // Timestamp of this manual update
            watchlistId: currentWatchlistId // Assign to the currently active watchlist ID
        };

        try {
            // Ensure collection path is correctly formed for shares
            const sharesColPath = `artifacts/${String(currentAppId)}/users/${String(currentUserId)}/shares`;
            console.log("saveShare: Attempting to get collection at path:", sharesColPath); // New debug log
            const sharesColRef = window.firestore.collection(db, sharesColPath);

            if (docId) {
                // Ensure doc path is correctly formed for shares
                const shareDocRef = window.firestore.doc(sharesColRef, String(docId)); // Use sharesColRef and convert docId to string
                console.log("saveShare: Attempting to update doc at path:", shareDocRef.path); // New debug log
                await window.firestore.updateDoc(shareDocRef, shareData);
                console.log("Share updated:", docId);
                showCustomAlert("Share updated successfully!");
            } else {
                console.log("saveShare: Attempting to add doc to collection at path:", sharesColRef.path); // New debug log
                await window.firestore.addDoc(sharesColRef, shareData);
                console.log("Share added.");
                showCustomAlert("Share added successfully!");
            }
            hideModal(shareFormSection);
            await loadShares(db, currentAppId, currentUserId); // Pass current global vars
            deselectCurrentShare(); // Deselect share after successful save/update
        } catch (error) {
            console.error("Error saving share:", error);
            showCustomAlert("Error saving share: " + error.message, 3000);
        } finally {
            saveShareBtn.disabled = false; // Always re-enable button after operation
        }
    }

    async function deleteShare() {
        // Ensure global variables are set and are strings before use
        if (!selectedShareDocId || !db || typeof currentUserId !== 'string' || !currentUserId || typeof currentAppId !== 'string' || !currentAppId) {
            showCustomAlert("No share selected for deletion or you are not signed in. Details: DB, UserID, or AppID missing.", 3000);
            return;
        }

        try {
            // Ensure doc path is correctly formed for shares
            const sharesColPath = `artifacts/${String(currentAppId)}/users/${String(currentUserId)}/shares`;
            console.log("deleteShare: Attempting to get collection at path:", sharesColPath); // New debug log
            const sharesColRef = window.firestore.collection(db, sharesColPath);
            const shareDocRef = window.firestore.doc(sharesColRef, String(selectedShareDocId)); // Use sharesColRef and convert selectedShareDocId to string
            console.log("deleteShare: Attempting to delete doc at path:", shareDocRef.path); // New debug log
            await window.firestore.deleteDoc(shareDocRef);
            console.log("Share deleted:", selectedShareDocId);
            showCustomAlert("Share deleted successfully!");
            hideModal(shareFormSection); // Hide the form after successful deletion
            await loadShares(db, currentAppId, currentUserId); // Reload the shares to update the UI
            deselectCurrentShare(); // Deselect share after successful deletion
        } catch (error) {
            console.error("Error deleting share:", error);
            showCustomAlert("Error deleting share: " + error.message, 3000);
        }
    }

    // --- Display Share Detail Modal ---
    function showShareDetails() {
        if (!selectedShareDocId) {
            showCustomAlert("Please select a share to view details.");
            return;
        }

        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        console.log("Attempting to show details for selectedShareDocId:", selectedShareDocId); // Debug
        console.log("Found selectedShare object:", selectedShare); // Debug

        if (selectedShare) {
            modalShareName.textContent = selectedShare.shareName || '-'; // Use hyphen
            modalEntryDate.textContent = formatDate(selectedShare.entryDate) || '-'; // Use hyphen if format returns empty

            const currentPriceVal = selectedShare.lastFetchedPrice;
            const prevPriceVal = selectedShare.previousFetchedPrice;
            let priceText = currentPriceVal ? `$${currentPriceVal.toFixed(2)}` : '-'; // Use hyphen
            let changeText = '';
            let changeClass = '';

            if (currentPriceVal !== null && prevPriceVal !== null && prevPriceVal !== 0) {
                const changeAmount = currentPriceVal - prevPriceVal;
                const changePercent = (changeAmount / prevPriceVal) * 100;
                changeText = `(${changeAmount >= 0 ? '+' : ''}$${changeAmount.toFixed(2)} / ${changeAmount >= 0 ? '+' : ''}${changePercent.toFixed(2)}%)`;
                if (changeAmount > 0) changeClass = 'price-up';
                else if (changeAmount < 0) changeClass = 'price-down';
                else changeClass = 'price-no-change';
            } else if (currentPriceVal !== null) {
                changeText = ''; // Empty string for "No previous price for comparison" in modal
                changeClass = 'price-no-change';
            }

            modalCurrentPriceDetailed.innerHTML = `
                <span class="price-value ${changeClass}">${priceText}</span>
                <span class="price-change ${changeClass}">${changeText}</span><br>
                <span class="last-updated-date">Last Updated: ${formatDateTime(selectedShare.lastPriceUpdateTime) || '-'}</span>
            `;

            modalTargetPrice.textContent = selectedShare.targetPrice ? `$${selectedShare.targetPrice.toFixed(2)}` : '-'; // Use hyphen
            modalDividendAmount.textContent = selectedShare.dividendAmount ? `$${selectedShare.dividendAmount.toFixed(2)}` : '-'; // Use hyphen
            modalFrankingCredits.textContent = selectedShare.frankingCredits ? `${selectedShare.frankingCredits}%` : '-'; // Use hyphen

            const unfrankedYield = calculateUnfrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice);
            const frankedYield = calculateFrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice, selectedShare.frankingCredits);

            modalUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'; // Use hyphen
            modalFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'; // Use hyphen

            // Render structured comments in the modal (full text)
            renderModalComments(selectedShare.comments);

            showModal(shareDetailModal);
        } else {
            console.error("Selected share data not found for ID:", selectedShareDocId); // Debug
            showCustomAlert("Selected share data not found.");
        }
    }

    // Renders structured comments in the detail modal (full text)
    function renderModalComments(commentsArray) {
        modalCommentsContainer.innerHTML = '<h3>Detailed Comments</h3>'; // Reset container and add title

        if (commentsArray && ArrayArray.isArray(commentsArray) && commentsArray.length > 0) {
            commentsArray.forEach(commentSection => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'comment-section';

                const sectionTitle = document.createElement('h4');
                sectionTitle.textContent = commentSection.title || 'Untitled Section';

                const sectionText = document.createElement('p');
                sectionText.textContent = commentSection.text || '-'; // Use hyphen for empty comment text
                // Use white-space: pre-wrap for multiline comments from CSS

                sectionDiv.appendChild(sectionTitle);
                sectionDiv.appendChild(sectionText);
                modalCommentsContainer.appendChild(sectionDiv);
            });
        } else {
            const noComments = document.createElement('p');
            noComments.textContent = '-'; // Use hyphen for no detailed comments
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
        
        // Find the selected share object from the allSharesData array
        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        
        console.log("showEditFormForSelectedShare: Attempting to show edit form for selectedShareDocId:", selectedShareDocId); // Debug
        console.log("showEditFormForSelectedShare: Found selectedShare object for edit:", selectedShare); // Debug

        if (selectedShare) {
            // Adding a small timeout to allow modal DOM to fully render before population
            // This can sometimes resolve issues with input values not sticking.
            setTimeout(() => {
                populateForm(selectedShare); // This is where the form gets filled with the selected share's data
            }, 50); // 50ms delay
            showShareForm(true); // This opens the form modal in edit mode
        } else {
            console.error("showEditFormForSelectedShare: Selected share data not found in allSharesData for ID:", selectedShareDocId); // Debug
            showCustomAlert("Selected share data not found for editing. Please ensure a share is selected.");
        }
    }

    // --- Edit Share button in Detail Modal ---
    if (editShareFromDetailBtn) {
        editShareFromDetailBtn.addEventListener('click', () => {
            console.log("Edit Share button in detail modal clicked."); // Debug
            hideModal(shareDetailModal); // Close the detail modal
            showEditFormForSelectedShare(); // Open the edit form for the selected share
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

        calcUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'; // Use hyphen
        calcFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'; // Use hyphen
        calcEstimatedDividend.textContent = estimatedDividend !== null ? `$${estimatedDividend.toFixed(2)}` : '-'; // Use hyphen
    }

    if (calcDividendAmountInput) calcDividendAmountInput.addEventListener('input', updateDividendCalculations);
    if (calcCurrentPriceInput) calcCurrentPriceInput.addEventListener('input', updateDividendCalculations);
    if (calcFrankingCreditsInput) calcFrankingCreditsInput.addEventListener('input', updateDividendCalculations);
    if (investmentValueSelect) investmentValueSelect.addEventListener('change', updateDividendCalculations);

    // --- Main Application Button Event Listeners ---
    if (newShareBtn) {
        newShareBtn.addEventListener('click', () => {
            console.log("Add button clicked."); // Debug log
            showShareForm(false);
        });
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            console.log("View Details button clicked. Selected Share ID:", selectedShareDocId); // Debug log
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
            console.log("Standard Calculator button clicked. Opening in-app calculator.");
            resetCalculator(); // Clear calculator state before showing
            showModal(calculatorModal);
        });
    }

    if (dividendCalcBtn) {
        dividendCalcBtn.addEventListener('click', () => {
            console.log("Dividend Calculator button clicked."); // Debug log
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
        if (!target.classList.contains('calc-btn')) return; // Only process calculator buttons

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
        } else if (action === 'percentage') { // NEW: Percentage button logic
            if (currentInput !== '') {
                currentInput = String(parseFloat(currentInput) / 100);
            } else if (previousInput !== '') {
                // If no current input but previous exists, apply percentage to previous input
                currentInput = String(parseFloat(previousInput) / 100);
                previousInput = ''; // Clear previous input as percentage is applied
                operator = null; // Clear operator as this is a unary operation
            }
            resultDisplayed = true; // Percentage is a final result for that number
            updateCalculatorDisplay();
        }
        else if (target.classList.contains('number')) {
            if (resultDisplayed) { // If a result is displayed, start new calculation
                currentInput = value;
                resultDisplayed = false;
            } else {
                currentInput += value;
            }
            updateCalculatorDisplay();
        } else if (target.classList.contains('operator')) {
            if (currentInput === '' && previousInput !== '') {
                // Allow changing operator if no new input yet
                operator = action;
            } else if (currentInput !== '') {
                if (previousInput === '') {
                    previousInput = currentInput;
                } else {
                    // Chaining operations: calculate previous result first
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
            resultDisplayed = false; // Reset result displayed flag
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
        asxCodeButtonsContainer.innerHTML = ''; // Clear any existing buttons

        // Only display ASX code buttons for the currently selected watchlist's shares
        const sharesInCurrentWatchlist = allSharesData.filter(share => share.watchlistId === currentWatchlistId);

        if (sharesInCurrentWatchlist.length === 0) {
            const noSharesMsg = document.createElement('div');
            noSharesMsg.textContent = 'Add your first share to this watchlist!';
            noSharesMsg.style.padding = '5px 15px';
            noSharesMsg.style.textAlign = 'center';
            noSharesMsg.style.color = '#555';
            noSharesMsg.style.fontSize = '0.9em';
            asxCodeButtonsContainer.appendChild(noSharesMsg);
            return;
        }

        // Sort shares by ASX code for the buttons
        const sortedShares = [...sharesInCurrentWatchlist].sort((a, b) => {
            if (a.shareName && b.shareName) {
                return a.shareName.localeCompare(b.shareName);
            }
            return 0;
        });

        sortedShares.forEach(share => {
            const button = document.createElement('button');
            button.textContent = share.shareName; // Display ASX code
            button.className = 'asx-code-button'; // Apply specific styling
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Prevent potential parent clicks
                selectShare(share.id); // Select the share
                showShareDetails(); // Show the details modal
            });
            asxCodeButtonsContainer.appendChild(button);
        });
    }
});
