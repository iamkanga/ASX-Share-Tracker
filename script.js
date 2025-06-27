// File Version: v125
// Last Updated: 2025-06-28 (Moved UI element selection inside DOMContentLoaded to prevent null errors)

// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js (v125) DOMContentLoaded fired."); // New log to confirm script version and DOM ready

    // --- UI Element References (NOW DEFINED INSIDE DOMContentLoaded) ---
    // This ensures all HTML elements are loaded and available before the script attempts to get their references.
    const ui = {
        // Main Layout
        appContainer: document.getElementById('appContainer'),
        mainContent: document.getElementById('mainContent'),
        mainTitle: document.getElementById('mainTitle'),
        scrollToTopBtn: document.getElementById('scrollToTopBtn'),

        // Header Buttons
        addShareHeaderBtn: document.getElementById('addShareHeaderBtn'),
        hamburgerBtn: document.getElementById('hamburgerBtn'),
        signOutHeaderBtn: document.getElementById('signOutHeaderBtn'), // Added for header sign out

        // Watchlist Controls
        allWatchlistBtn: document.getElementById('allWatchlistBtn'),
        myWatchlistBtn: document.getElementById('myWatchlistBtn'),
        publicWatchlistBtn: document.getElementById('publicWatchlistBtn'),
        sortByDropdown: document.getElementById('sortByDropdown'),
        sortOrderDropdown: document.getElementById('sortOrderDropdown'),

        // Authentication Section
        authSection: document.getElementById('authSection'),
        googleAuthBtn: document.getElementById('googleAuthBtn'),
        authErrorMessage: document.getElementById('authErrorMessage'),

        // Share List Section
        shareListSection: document.getElementById('shareListSection'),
        shareTableBody: document.getElementById('shareTableBody'),
        mobileShareCardsContainer: document.getElementById('mobileShareCardsContainer'),
        addShareBtn: document.getElementById('addShareBtn'),
        noSharesMessage: document.getElementById('noSharesMessage'),
        loadingSpinner: document.getElementById('loadingSpinner'),

        // Sidebar
        appSidebar: document.getElementById('appSidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        closeSidebarBtn: document.getElementById('closeSidebarBtn'),
        sidebarUserName: document.getElementById('sidebarUserName'),
        sidebarUserEmail: document.getElementById('sidebarUserEmail'),
        sidebarUserId: document.getElementById('sidebarUserId'), // Added for displaying userId
        sidebarSignOutBtn: document.getElementById('sidebarSignOutBtn'),
        sidebarSettingsBtn: document.getElementById('sidebarSettingsBtn'),
        sidebarAboutBtn: document.getElementById('sidebarAboutBtn'),
        sidebarHelpBtn: document.getElementById('sidebarHelpBtn'),
        sidebarCalculatorBtn: document.getElementById('sidebarCalculatorBtn'),
        sidebarAddShareBtn: document.getElementById('sidebarAddShareBtn'), // New add share button in sidebar

        // Modals
        shareFormModal: document.getElementById('shareFormModal'),
        shareForm: document.getElementById('shareForm'),
        shareFormTitle: document.getElementById('shareFormTitle'),
        shareASXCode: document.getElementById('shareASXCode'),
        shareCompanyName: document.getElementById('shareCompanyName'),
        sharePurchasePrice: document.getElementById('sharePurchasePrice'),
        shareCurrentPrice: document.getElementById('shareCurrentPrice'),
        shareQuantity: document.getElementById('shareQuantity'),
        sharePurchaseDate: document.getElementById('sharePurchaseDate'),
        shareIsFavourite: document.getElementById('shareIsFavourite'),
        commentsFormContainer: document.getElementById('commentsFormContainer'),
        addCommentBtn: document.getElementById('addCommentBtn'),
        saveShareBtn: document.getElementById('saveShareBtn'),
        deleteShareFormBtn: document.getElementById('deleteShareFormBtn'), // Delete button on form

        shareDetailModal: document.getElementById('shareDetailModal'),
        detailASXCode: document.getElementById('detailASXCode'),
        detailCompanyName: document.getElementById('detailCompanyName'),
        detailPurchasePrice: document.getElementById('detailPurchasePrice'),
        detailCurrentPrice: document.getElementById('detailCurrentPrice'),
        detailQuantity: document.getElementById('detailQuantity'),
        detailPurchaseDate: document.getElementById('detailPurchaseDate'),
        detailGainLoss: document.getElementById('detailGainLoss'),
        detailIsFavourite: document.getElementById('detailIsFavourite'),
        modalCommentsContainer: document.getElementById('modalCommentsContainer'),
        editShareFromDetailsBtn: document.getElementById('editShareFromDetailsBtn'),
        deleteShareFromDetailsBtn: document.getElementById('deleteShareFromDetailsBtn'),

        calculatorModal: document.getElementById('calculatorModal'),
        calculatorForm: document.getElementById('calculatorForm'),
        calcPurchasePrice: document.getElementById('calcPurchasePrice'),
        calcCurrentPrice: document.getElementById('calcCurrentPrice'),
        calcQuantity: document.getElementById('calcQuantity'),
        calculateBtn: document.getElementById('calculateBtn'),
        calcResultGainLoss: document.getElementById('calcResultGainLoss'),
        calcResultPercentage: document.getElementById('calcResultPercentage'),
        calcResultTotalValue: document.getElementById('calcResultTotalValue'),

        customDialogModal: document.getElementById('customDialogModal'),
        customDialogMessage: document.getElementById('customDialogMessage'),
        customDialogConfirmBtn: document.getElementById('customDialogConfirmBtn'),
        customDialogCancelBtn: document.getElementById('customDialogCancelBtn'),

        settingsModal: document.getElementById('settingsModal'),
        themeSelect: document.getElementById('themeSelect'),
        closeSettingsBtn: document.getElementById('closeSettingsBtn'),
        resetDataBtn: document.getElementById('resetDataBtn'), // New reset data button

        aboutModal: document.getElementById('aboutModal'),
        closeAboutBtn: document.getElementById('closeAboutBtn'),

        helpModal: document.getElementById('helpModal'),
        closeHelpBtn: document.getElementById('closeHelpBtn'),
    };

    // --- Global Variables ---
    let db; // Firestore database instance
    let auth; // Firebase Auth instance
    let currentUserId = null; // Stores the current user's ID
    let currentShareId = null; // Tracks the share being edited/viewed
    let currentComments = []; // Stores comments for the current share
    let autoDismissTimeout = null; // For auto-dismissing alerts
    let currentWatchlistFilter = 'all'; // 'all', 'my', 'public'
    let currentSortBy = 'asxCode'; // 'asxCode', 'companyName', 'gainLoss', 'purchaseDate'
    let currentSortOrder = 'asc'; // 'asc', 'desc'
    let sharesCollectionRef; // Reference to the Firestore collection for shares
    let commentsCollectionRef; // Reference to the Firestore collection for comments

    // --- Core Helper Functions (DECLARED FIRST FOR HOISTING) ---

    // Centralized Modal Closing Function
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            // Use the class 'is-active' to control display, as per CSS
            if (modal.classList.contains('is-active')) {
                modal.classList.remove('is-active');
            }
        });
        resetCalculator(); // Reset calculator state when closing calculator modal
        deselectCurrentShare(); // Always deselect share when any modal is closed
        if (autoDismissTimeout) { clearTimeout(autoDismissTimeout); autoDismissTimeout = null; }
    }

    // Custom Dialog (Alert/Confirm) Functions
    function showCustomAlert(message, duration = 1000) {
        if (!ui.customDialogModal || !ui.customDialogMessage || !ui.customDialogConfirmBtn || !ui.customDialogCancelBtn) {
            console.error("Custom dialog elements not found. Cannot show alert.");
            console.log("ALERT MESSAGE (fallback):", message);
            return;
        }
        ui.customDialogMessage.textContent = message;
        ui.customDialogConfirmBtn.style.display = 'none'; // Hide confirm button for alerts
        ui.customDialogCancelBtn.style.display = 'none'; // Hide cancel button for alerts
        ui.customDialogModal.classList.add('is-active');

        autoDismissTimeout = setTimeout(() => {
            closeModals();
        }, duration);
    }

    function showCustomConfirm(message) {
        return new Promise((resolve) => {
            if (!ui.customDialogModal || !ui.customDialogMessage || !ui.customDialogConfirmBtn || !ui.customDialogCancelBtn) {
                console.error("Custom dialog elements not found. Cannot show confirm.");
                console.log("CONFIRM MESSAGE (fallback):", message);
                resolve(false); // Resolve false if elements are missing
                return;
            }

            ui.customDialogMessage.textContent = message;
            ui.customDialogConfirmBtn.style.display = 'inline-block'; // Show confirm
            ui.customDialogCancelBtn.style.display = 'inline-block'; // Show cancel
            ui.customDialogModal.classList.add('is-active');

            const confirmHandler = () => {
                closeModals();
                ui.customDialogConfirmBtn.removeEventListener('click', confirmHandler);
                ui.customDialogCancelBtn.removeEventListener('click', cancelHandler);
                resolve(true);
            };

            const cancelHandler = () => {
                closeModals();
                ui.customDialogConfirmBtn.removeEventListener('click', confirmHandler);
                ui.customDialogCancelBtn.removeEventListener('click', cancelHandler);
                resolve(false);
            };

            ui.customDialogConfirmBtn.addEventListener('click', confirmHandler);
            ui.customDialogCancelBtn.addEventListener('click', cancelHandler);
        });
    }

    // --- Firebase Initialization and Authentication ---
    async function initFirebaseAuth() {
        // Ensure Firebase is initialized and available from index.html
        if (typeof window.firestoreDb === 'undefined' || typeof window.firebaseAuth === 'undefined') {
            console.error("Firebase is not initialized. Check index.html script module.");
            ui.authErrorMessage.textContent = "Firebase initialization failed. Please try again later.";
            ui.authErrorMessage.classList.remove('hidden');
            ui.loadingSpinner.classList.add('hidden');
            return;
        }

        db = window.firestoreDb;
        auth = window.firebaseAuth;

        // Get the app ID from the global function
        const appId = window.getFirebaseAppId();
        console.log("Firebase App ID:", appId); // Log the app ID

        // Set up authentication state observer
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in.
                currentUserId = user.uid;
                console.log("User signed in:", user.uid, "Email:", user.email);

                // Update UI for signed-in state
                ui.authSection.classList.add('hidden');
                ui.shareListSection.classList.remove('hidden');
                ui.addShareBtn.classList.remove('hidden');
                ui.signOutHeaderBtn.classList.remove('hidden'); // Show sign out button in header
                ui.hamburgerBtn.classList.remove('hidden'); // Show hamburger menu

                // Update sidebar user info
                ui.sidebarUserName.textContent = user.displayName || "Guest User";
                ui.sidebarUserEmail.textContent = user.email || "No email";
                ui.sidebarUserId.textContent = `User ID: ${currentUserId}`; // Display full userId

                // Set up Firestore collection references based on current user ID
                sharesCollectionRef = window.firestore.collection(db, `artifacts/${appId}/users/${currentUserId}/shares`);
                commentsCollectionRef = window.firestore.collection(db, `artifacts/${appId}/users/${currentUserId}/comments`);

                // Start listening for shares
                await setupRealtimeShareListener();
            } else {
                // User is signed out.
                currentUserId = null;
                console.log("User signed out.");

                // Update UI for signed-out state
                ui.authSection.classList.remove('hidden');
                ui.shareListSection.classList.add('hidden');
                ui.addShareBtn.classList.add('hidden');
                ui.signOutHeaderBtn.classList.add('hidden'); // Hide sign out button in header
                ui.hamburgerBtn.classList.add('hidden'); // Hide hamburger menu

                // Clear sidebar user info
                ui.sidebarUserName.textContent = "Not Signed In";
                ui.sidebarUserEmail.textContent = "";
                ui.sidebarUserId.textContent = ""; // Clear userId display

                // Clear share list
                ui.shareTableBody.innerHTML = '';
                ui.mobileShareCardsContainer.innerHTML = '';
                ui.noSharesMessage.classList.remove('hidden');
                ui.loadingSpinner.classList.add('hidden');
            }
            ui.loadingSpinner.classList.add('hidden'); // Hide spinner once auth state is determined
        });

        // Attempt anonymous sign-in or use custom token if available
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
            try {
                await window.authFunctions.signInWithCustomToken(auth, __initial_auth_token);
                console.log("Signed in with custom token.");
            } catch (error) {
                console.error("Error signing in with custom token:", error);
                ui.authErrorMessage.textContent = `Authentication error: ${error.message}`;
                ui.authErrorMessage.classList.remove('hidden');
                await window.authFunctions.signInAnonymously(auth); // Fallback to anonymous
            }
        } else {
            // Sign in anonymously if no custom token is provided (e.g., for local dev)
            try {
                await window.authFunctions.signInAnonymously(auth);
                console.log("Signed in anonymously.");
            } catch (error) {
                console.error("Error signing in anonymously:", error);
                ui.authErrorMessage.textContent = `Authentication error: ${error.message}`;
                ui.authErrorMessage.classList.remove('hidden');
            }
        }
    }

    // Google Sign-In
    async function signInWithGoogle() {
        try {
            ui.authErrorMessage.classList.add('hidden'); // Hide any previous errors
            ui.loadingSpinner.classList.remove('hidden'); // Show spinner
            const provider = window.authFunctions.GoogleAuthProviderInstance;
            await window.authFunctions.signInWithPopup(auth, provider);
            console.log("Google Sign-In successful.");
            // onAuthStateChanged listener will handle UI updates
        } catch (error) {
            console.error("Error during Google Sign-In:", error);
            let errorMessage = "Failed to sign in with Google. Please try again.";
            if (error.code === 'auth/popup-closed-by-user') {
                errorMessage = "Google sign-in popup was closed.";
            } else if (error.code === 'auth/cancelled-popup-request') {
                errorMessage = "Google sign-in already in progress.";
            } else if (error.code === 'auth/network-request-failed') {
                errorMessage = "Network error. Please check your internet connection.";
            } else if (error.code === 'auth/unauthorized-domain') {
                errorMessage = "Unauthorized domain. Please ensure your Firebase project is configured for this domain.";
            } else if (error.code === 'auth/api-key-not-valid') {
                errorMessage = "Firebase API Key is not valid. Please ensure index.html has the correct key.";
            }
            ui.authErrorMessage.textContent = errorMessage;
            ui.authErrorMessage.classList.remove('hidden');
            ui.loadingSpinner.classList.add('hidden'); // Hide spinner on error
        }
    }

    // Sign Out
    async function signOutUser() {
        const confirmed = await showCustomConfirm("Are you sure you want to sign out?");
        if (confirmed) {
            try {
                await window.authFunctions.signOut(auth);
                console.log("User signed out successfully.");
                // onAuthStateChanged listener will handle UI updates
            } catch (error) {
                console.error("Error signing out:", error);
                showCustomAlert("Error signing out. Please try again.");
            }
        }
    }

    // --- Firestore Operations ---

    // Realtime Listener for Shares
    let unsubscribeShares = null; // To store the unsubscribe function

    async function setupRealtimeShareListener() {
        if (unsubscribeShares) {
            unsubscribeShares(); // Unsubscribe from previous listener if exists
            console.log("Unsubscribed from previous share listener.");
        }

        if (!sharesCollectionRef) {
            console.warn("Shares collection reference not available. Cannot set up listener.");
            return;
        }

        ui.loadingSpinner.classList.remove('hidden');
        ui.noSharesMessage.classList.add('hidden');
        ui.shareTableBody.innerHTML = ''; // Clear existing shares
        ui.mobileShareCardsContainer.innerHTML = '';

        let q;
        if (currentWatchlistFilter === 'my') {
            q = window.firestore.query(sharesCollectionRef); // 'My' watchlist shows all user shares
        } else if (currentWatchlistFilter === 'public') {
            // For public shares, we need to query a different collection path
            const publicSharesCollectionRef = window.firestore.collection(db, `artifacts/${window.getFirebaseAppId()}/public/data/shares`);
            q = window.firestore.query(publicSharesCollectionRef);
        } else { // 'all' watchlist
            // This will combine 'my' and 'public' shares
            // For simplicity, we'll fetch both and combine/deduplicate in client-side
            const mySharesQuery = window.firestore.query(sharesCollectionRef);
            const publicSharesCollectionRef = window.firestore.collection(db, `artifacts/${window.getFirebaseAppId()}/public/data/shares`);
            const publicSharesQuery = window.firestore.query(publicSharesCollectionRef);

            // Fetch both sets of shares
            const [mySharesSnapshot, publicSharesSnapshot] = await Promise.all([
                window.firestore.getDocs(mySharesQuery),
                window.firestore.getDocs(publicSharesQuery)
            ]);

            const allShares = {}; // Use an object to deduplicate by ID
            mySharesSnapshot.forEach(doc => {
                allShares[doc.id] = { id: doc.id, ...doc.data(), isPublic: false };
            });
            publicSharesSnapshot.forEach(doc => {
                // Prioritize user's own share if it exists in both public and private
                if (!allShares[doc.id]) {
                    allShares[doc.id] = { id: doc.id, ...doc.data(), isPublic: true };
                }
            });

            const combinedShares = Object.values(allShares);
            displayShares(combinedShares);
            ui.loadingSpinner.classList.add('hidden');
            ui.noSharesMessage.classList.toggle('hidden', combinedShares.length > 0);
            return; // Exit as we've already displayed
        }

        unsubscribeShares = window.firestore.onSnapshot(q, (snapshot) => {
            const shares = [];
            snapshot.forEach(doc => {
                // Determine if the share is public based on its collection path
                const isPublic = doc.ref.path.includes('/public/data/shares/');
                shares.push({ id: doc.id, ...doc.data(), isPublic: isPublic });
            });
            console.log(`Fetched ${shares.length} shares for filter: ${currentWatchlistFilter}`);
            displayShares(shares);
            ui.loadingSpinner.classList.add('hidden');
            ui.noSharesMessage.classList.toggle('hidden', shares.length > 0);
        }, (error) => {
            console.error("Error fetching shares:", error);
            ui.loadingSpinner.classList.add('hidden');
            ui.noSharesMessage.classList.remove('hidden');
            ui.noSharesMessage.textContent = "Error loading shares. Please try again.";
        });
    }

    // Add/Edit Share
    async function saveShare(event) {
        event.preventDefault();
        if (!currentUserId) {
            showCustomAlert("Please sign in to save shares.");
            return;
        }

        // Show spinner during save
        ui.saveShareBtn.textContent = 'Saving...';
        ui.saveShareBtn.disabled = true;

        const shareData = {
            asxCode: ui.shareASXCode.value.toUpperCase(),
            companyName: ui.shareCompanyName.value,
            purchasePrice: parseFloat(ui.sharePurchasePrice.value),
            currentPrice: parseFloat(ui.shareCurrentPrice.value),
            quantity: parseInt(ui.shareQuantity.value, 10),
            purchaseDate: ui.sharePurchaseDate.value,
            isFavourite: ui.shareIsFavourite.checked,
            userId: currentUserId, // Store userId with the share
            timestamp: window.firestore.serverTimestamp(), // Add server timestamp
            // isPublic field will be determined by collection path, not stored directly in document
        };

        // Validate inputs
        if (isNaN(shareData.purchasePrice) || isNaN(shareData.currentPrice) || isNaN(shareData.quantity) ||
            shareData.purchasePrice <= 0 || shareData.currentPrice <= 0 || shareData.quantity <= 0) {
            showCustomAlert("Please enter valid positive numbers for prices and quantity.");
            ui.saveShareBtn.textContent = 'Save Share';
            ui.saveShareBtn.disabled = false;
            return;
        }
        if (!shareData.asxCode || !shareData.companyName || !shareData.purchaseDate) {
            showCustomAlert("Please fill in all required fields (ASX Code, Company Name, Purchase Date).");
            ui.saveShareBtn.textContent = 'Save Share';
            ui.saveShareBtn.disabled = false;
            return;
        }

        try {
            // Handle comments separately
            const commentsToSave = [];
            document.querySelectorAll('.comment-section').forEach(commentDiv => {
                const title = commentDiv.querySelector('[name="commentTitle"]').value;
                const date = commentDiv.querySelector('[name="commentDate"]').value;
                const text = commentDiv.querySelector('[name="commentText"]').value;
                if (title && date && text) {
                    commentsToSave.push({ title, date, text });
                }
            });

            if (currentShareId) {
                // Update existing share
                const shareDocRef = window.firestore.doc(db, `artifacts/${window.getFirebaseAppId()}/users/${currentUserId}/shares`, currentShareId);
                await window.firestore.updateDoc(shareDocRef, shareData);
                console.log("Share updated with ID: ", currentShareId);

                // Update comments: Delete existing comments for this share and re-add
                const existingCommentsQuery = window.firestore.query(commentsCollectionRef, window.firestore.where("shareId", "==", currentShareId));
                const existingCommentsSnapshot = await window.firestore.getDocs(existingCommentsQuery);
                const batch = window.firestore.writeBatch(db);
                existingCommentsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                for (const comment of commentsToSave) {
                    batch.set(window.firestore.doc(commentsCollectionRef), { ...comment, shareId: currentShareId, userId: currentUserId, timestamp: window.firestore.serverTimestamp() });
                }
                await batch.commit();
                showCustomAlert("Share and comments updated successfully!");

            } else {
                // Add new share
                const docRef = await window.firestore.addDoc(sharesCollectionRef, shareData);
                currentShareId = docRef.id; // Set currentShareId for newly added share
                console.log("Share added with ID: ", currentShareId);

                // Add comments for the new share
                for (const comment of commentsToSave) {
                    await window.firestore.addDoc(commentsCollectionRef, { ...comment, shareId: currentShareId, userId: currentUserId, timestamp: window.firestore.serverTimestamp() });
                }
                showCustomAlert("Share and comments added successfully!");
            }

            ui.shareForm.reset();
            currentShareId = null; // Clear currentShareId after save
            currentComments = []; // Clear comments
            ui.commentsFormContainer.innerHTML = ''; // Clear comment sections
            closeModals();
        } catch (e) {
            console.error("Error saving share: ", e);
            showCustomAlert("Error saving share. Please try again.");
        } finally {
            ui.saveShareBtn.textContent = 'Save Share';
            ui.saveShareBtn.disabled = false;
        }
    }

    // Delete Share
    async function deleteShare(shareId) {
        const confirmed = await showCustomConfirm("Are you sure you want to delete this share? This action cannot be undone.");
        if (confirmed) {
            if (!currentUserId) {
                showCustomAlert("Please sign in to delete shares.");
                return;
            }

            try {
                // Delete share document
                const shareDocRef = window.firestore.doc(db, `artifacts/${window.getFirebaseAppId()}/users/${currentUserId}/shares`, shareId);
                await window.firestore.deleteDoc(shareDocRef);
                console.log("Share deleted with ID: ", shareId);

                // Delete associated comments
                const commentsQuery = window.firestore.query(commentsCollectionRef, window.firestore.where("shareId", "==", shareId));
                const commentsSnapshot = await window.firestore.getDocs(commentsQuery);
                const batch = window.firestore.writeBatch(db);
                commentsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });
                await batch.commit();
                console.log("Associated comments deleted for share ID:", shareId);

                showCustomAlert("Share and associated comments deleted successfully!");
                closeModals(); // Close any open modals
            } catch (e) {
                console.error("Error removing share or comments: ", e);
                showCustomAlert("Error deleting share. Please try again.");
            }
        }
    }

    // Reset All User Data
    async function resetUserData() {
        const confirmed = await showCustomConfirm("Are you absolutely sure you want to reset ALL your data? This will delete all your shares and comments. This action cannot be undone.");
        if (confirmed) {
            if (!currentUserId) {
                showCustomAlert("Please sign in to reset data.");
                return;
            }
            try {
                ui.loadingSpinner.classList.remove('hidden');
                closeModals(); // Close settings modal immediately

                const sharesQuery = window.firestore.query(sharesCollectionRef);
                const commentsQuery = window.firestore.query(commentsCollectionRef);

                const [sharesSnapshot, commentsSnapshot] = await Promise.all([
                    window.firestore.getDocs(sharesQuery),
                    window.firestore.getDocs(commentsQuery)
                ]);

                const batch = window.firestore.writeBatch(db);

                sharesSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                commentsSnapshot.forEach(doc => {
                    batch.delete(doc.ref);
                });

                await batch.commit();
                console.log("All user data (shares and comments) reset successfully.");
                showCustomAlert("All your data has been reset successfully!");
            } catch (e) {
                console.error("Error resetting user data:", e);
                showCustomAlert("Error resetting data. Please try again.");
            } finally {
                ui.loadingSpinner.classList.add('hidden');
            }
        }
    }


    // --- UI Rendering and Interaction ---

    // Display Shares in Table and Cards
    function displayShares(shares) {
        // Sort shares based on current criteria
        shares.sort((a, b) => {
            let valA, valB;

            if (currentSortBy === 'gainLoss') {
                // Calculate gainLoss for sorting
                const gainLossA = (a.currentPrice - a.purchasePrice) * a.quantity;
                const gainLossB = (b.currentPrice - b.purchasePrice) * b.quantity;
                valA = gainLossA;
                valB = gainLossB;
            } else if (currentSortBy === 'purchaseDate') {
                valA = new Date(a.purchaseDate);
                valB = new Date(b.purchaseDate);
            } else {
                // Default to string comparison for asxCode, companyName
                valA = a[currentSortBy].toLowerCase();
                valB = b[currentSortBy].toLowerCase();
            }

            if (valA < valB) return currentSortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return currentSortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        ui.shareTableBody.innerHTML = '';
        ui.mobileShareCardsContainer.innerHTML = '';

        if (shares.length === 0) {
            ui.noSharesMessage.classList.remove('hidden');
            return;
        } else {
            ui.noSharesMessage.classList.add('hidden');
        }

        // Group shares for display if 'all' filter is active
        const groupedShares = {
            'My Shares': [],
            'Public Shares': []
        };

        shares.forEach(share => {
            if (share.isPublic) {
                groupedShares['Public Shares'].push(share);
            } else {
                groupedShares['My Shares'].push(share);
            }
        });

        // Render table rows and mobile cards
        ['My Shares', 'Public Shares'].forEach(groupName => {
            const group = groupedShares[groupName];
            if (group.length > 0) {
                // Add group header to table
                const tableGroupHeader = document.createElement('tr');
                tableGroupHeader.innerHTML = `<th colspan="9" class="group-header">${groupName}</th>`;
                ui.shareTableBody.appendChild(tableGroupHeader);

                // Add group header to mobile cards
                const mobileGroupHeader = document.createElement('h2');
                mobileGroupHeader.className = 'mobile-group-header';
                mobileGroupHeader.textContent = groupName;
                ui.mobileShareCardsContainer.appendChild(mobileGroupHeader);

                group.forEach(share => {
                    const gainLoss = (share.currentPrice - share.purchasePrice) * share.quantity;
                    const gainLossPercentage = (gainLoss / (share.purchasePrice * share.quantity)) * 100;
                    const gainLossClass = gainLoss > 0 ? 'positive' : (gainLoss < 0 ? 'negative' : 'neutral');
                    const formattedGainLoss = gainLoss.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
                    const formattedPercentage = isNaN(gainLossPercentage) ? 'N/A' : `${gainLossPercentage.toFixed(2)}%`;

                    // Table Row
                    const row = ui.shareTableBody.insertRow();
                    row.dataset.shareId = share.id;
                    row.dataset.isPublic = share.isPublic; // Store public status on row
                    if (currentShareId === share.id) {
                        row.classList.add('selected');
                    }
                    row.innerHTML = `
                        <td>${share.isFavourite ? '<i class="fas fa-star favourite-icon"></i>' : ''}${share.asxCode}</td>
                        <td>${share.companyName}</td>
                        <td>${share.purchasePrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</td>
                        <td>${share.currentPrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</td>
                        <td>${share.quantity.toLocaleString()}</td>
                        <td>${share.purchaseDate}</td>
                        <td class="${gainLossClass}">${formattedGainLoss}</td>
                        <td class="${gainLossClass}">${formattedPercentage}</td>
                        <td class="action-buttons">
                            <button class="edit-share-btn" data-id="${share.id}" title="Edit Share"><i class="fas fa-edit"></i></button>
                            <button class="delete-share-btn" data-id="${share.id}" title="Delete Share"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;

                    // Add event listeners for table row actions
                    row.querySelector('.edit-share-btn').addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent row click event
                        editShare(share.id);
                    });
                    row.querySelector('.delete-share-btn').addEventListener('click', (e) => {
                        e.stopPropagation(); // Prevent row click event
                        deleteShare(share.id);
                    });
                    row.addEventListener('click', () => viewShareDetails(share.id));

                    // Mobile Card
                    const card = document.createElement('div');
                    card.className = 'share-card';
                    card.dataset.shareId = share.id;
                    card.dataset.isPublic = share.isPublic; // Store public status on card
                    if (currentShareId === share.id) {
                        card.classList.add('selected');
                    }
                    card.innerHTML = `
                        <div class="card-header">
                            <span class="asx-code-display">${share.asxCode}</span>
                            <span class="company-name">${share.companyName}</span>
                            ${share.isFavourite ? '<i class="fas fa-star favourite-icon"></i>' : ''}
                        </div>
                        <div class="card-body">
                            <p><strong>Purchase Price:</strong> ${share.purchasePrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</p>
                            <p><strong>Current Price:</strong> ${share.currentPrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })}</p>
                            <p><strong>Quantity:</strong> ${share.quantity.toLocaleString()}</p>
                            <p><strong>Purchase Date:</strong> ${share.purchaseDate}</p>
                            <p><strong>Gain/Loss:</strong> <span class="${gainLossClass}">${formattedGainLoss} (${formattedPercentage})</span></p>
                            <p class="card-notes">Notes: ${share.notes || 'N/A'}</p>
                        </div>
                        <div class="card-actions">
                            <button class="edit-btn" data-id="${share.id}"><i class="fas fa-edit"></i> Edit</button>
                            <button class="delete-btn" data-id="${share.id}"><i class="fas fa-trash-alt"></i> Delete</button>
                            <button class="view-details-btn" data-id="${share.id}"><i class="fas fa-info-circle"></i> Details</button>
                        </div>
                    `;
                    ui.mobileShareCardsContainer.appendChild(card);

                    // Add event listeners for card actions
                    card.querySelector('.edit-btn').addEventListener('click', () => editShare(share.id));
                    card.querySelector('.delete-btn').addEventListener('click', () => deleteShare(share.id));
                    card.querySelector('.view-details-btn').addEventListener('click', () => viewShareDetails(share.id));
                    // Also make the ASX code clickable to view details
                    card.querySelector('.asx-code-display').addEventListener('click', () => viewShareDetails(share.id));
                });
            }
        });
    }

    // Open Add Share Modal
    function openAddShareModal() {
        ui.shareForm.reset();
        ui.shareFormTitle.textContent = "Add New Share";
        currentShareId = null;
        currentComments = [];
        ui.commentsFormContainer.innerHTML = ''; // Clear comments section for new share
        ui.deleteShareFormBtn.classList.add('hidden'); // Hide delete button for new share
        addCommentSection(); // Add one empty comment section by default
        ui.shareFormModal.classList.add('is-active');
    }

    // Edit Share (populate form)
    async function editShare(shareId) {
        if (!currentUserId) {
            showCustomAlert("Please sign in to edit shares.");
            return;
        }
        try {
            const shareDocRef = window.firestore.doc(db, `artifacts/${window.getFirebaseAppId()}/users/${currentUserId}/shares`, shareId);
            const docSnap = await window.firestore.getDoc(shareDocRef);

            if (docSnap.exists()) {
                const share = docSnap.data();
                currentShareId = shareId; // Set currentShareId for editing

                ui.shareFormTitle.textContent = "Edit Share";
                ui.shareASXCode.value = share.asxCode;
                ui.shareCompanyName.value = share.companyName;
                ui.sharePurchasePrice.value = share.purchasePrice;
                ui.shareCurrentPrice.value = share.currentPrice;
                ui.shareQuantity.value = share.quantity;
                ui.sharePurchaseDate.value = share.purchaseDate;
                ui.shareIsFavourite.checked = share.isFavourite;
                ui.deleteShareFormBtn.classList.remove('hidden'); // Show delete button when editing

                // Fetch and populate comments
                currentComments = []; // Clear previous comments
                ui.commentsFormContainer.innerHTML = ''; // Clear comment sections
                const commentsQuery = window.firestore.query(commentsCollectionRef, window.firestore.where("shareId", "==", shareId));
                const commentsSnapshot = await window.firestore.getDocs(commentsQuery);
                commentsSnapshot.forEach(doc => {
                    currentComments.push({ id: doc.id, ...doc.data() });
                });

                if (currentComments.length > 0) {
                    currentComments.forEach(comment => addCommentSection(comment));
                } else {
                    addCommentSection(); // Add one empty comment section if no comments exist
                }

                ui.shareFormModal.classList.add('is-active');
            } else {
                showCustomAlert("Share not found.");
            }
        } catch (e) {
            console.error("Error fetching share for edit: ", e);
            showCustomAlert("Error loading share for editing. Please try again.");
        }
    }

    // View Share Details Modal
    async function viewShareDetails(shareId) {
        try {
            // Try fetching from user's private collection first
            let shareDocRef = window.firestore.doc(db, `artifacts/${window.getFirebaseAppId()}/users/${currentUserId}/shares`, shareId);
            let docSnap = await window.firestore.getDoc(shareDocRef);
            let isPublicShare = false;

            if (!docSnap.exists()) {
                // If not found in private, try public collection
                shareDocRef = window.firestore.doc(db, `artifacts/${window.getFirebaseAppId()}/public/data/shares`, shareId);
                docSnap = await window.firestore.getDoc(shareDocRef);
                isPublicShare = true;
            }

            if (docSnap.exists()) {
                const share = docSnap.data();
                currentShareId = shareId; // Set currentShareId for detail view
                deselectCurrentShare(); // Deselect any previously selected share
                highlightSelectedShare(shareId); // Highlight the clicked share

                const gainLoss = (share.currentPrice - share.purchasePrice) * share.quantity;
                const gainLossPercentage = (gainLoss / (share.purchasePrice * share.quantity)) * 100;
                const gainLossClass = gainLoss > 0 ? 'positive' : (gainLoss < 0 ? 'negative' : 'neutral');

                ui.detailASXCode.textContent = share.asxCode;
                ui.detailCompanyName.textContent = share.companyName;
                ui.detailPurchasePrice.textContent = share.purchasePrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
                ui.detailCurrentPrice.textContent = share.currentPrice.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
                ui.detailQuantity.textContent = share.quantity.toLocaleString();
                ui.detailPurchaseDate.textContent = share.purchaseDate;
                ui.detailGainLoss.innerHTML = `<span class="${gainLossClass}">${gainLoss.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' })} (${isNaN(gainLossPercentage) ? 'N/A' : gainLossPercentage.toFixed(2) + '%'})</span>`;
                ui.detailIsFavourite.innerHTML = share.isFavourite ? '<i class="fas fa-star favourite-icon"></i> Yes' : 'No';

                // Fetch and display comments for the detailed share
                ui.modalCommentsContainer.innerHTML = '<h3>Comments</h3>'; // Clear previous comments
                const commentsQuery = window.firestore.query(commentsCollectionRef, window.firestore.where("shareId", "==", shareId));
                const commentsSnapshot = await window.firestore.getDocs(commentsQuery);
                if (commentsSnapshot.empty) {
                    ui.modalCommentsContainer.innerHTML += '<p>No comments for this share.</p>';
                } else {
                    commentsSnapshot.forEach(doc => {
                        const comment = doc.data();
                        const commentDiv = document.createElement('div');
                        commentDiv.className = 'modal-comment-item';
                        commentDiv.innerHTML = `
                            <strong>${comment.title} (${comment.date})</strong>
                            <p>${comment.text}</p>
                        `;
                        ui.modalCommentsContainer.appendChild(commentDiv);
                    });
                }

                // Hide edit/delete buttons if it's a public share (users can only edit/delete their own shares)
                if (isPublicShare) {
                    ui.editShareFromDetailsBtn.classList.add('hidden');
                    ui.deleteShareFromDetailsBtn.classList.add('hidden');
                } else {
                    ui.editShareFromDetailsBtn.classList.remove('hidden');
                    ui.deleteShareFromDetailsBtn.classList.remove('hidden');
                }

                ui.shareDetailModal.classList.add('is-active');
            } else {
                showCustomAlert("Share details not found.");
            }
        } catch (e) {
            console.error("Error fetching share details: ", e);
            showCustomAlert("Error loading share details. Please try again.");
        }
    }

    // Add a new comment section to the share form
    function addCommentSection(comment = {}) {
        const commentDiv = document.createElement('div');
        commentDiv.className = 'comment-section';
        commentDiv.innerHTML = `
            <button type="button" class="comment-delete-btn" title="Remove Comment"><i class="fas fa-times-circle"></i></button>
            <label for="commentTitle">Comment Title:</label>
            <input type="text" name="commentTitle" placeholder="e.g., Q1 Performance" value="${comment.title || ''}">
            <label for="commentDate">Comment Date:</label>
            <input type="date" name="commentDate" value="${comment.date || ''}">
            <label for="commentText">Comment Text:</label>
            <textarea name="commentText" rows="3" placeholder="Detailed notes...">${comment.text || ''}</textarea>
        `;
        ui.commentsFormContainer.appendChild(commentDiv);

        // Add event listener for the new delete button
        commentDiv.querySelector('.comment-delete-btn').addEventListener('click', function() {
            commentDiv.remove();
        });
    }

    // Highlight selected share in table/cards
    function highlightSelectedShare(shareId) {
        document.querySelectorAll('.share-table tbody tr, .share-card').forEach(item => {
            item.classList.remove('selected');
            if (item.dataset.shareId === shareId) {
                item.classList.add('selected');
            }
        });
    }

    // Deselect current share
    function deselectCurrentShare() {
        currentShareId = null;
        document.querySelectorAll('.share-table tbody tr, .share-card').forEach(item => {
            item.classList.remove('selected');
        });
    }

    // --- Calculator Logic ---
    function calculateGainLoss() {
        const purchasePrice = parseFloat(ui.calcPurchasePrice.value);
        const currentPrice = parseFloat(ui.calcCurrentPrice.value);
        const quantity = parseInt(ui.calcQuantity.value, 10);

        if (isNaN(purchasePrice) || isNaN(currentPrice) || isNaN(quantity) ||
            purchasePrice <= 0 || currentPrice <= 0 || quantity <= 0) {
            showCustomAlert("Please enter valid positive numbers for all calculator fields.");
            resetCalculatorResults();
            return;
        }

        const gainLoss = (currentPrice - purchasePrice) * quantity;
        const gainLossPercentage = (gainLoss / (purchasePrice * quantity)) * 100;
        const totalCurrentValue = currentPrice * quantity;

        ui.calcResultGainLoss.textContent = gainLoss.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
        ui.calcResultPercentage.textContent = isNaN(gainLossPercentage) ? 'N/A' : `${gainLossPercentage.toFixed(2)}%`;
        ui.calcResultTotalValue.textContent = totalCurrentValue.toLocaleString('en-AU', { style: 'currency', currency: 'AUD' });
    }

    function resetCalculator() {
        ui.calculatorForm.reset();
        resetCalculatorResults();
    }

    function resetCalculatorResults() {
        ui.calcResultGainLoss.textContent = '0.00';
        ui.calcResultPercentage.textContent = '0.00%';
        ui.calcResultTotalValue.textContent = '0.00';
    }

    // --- Theme Management ---
    function applyTheme(themeName) {
        document.body.className = ''; // Clear existing themes
        if (themeName && themeName !== 'default') {
            document.body.classList.add(themeName);
        }
        localStorage.setItem('selectedTheme', themeName);
    }

    function loadTheme() {
        const savedTheme = localStorage.getItem('selectedTheme') || 'default';
        applyTheme(savedTheme);
        if (ui.themeSelect) {
            ui.themeSelect.value = savedTheme;
        }
    }

    // --- Sidebar Toggle ---
    function toggleAppSidebar(forceClose = false) {
        if (forceClose) {
            ui.appSidebar.classList.remove('open');
            ui.sidebarOverlay.classList.remove('open');
            document.body.classList.remove('sidebar-active');
        } else {
            ui.appSidebar.classList.toggle('open');
            ui.sidebarOverlay.classList.toggle('open');
            document.body.classList.toggle('sidebar-active');
        }
    }

    // --- Event Listeners ---

    // Initialize Firebase Auth when DOM is ready
    initFirebaseAuth();
    loadTheme(); // Apply saved theme on load

    // Header Buttons
    ui.addShareHeaderBtn.addEventListener('click', openAddShareModal);
    ui.hamburgerBtn.addEventListener('click', () => toggleAppSidebar());
    ui.signOutHeaderBtn.addEventListener('click', signOutUser);

    // Watchlist Filter Buttons
    ui.allWatchlistBtn.addEventListener('click', () => {
        currentWatchlistFilter = 'all';
        ui.allWatchlistBtn.classList.add('active');
        ui.myWatchlistBtn.classList.remove('active');
        ui.publicWatchlistBtn.classList.remove('active');
        setupRealtimeShareListener();
    });

    ui.myWatchlistBtn.addEventListener('click', () => {
        currentWatchlistFilter = 'my';
        ui.allWatchlistBtn.classList.remove('active');
        ui.myWatchlistBtn.classList.add('active');
        ui.publicWatchlistBtn.classList.remove('active');
        setupRealtimeShareListener();
    });

    ui.publicWatchlistBtn.addEventListener('click', () => {
        currentWatchlistFilter = 'public';
        ui.allWatchlistBtn.classList.remove('active');
        ui.myWatchlistBtn.classList.remove('active');
        ui.publicWatchlistBtn.classList.add('active');
        setupRealtimeShareListener();
    });

    // Sort Dropdowns
    ui.sortByDropdown.addEventListener('change', (e) => {
        currentSortBy = e.target.value;
        setupRealtimeShareListener();
    });

    ui.sortOrderDropdown.addEventListener('change', (e) => {
        currentSortOrder = e.target.value;
        setupRealtimeShareListener();
    });

    // Authentication
    ui.googleAuthBtn.addEventListener('click', signInWithGoogle);

    // Main Add Share Button
    ui.addShareBtn.addEventListener('click', openAddShareModal);

    // Share Form Modal
    ui.shareForm.addEventListener('submit', saveShare);
    ui.shareFormModal.querySelector('.close-button').addEventListener('click', closeModals);
    ui.addCommentBtn.addEventListener('click', addCommentSection);
    ui.deleteShareFormBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent form submission
        if (currentShareId) {
            deleteShare(currentShareId);
        } else {
            showCustomAlert("No share selected for deletion.");
        }
    });

    // Share Detail Modal
    ui.shareDetailModal.querySelector('.close-button').addEventListener('click', closeModals);
    ui.editShareFromDetailsBtn.addEventListener('click', () => {
        closeModals(); // Close detail modal first
        editShare(currentShareId); // Open edit modal
    });
    ui.deleteShareFromDetailsBtn.addEventListener('click', () => {
        deleteShare(currentShareId);
    });

    // Calculator Modal
    ui.sidebarCalculatorBtn.addEventListener('click', () => {
        ui.calculatorModal.classList.add('is-active');
        resetCalculator(); // Reset calculator state when opening
    });
    ui.calculatorModal.querySelector('.close-button').addEventListener('click', closeModals);
    ui.calculateBtn.addEventListener('click', calculateGainLoss);

    // Custom Dialog Modal (for alerts/confirms)
    ui.customDialogModal.querySelector('.close-button').addEventListener('click', closeModals);
    ui.customDialogCancelBtn.addEventListener('click', closeModals); // Ensure cancel also closes

    // Settings Modal
    ui.sidebarSettingsBtn.addEventListener('click', () => ui.settingsModal.classList.add('is-active'));
    ui.settingsModal.querySelector('.close-button').addEventListener('click', closeModals);
    ui.themeSelect.addEventListener('change', (e) => applyTheme(e.target.value));
    ui.resetDataBtn.addEventListener('click', resetUserData);

    // About Modal
    ui.sidebarAboutBtn.addEventListener('click', () => ui.aboutModal.classList.add('is-active'));
    ui.aboutModal.querySelector('.close-button').addEventListener('click', closeModals);

    // Help Modal
    ui.sidebarHelpBtn.addEventListener('click', () => ui.helpModal.classList.add('is-active'));
    ui.helpModal.querySelector('.close-button').addEventListener('click', closeModals);

    // Sidebar specific add share button
    ui.sidebarAddShareBtn.addEventListener('click', () => {
        toggleAppSidebar(true); // Close sidebar first
        openAddShareModal();
    });

    // Sidebar Close Button
    ui.closeSidebarBtn.addEventListener('click', () => toggleAppSidebar(true));

    // Sidebar Overlay Click (to close sidebar)
    ui.sidebarOverlay.addEventListener('click', () => toggleAppSidebar(true));

    // Scroll to Top Button
    window.addEventListener('scroll', () => {
        if (ui.scrollToTopBtn) {
            if (window.scrollY > 200 && window.innerWidth < 768) { // Only show on mobile, after scrolling down
                ui.scrollToTopBtn.style.display = 'flex';
            } else {
                ui.scrollToTopBtn.style.display = 'none';
            }
        }
    });

    if (ui.scrollToTopBtn) {
        ui.scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth'
            });
        });
    }

    // Close modals if escape key is pressed
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModals();
            if (ui.appSidebar.classList.contains('open')) {
                toggleAppSidebar(false); // Force close
            }
        }
    });

    // Handle resize event to adapt sidebar behavior
    window.addEventListener('resize', () => {
        const isDesktop = window.innerWidth > 768;
        // If sidebar is open, close it on resize to prevent layout issues
        if (ui.appSidebar.classList.contains('open')) {
            toggleAppSidebar(false); // Force close
        }
        // Re-evaluate scroll-to-top button visibility on resize
        if (ui.scrollToTopBtn) {
            if (window.innerWidth > 768) {
                ui.scrollToTopBtn.style.display = 'none';
            } else {
                // Re-trigger scroll event to evaluate visibility based on scroll position
                window.dispatchEvent(new Event('scroll'));
            }
        }
    });

    // Add event listeners to close menu when certain menu buttons are clicked
    const menuButtons = ui.appSidebar.querySelectorAll('.menu-button-item');
    menuButtons.forEach(button => {
        if (button.dataset.actionClosesMenu === 'true') {
            button.addEventListener('click', () => {
                toggleAppSidebar(false); // Explicitly close the sidebar after these actions
            });
        }
    });

}); // End DOMContentLoaded
