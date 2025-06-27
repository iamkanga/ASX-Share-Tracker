// File Version: v108
// Last Updated: 2025-06-27 (Implemented all requested fixes and features: button layout, hamburger X size, Sign-in button centering, ghosted text, Price display restructure, Sidebar overlay behavior, All 10 themes, mobile edit button, dynamic comments, desktop ASX click, new cache version)

// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js (v108) DOMContentLoaded fired."); // New log to confirm script version and DOM ready

    // --- Core Helper Functions (DECLARED FIRST FOR HOISTING) ---

    // Centralized Modal Closing Function
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal) {
                modal.style.setProperty('display', 'none', 'important');
            }
        });
        resetCalculator(); // Reset calculator state when closing calculator modal
        deselectCurrentShare(); // Always deselect share when any modal is closed
        if (autoDismissTimeout) { clearTimeout(autoDismissTimeout); autoDismissTimeout = null; }
    }

    // Custom Dialog (Alert/Confirm) Functions
    let customDialogResolve; // To hold the promise resolve function for confirmation dialogs

    function showCustomAlert(message, duration = 1000) {
        if (!customDialogModal || !customDialogMessage || !customDialogConfirmBtn || !customDialogCancelBtn) {
            console.error("Custom dialog elements not found. Cannot show alert.");
            console.log("ALERT MESSAGE:", message); // Still log the message
            return;
        }
        customDialogMessage.textContent = message;
        customDialogCancelBtn.classList.add('hidden'); // Hide cancel button for alerts
        customDialogConfirmBtn.textContent = 'OK'; // Ensure button says OK
        customDialogModal.style.display = 'flex'; // Use flex to center
        customDialogConfirmBtn.focus(); // Focus the button for accessibility

        // Automatically dismiss after duration if provided
        if (duration > 0) {
            setTimeout(() => {
                closeModals();
            }, duration);
        }
    }

    function showCustomConfirm(message) {
        if (!customDialogModal || !customDialogMessage || !customDialogConfirmBtn || !customDialogCancelBtn) {
            console.error("Custom dialog elements not found. Cannot show confirm.");
            return Promise.reject(new Error("Dialog elements missing."));
        }
        customDialogMessage.textContent = message;
        customDialogCancelBtn.classList.remove('hidden'); // Show cancel button for confirms
        customDialogConfirmBtn.textContent = 'Confirm'; // Change text for confirmation
        customDialogModal.style.display = 'flex'; // Use flex to center
        customDialogConfirmBtn.focus(); // Focus the confirm button

        return new Promise((resolve) => {
            customDialogResolve = resolve;
        });
    }


    // --- Element References ---
    const loadingSpinner = document.getElementById('loadingSpinner');
    const authSection = document.getElementById('authSection');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const authError = document.getElementById('authError');
    const shareListSection = document.getElementById('shareListSection');
    const shareTableBody = document.getElementById('shareTableBody');
    const mobileShareCards = document.getElementById('mobileShareCards'); // Mobile cards container
    const noSharesMessage = document.getElementById('noSharesMessage');
    const addShareHeaderBtn = document.getElementById('addShareHeaderBtn');
    const addShareMainBtn = document.getElementById('addShareMainBtn');
    const addShareSidebarBtn = document.getElementById('addShareSidebarBtn');

    const shareFormModal = document.getElementById('shareFormModal');
    const shareFormTitle = document.getElementById('shareFormTitle');
    const shareForm = document.getElementById('shareForm');
    const asxCodeInput = document.getElementById('asxCode');
    const companyNameInput = document.getElementById('companyName');
    const enteredPriceInput = document.getElementById('enteredPrice');
    const currentPriceInput = document.getElementById('currentPrice');
    const dividendYieldInput = document.getElementById('dividendYield');
    const isFavouriteInput = document.getElementById('isFavourite');
    const commentsFormContainer = document.getElementById('commentsFormContainer');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const saveShareBtn = document.getElementById('saveShareBtn');
    const deleteShareFormBtn = document.getElementById('deleteShareFormBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const modalShareName = document.getElementById('modalShareName');
    const modalAsxCode = document.getElementById('modalAsxCode');
    const modalEnteredPrice = document.getElementById('modalEnteredPrice');
    const modalCurrentPrice = document.getElementById('modalCurrentPrice');
    const modalGainLoss = document.getElementById('modalGainLoss');
    const modalDividendYield = document.getElementById('modalDividendYield');
    const modalCommentsContainer = document.getElementById('modalCommentsContainer');
    const editShareFromDetailsBtn = document.getElementById('editShareFromDetailsBtn');
    const deleteShareFromDetailsBtn = document.getElementById('deleteShareFromDetailsBtn');

    const calculatorModal = document.getElementById('calculatorModal');
    const calculatorSidebarBtn = document.getElementById('calculatorSidebarBtn');
    const calculatorForm = document.getElementById('calculatorForm');
    const calculateBtn = document.getElementById('calculateBtn');
    const calculatorResults = document.getElementById('calculatorResults');
    const calcSharesOwned = document.getElementById('calcSharesOwned');
    const calcPurchasePrice = document.getElementById('calcPurchasePrice');
    const calcCurrentPrice = document.getElementById('calcCurrentPrice');
    const calcDividendYield = document.getElementById('calcDividendYield');
    const calcBrokerageBuy = document.getElementById('calcBrokerageBuy');
    const calcBrokerageSell = document.getElementById('calcBrokerageSell');

    const resultPurchaseCost = document.getElementById('resultPurchaseCost');
    const resultCurrentValue = document.getElementById('resultCurrentValue');
    const resultGrossGainLoss = document.getElementById('resultGrossGainLoss');
    const resultNetGainLoss = document.getElementById('resultNetGainLoss');
    const resultPercentageGainLoss = document.getElementById('resultPercentageGainLoss');
    const resultAnnualDividends = document.getElementById('resultAnnualDividends');

    const mainTitle = document.getElementById('mainTitle');
    const appSidebar = document.getElementById('appSidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const closeSidebarBtn = document.getElementById('closeSidebarBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');
    const sidebarUserName = document.getElementById('sidebarUserName');
    const sidebarUserEmail = document.getElementById('sidebarUserEmail');
    const signOutBtn = document.getElementById('signOutBtn');
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');

    const customDialogModal = document.getElementById('customDialogModal');
    const customDialogMessage = document.getElementById('customDialogMessage');
    const customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    const customDialogCancelBtn = document.getElementById('customDialogCancelBtn');

    const allSharesBtn = document.getElementById('allSharesBtn');
    const favouriteSharesBtn = document.getElementById('favouriteSharesBtn');
    const positiveSharesBtn = document.getElementById('positiveSharesBtn');
    const negativeSharesBtn = document.getElementById('negativeSharesBtn');
    const neutralSharesBtn = document.getElementById('neutralSharesBtn');
    const sortOrderDropdown = document.getElementById('sortOrderDropdown');
    const groupingDropdown = document.getElementById('groupingDropdown');
    const watchlistControls = document.getElementById('watchlistControls');

    const scrollToTopBtn = document.getElementById('scrollToTopBtn');

    const themeToggleBtn = document.getElementById('themeToggleBtn');


    let currentShareDocId = null; // Stores the ID of the share being edited/viewed
    let currentUserId = null; // Stores the current logged-in user's ID
    let currentShareSubscription = null; // Holds the Firestore real-time listener
    let sharesCache = []; // Cache for shares data for filtering/sorting
    let autoDismissTimeout = null; // For custom alert auto-dismissal
    let currentFilter = 'all'; // Default filter for watchlist
    let currentSort = 'none'; // Default sort order
    let currentGrouping = 'none'; // Default grouping
    let currentThemeIndex = 0; // Index for current theme
    const themes = ['light-theme', 'dark-theme', 'orange-theme', 'green-theme', 'blue-grey-theme', 'purple-theme', 'teal-theme', 'red-theme', 'yellow-theme', 'pink-theme', 'indigo-theme'];


    // --- UI State Management ---

    function showLoadingSpinner() {
        loadingSpinner.classList.remove('hidden');
        authSection.classList.add('hidden');
        shareListSection.classList.add('hidden');
        watchlistControls.classList.add('hidden');
    }

    function hideLoadingSpinner() {
        loadingSpinner.classList.add('hidden');
    }

    function showAuthSection() {
        authSection.classList.remove('hidden');
        shareListSection.classList.add('hidden');
        watchlistControls.classList.add('hidden');
        mainTitle.textContent = "Share Watchlist"; // Reset title
    }

    function showShareListSection() {
        shareListSection.classList.remove('hidden');
        authSection.classList.add('hidden');
        watchlistControls.classList.remove('hidden');
    }

    // --- Firebase Auth & Firestore Integration ---
    async function initFirebaseAuth() {
        const { onAuthStateChanged, GoogleAuthProviderInstance, signInWithPopup, signOut } = window.authFunctions;
        const { firestoreDb, firestore } = window; // Destructure firestore from window.firestore

        if (!firestoreDb) {
            console.error("Firebase Firestore is not initialized.");
            showCustomAlert("Error: Firebase not initialized. Please check your console.", 3000);
            return;
        }

        onAuthStateChanged(window.firebaseAuth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                sidebarUserName.textContent = user.displayName || "User";
                sidebarUserEmail.textContent = user.email || "";
                mainTitle.textContent = `${user.displayName ? user.displayName.split(' ')[0] + "'s" : "My"} Watchlist`;
                showShareListSection();
                hideLoadingSpinner();
                subscribeToShares(currentUserId);
                loadThemePreference(); // Load theme preference on login
            } else {
                currentUserId = null;
                sidebarUserName.textContent = "Guest";
                sidebarUserEmail.textContent = "";
                mainTitle.textContent = "Share Watchlist";
                showAuthSection();
                hideLoadingSpinner();
                if (currentShareSubscription) {
                    currentShareSubscription(); // Unsubscribe from old listener
                    currentShareSubscription = null;
                }
                shareTableBody.innerHTML = ''; // Clear shares
                mobileShareCards.innerHTML = ''; // Clear mobile cards
                noSharesMessage.classList.add('hidden'); // Hide "no shares" message
                closeModals(); // Close any open modals on sign out
                document.body.classList.remove(...themes); // Remove all theme classes
                document.body.classList.add('light-theme'); // Default to light theme
                localStorage.removeItem('theme'); // Clear stored theme
            }
        });

        googleAuthBtn.addEventListener('click', async () => {
            try {
                showLoadingSpinner();
                await signInWithPopup(window.firebaseAuth, GoogleAuthProviderInstance);
                // User will be redirected or onAuthStateChanged will handle state
            } catch (error) {
                console.error("Google Auth Error:", error);
                authError.textContent = `Authentication failed: ${error.message}`;
                hideLoadingSpinner();
                showAuthSection();
            }
        });

        signOutBtn.addEventListener('click', async () => {
            try {
                await signOut(window.firebaseAuth);
                showCustomAlert("Signed out successfully!", 1500);
            } catch (error) {
                console.error("Sign Out Error:", error);
                showCustomAlert(`Sign out failed: ${error.message}`);
            }
        });

        deleteAccountBtn.addEventListener('click', async () => {
            const confirmDelete = await showCustomConfirm("Are you sure you want to delete your account and all your data? This cannot be undone.");
            if (confirmDelete) {
                try {
                    showLoadingSpinner();
                    const { firestoreDb, firestore } = window;
                    const { currentUser } = window.firebaseAuth;

                    if (!currentUser) {
                        throw new Error("No user is signed in.");
                    }

                    const userSharesCollectionRef = firestore.collection(firestoreDb, `users/${currentUser.uid}/shares`);
                    const querySnapshot = await firestore.getDocs(firestore.query(userSharesCollectionRef));
                    const batch = firestore.writeBatch(firestoreDb);

                    querySnapshot.forEach((doc) => {
                        batch.delete(doc.ref);
                    });

                    await batch.commit(); // Delete all user's shares
                    await currentUser.delete(); // Delete user account

                    showCustomAlert("Account and all data deleted successfully.", 2000);
                    // onAuthStateChanged will handle UI update
                } catch (error) {
                    console.error("Error deleting account:", error);
                    // Handle specific errors like auth/requires-recent-login
                    if (error.code === 'auth/requires-recent-login') {
                        showCustomAlert("Please sign in again to delete your account.", 3000);
                        // Force sign out to prompt re-authentication
                        await signOut(window.firebaseAuth);
                    } else {
                        showCustomAlert(`Error deleting account: ${error.message}`, 3000);
                    }
                    hideLoadingSpinner();
                    showShareListSection(); // Remain on share list if deletion failed
                }
            }
        });
    }

    // --- Share Data Handling ---
    function subscribeToShares(userId) {
        if (currentShareSubscription) {
            currentShareSubscription(); // Unsubscribe from previous listener
        }

        const { firestoreDb, firestore } = window;
        const q = firestore.query(firestore.collection(firestoreDb, `users/${userId}/shares`));

        currentShareSubscription = firestore.onSnapshot(q, (snapshot) => {
            const shares = [];
            snapshot.forEach((doc) => {
                shares.push({ id: doc.id, ...doc.data() });
            });
            sharesCache = shares; // Update the cache
            updateShareListUI(); // Re-render with current filter/sort/group
        }, (error) => {
            console.error("Error fetching shares:", error);
            showCustomAlert("Error fetching shares. Please try again later.");
        });
    }

    async function addOrUpdateShare(shareData) {
        showLoadingSpinner();
        const { firestoreDb, firestore } = window;
        const sharesCollectionRef = firestore.collection(firestoreDb, `users/${currentUserId}/shares`);

        // Clean up empty comment sections before saving
        const cleanedComments = shareData.comments.filter(
            comment => comment.title.trim() !== '' || comment.text.trim() !== ''
        );
        shareData.comments = cleanedComments;

        try {
            if (shareData.id) {
                // Update existing share
                const shareDocRef = firestore.doc(sharesCollectionRef, shareData.id);
                // Remove the 'id' field before updating Firestore
                const { id, ...dataToUpdate } = shareData;
                await firestore.setDoc(shareDocRef, dataToUpdate, { merge: true }); // Use setDoc with merge for robustness
                showCustomAlert("Share updated successfully!", 1500);
            } else {
                // Add new share
                await firestore.addDoc(sharesCollectionRef, shareData);
                showCustomAlert("Share added successfully!", 1500);
            }
            closeModals();
            shareForm.reset(); // Clear form
            resetCommentSections(); // Reset comment sections after saving
            // The onSnapshot listener will automatically re-render the list
        } catch (error) {
            console.error("Error adding/updating share:", error);
            showCustomAlert(`Error saving share: ${error.message}`);
        } finally {
            hideLoadingSpinner();
        }
    }

    async function deleteShare(shareId) {
        const confirmDelete = await showCustomConfirm("Are you sure you want to delete this share?");
        if (confirmDelete) {
            showLoadingSpinner();
            const { firestoreDb, firestore } = window;
            const sharesCollectionRef = firestore.collection(firestoreDb, `users/${currentUserId}/shares`);
            try {
                await firestore.deleteDoc(firestore.doc(sharesCollectionRef, shareId));
                showCustomAlert("Share deleted successfully!", 1500);
                closeModals(); // Close the modal after deletion
                // onSnapshot listener will update UI
            } catch (error) {
                console.error("Error deleting share:", error);
                showCustomAlert(`Error deleting share: ${error.message}`);
            } finally {
                hideLoadingSpinner();
            }
        }
    }

    async function toggleFavourite(shareId, isFavourite) {
        showLoadingSpinner();
        const { firestoreDb, firestore } = window;
        const shareDocRef = firestore.doc(firestore.collection(firestoreDb, `users/${currentUserId}/shares`), shareId);
        try {
            await firestore.updateDoc(shareDocRef, { isFavourite: !isFavourite });
            // UI will update via onSnapshot
        } catch (error) {
            console.error("Error toggling favourite:", error);
            showCustomAlert("Error updating favourite status.");
        } finally {
            hideLoadingSpinner();
        }
    }


    // --- UI Rendering ---

    function updateShareListUI() {
        let sharesToRender = [...sharesCache]; // Work with a copy

        // Apply filter
        if (currentFilter !== 'all') {
            sharesToRender = sharesToRender.filter(share => {
                const gain = calculateGainLoss(share.enteredPrice, share.currentPrice).percentage;
                if (currentFilter === 'favourite') return share.isFavourite;
                if (currentFilter === 'positive') return gain > 0;
                if (currentFilter === 'negative') return gain < 0;
                if (currentFilter === 'neutral') return gain === 0;
                return true; // Should not happen with defined filters
            });
        }

        // Apply sort
        if (currentSort !== 'none') {
            sharesToRender.sort((a, b) => {
                switch (currentSort) {
                    case 'name-asc': return a.companyName.localeCompare(b.companyName);
                    case 'name-desc': return b.companyName.localeCompare(a.companyName);
                    case 'gain-desc': return calculateGainLoss(b.enteredPrice, b.currentPrice).percentage - calculateGainLoss(a.enteredPrice, a.currentPrice).percentage;
                    case 'gain-asc': return calculateGainLoss(a.enteredPrice, a.currentPrice).percentage - calculateGainLoss(b.enteredPrice, b.currentPrice).percentage;
                    case 'current-price-desc': return b.currentPrice - a.currentPrice;
                    case 'current-price-asc': return a.currentPrice - b.currentPrice;
                    case 'asx-code-asc': return a.asxCode.localeCompare(b.asxCode);
                    case 'asx-code-desc': return b.asxCode.localeCompare(a.asxCode);
                    default: return 0;
                }
            });
        }

        // Apply grouping
        let groupedShares = {};
        if (currentGrouping !== 'none') {
            groupedShares = sharesToRender.reduce((acc, share) => {
                let groupKey;
                switch (currentGrouping) {
                    case 'gain-status':
                        const gain = calculateGainLoss(share.enteredPrice, share.currentPrice).percentage;
                        if (gain > 0) groupKey = 'Positive Gain';
                        else if (gain < 0) groupKey = 'Negative Gain';
                        else groupKey = 'Neutral Gain';
                        break;
                    case 'exchange':
                        groupKey = share.exchange || 'N/A'; // Assuming an 'exchange' field if available
                        break;
                    case 'favourite':
                        groupKey = share.isFavourite ? 'Favourites' : 'Non-Favourites';
                        break;
                    default:
                        groupKey = 'Ungrouped';
                }
                if (!acc[groupKey]) acc[groupKey] = [];
                acc[groupKey].push(share);
                return acc;
            }, {});
        } else {
            groupedShares['All Shares'] = sharesToRender; // No grouping, just one large group
        }


        shareTableBody.innerHTML = '';
        mobileShareCards.innerHTML = '';

        if (sharesToRender.length === 0) {
            noSharesMessage.classList.remove('hidden');
        } else {
            noSharesMessage.classList.add('hidden');
            for (const groupName in groupedShares) {
                // Add group header for tables (desktop)
                if (currentGrouping !== 'none') {
                    const groupHeaderRow = shareTableBody.insertRow();
                    groupHeaderRow.classList.add('group-header');
                    const groupHeaderCell = groupHeaderRow.insertCell(0);
                    groupHeaderCell.colSpan = 9; // Span all columns
                    groupHeaderCell.textContent = groupName;
                }

                // Add group header for mobile cards
                if (currentGrouping !== 'none') {
                    const groupHeaderCard = document.createElement('h3');
                    groupHeaderCard.classList.add('mobile-group-header');
                    groupHeaderCard.textContent = groupName;
                    mobileShareCards.appendChild(groupHeaderCard);
                }

                groupedShares[groupName].forEach(share => {
                    const gainLoss = calculateGainLoss(share.enteredPrice, share.currentPrice);
                    const gainLossClass = gainLoss.percentage > 0 ? 'positive' : gainLoss.percentage < 0 ? 'negative' : 'neutral';
                    const favouriteIconClass = share.isFavourite ? 'fas' : 'far'; // fas for solid, far for regular

                    // For Desktop Table
                    const row = shareTableBody.insertRow();
                    row.dataset.docId = share.id; // Store Firestore document ID
                    row.innerHTML = `
                        <td><i class="${favouriteIconClass} fa-star favourite-icon" data-id="${share.id}" data-favourite="${share.isFavourite}"></i></td>
                        <td><button class="asx-code-btn" data-id="${share.id}">${share.asxCode}</button></td>
                        <td>${share.companyName}</td>
                        <td>$${share.enteredPrice.toFixed(2)}</td>
                        <td>$${share.currentPrice.toFixed(2)}</td>
                        <td class="${gainLossClass}">${gainLoss.percentage.toFixed(2)}% (${gainLoss.value.toFixed(2)})</td>
                        <td>${share.dividendYield ? share.dividendYield.toFixed(2) + '%' : 'N/A'}</td>
                        <td>${share.comments && share.comments.length > 0 ? `<i class="fas fa-comment-dots" title="${share.comments.map(c => `${c.title}: ${c.text}`).join('\n')}"></i>` : ''}</td>
                        <td class="action-buttons">
                            <button class="edit-share-btn" data-id="${share.id}"><i class="fas fa-edit"></i></button>
                            <button class="delete-share-btn" data-id="${share.id}"><i class="fas fa-trash-alt"></i></button>
                        </td>
                    `;

                    // For Mobile Cards
                    const card = document.createElement('div');
                    card.classList.add('share-card');
                    card.dataset.docId = share.id;
                    card.innerHTML = `
                        <div class="card-header">
                            <span class="asx-code-display" data-id="${share.id}">${share.asxCode}</span>
                            <span class="company-name">${share.companyName}</span>
                            <i class="${favouriteIconClass} fa-star favourite-icon" data-id="${share.id}" data-favourite="${share.isFavourite}"></i>
                        </div>
                        <div class="card-body">
                            <p>Entered Price: <span>$${share.enteredPrice.toFixed(2)}</span></p>
                            <p>Current Price: <span>$${share.currentPrice.toFixed(2)}</span></p>
                            <p>Gain/Loss: <span class="${gainLossClass}">${gainLoss.percentage.toFixed(2)}% ($${gainLoss.value.toFixed(2)})</span></p>
                            <p>Dividend Yield: <span>${share.dividendYield ? share.dividendYield.toFixed(2) + '%' : 'N/A'}</span></p>
                            <p class="card-notes">${share.comments && share.comments.length > 0 ? `<i class="fas fa-comment-dots" title="${share.comments.map(c => `${c.title}: ${c.text}`).join('\n')}"></i> Notes present` : 'No Notes'}</p>
                        </div>
                        <div class="card-actions">
                            <button class="view-details-btn" data-id="${share.id}">View Details</button>
                            <button class="edit-share-btn" data-id="${share.id}">Edit</button>
                            <button class="delete-share-btn" data-id="${share.id}">Delete</button>
                        </div>
                    `;
                    mobileShareCards.appendChild(card);
                });
            }
        }
        addEventListenersToShares();
    }

    function addEventListenersToShares() {
        // Event listeners for edit/delete buttons (both table and cards)
        document.querySelectorAll('.edit-share-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation(); // Prevent row click if applicable
                const shareId = e.currentTarget.dataset.id;
                showShareForm(shareId);
            };
        });

        document.querySelectorAll('.delete-share-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation(); // Prevent row click if applicable
                const shareId = e.currentTarget.dataset.id;
                deleteShare(shareId);
            };
        });

        // Event listeners for favourite icons
        document.querySelectorAll('.favourite-icon').forEach(icon => {
            icon.onclick = (e) => {
                e.stopPropagation();
                const shareId = e.currentTarget.dataset.id;
                const isFavourite = e.currentTarget.dataset.favourite === 'true';
                toggleFavourite(shareId, isFavourite);
            };
        });

        // Event listeners for mobile card view details button
        document.querySelectorAll('.view-details-btn').forEach(button => {
            button.onclick = (e) => {
                e.stopPropagation();
                const shareId = e.currentTarget.dataset.id;
                showShareDetails(shareId);
            };
        });

        // Event listener for ASX Code buttons (desktop table)
        // Note: Mobile cards use a 'view-details-btn' for similar functionality
        if (window.innerWidth >= 768) { // Only apply on desktop
            document.querySelectorAll('.asx-code-btn').forEach(button => {
                button.onclick = (e) => {
                    e.stopPropagation(); // Prevent any parent click handlers
                    const shareId = e.currentTarget.dataset.id;
                    showShareDetails(shareId); // Open details modal on click
                };
            });
        }
    }


    function calculateGainLoss(enteredPrice, currentPrice) {
        const value = currentPrice - enteredPrice;
        const percentage = (value / enteredPrice) * 100;
        return { value, percentage };
    }


    // --- Share Form Modal Functions ---
    function showShareForm(shareId = null) {
        currentShareDocId = shareId;
        shareForm.reset(); // Clear previous form data
        resetCommentSections(); // Start with one empty comment section

        if (shareId) {
            shareFormTitle.textContent = "Edit Share";
            saveShareBtn.textContent = "Update Share";
            deleteShareFormBtn.classList.remove('hidden');
            const share = sharesCache.find(s => s.id === shareId);
            if (share) {
                asxCodeInput.value = share.asxCode;
                companyNameInput.value = share.companyName;
                enteredPriceInput.value = share.enteredPrice;
                currentPriceInput.value = share.currentPrice;
                dividendYieldInput.value = share.dividendYield || '';
                isFavouriteInput.checked = share.isFavourite || false;

                // Populate dynamic comments
                if (share.comments && share.comments.length > 0) {
                    commentsFormContainer.innerHTML = ''; // Clear initial one
                    share.comments.forEach((comment, index) => {
                        addCommentSection(comment.title, comment.text);
                    });
                } else {
                    resetCommentSections(); // Ensure at least one empty comment section is present
                }

            } else {
                showCustomAlert("Share not found!", 1500);
                closeModals();
                return;
            }
        } else {
            shareFormTitle.textContent = "Add New Share";
            saveShareBtn.textContent = "Save Share";
            deleteShareFormBtn.classList.add('hidden');
        }
        shareFormModal.style.display = 'flex';
        asxCodeInput.focus(); // Focus on the first input
    }

    function addCommentSection(title = '', text = '') {
        const commentCount = commentsFormContainer.querySelectorAll('.comment-section').length + 1;
        const newCommentSection = document.createElement('div');
        newCommentSection.classList.add('comment-section');
        newCommentSection.innerHTML = `
            <button type="button" class="remove-comment-btn" title="Remove comment section">&times;</button>
            <label for="commentTitle${commentCount}">Comment Title:</label>
            <input type="text" id="commentTitle${commentCount}" class="comment-title" placeholder="e.g., Investment Thesis" value="${title}">
            <label for="commentText${commentCount}">Comment:</label>
            <textarea id="commentText${commentCount}" class="comment-text" rows="3" placeholder="e.g., Strong fundamentals, long-term hold.">${text}</textarea>
        `;
        commentsFormContainer.appendChild(newCommentSection);

        // Add event listener to the new remove button
        newCommentSection.querySelector('.remove-comment-btn').addEventListener('click', (event) => {
            event.target.closest('.comment-section').remove();
            // If all are removed, add an empty one back
            if (commentsFormContainer.querySelectorAll('.comment-section').length === 0) {
                addCommentSection();
            }
        });
    }

    function resetCommentSections() {
        commentsFormContainer.innerHTML = ''; // Clear all
        addCommentSection(); // Add one empty section
    }

    // --- Share Details Modal Functions ---
    function showShareDetails(shareId) {
        const share = sharesCache.find(s => s.id === shareId);
        if (!share) {
            showCustomAlert("Share details not found!", 1500);
            return;
        }

        currentShareDocId = shareId; // Store for edit/delete buttons
        modalShareName.textContent = share.companyName;
        modalAsxCode.textContent = share.asxCode;
        modalEnteredPrice.textContent = `$${share.enteredPrice.toFixed(2)}`;
        modalCurrentPrice.textContent = `$${share.currentPrice.toFixed(2)}`;

        const gainLoss = calculateGainLoss(share.enteredPrice, share.currentPrice);
        modalGainLoss.textContent = `${gainLoss.percentage.toFixed(2)}% ($${gainLoss.value.toFixed(2)})`;
        modalGainLoss.className = ``; // Clear previous classes
        modalGainLoss.classList.add(gainLoss.percentage > 0 ? 'positive' : gainLoss.percentage < 0 ? 'negative' : 'neutral');

        modalDividendYield.textContent = share.dividendYield ? `${share.dividendYield.toFixed(2)}%` : 'N/A';

        // Display comments dynamically
        modalCommentsContainer.innerHTML = '';
        if (share.comments && share.comments.length > 0) {
            share.comments.forEach(comment => {
                if (comment.title || comment.text) { // Only display if title or text exists
                    const commentDiv = document.createElement('div');
                    commentDiv.classList.add('modal-comment-item');
                    commentDiv.innerHTML = `
                        ${comment.title ? `<h4>${comment.title}</h4>` : ''}
                        ${comment.text ? `<p>${comment.text}</p>` : ''}
                    `;
                    modalCommentsContainer.appendChild(commentDiv);
                }
            });
        } else {
            modalCommentsContainer.innerHTML = '<p>No notes for this share.</p>';
        }

        shareDetailModal.style.display = 'flex';
    }

    function deselectCurrentShare() {
        currentShareDocId = null;
    }


    // --- Calculator Modal Functions ---
    function showCalculatorModal() {
        calculatorModal.style.display = 'flex';
        resetCalculator();
    }

    function resetCalculator() {
        calculatorForm.reset();
        calculatorResults.classList.add('hidden');
    }

    function calculateShareMetrics() {
        const sharesOwned = parseFloat(calcSharesOwned.value) || 0;
        const purchasePrice = parseFloat(calcPurchasePrice.value) || 0;
        const currentPrice = parseFloat(calcCurrentPrice.value) || 0;
        const dividendYield = parseFloat(calcDividendYield.value) || 0;
        const brokerageBuy = parseFloat(calcBrokerageBuy.value) || 0;
        const brokerageSell = parseFloat(calcBrokerageSell.value) || 0;

        if (sharesOwned <= 0 || purchasePrice <= 0 || currentPrice <= 0) {
            showCustomAlert("Please enter valid positive numbers for Shares Owned, Purchase Price, and Current Price.", 2000);
            calculatorResults.classList.add('hidden');
            return;
        }

        const totalPurchaseCost = (sharesOwned * purchasePrice) + brokerageBuy;
        const currentValue = (sharesOwned * currentPrice) - brokerageSell;
        const grossGainLoss = currentValue - (sharesOwned * purchasePrice); // Before brokerage sell
        const netGainLoss = currentValue - totalPurchaseCost;
        const percentageGainLoss = (netGainLoss / totalPurchaseCost) * 100;
        const annualDividends = (sharesOwned * currentPrice * (dividendYield / 100)); // Dividends based on current value

        resultPurchaseCost.textContent = `$${totalPurchaseCost.toFixed(2)}`;
        resultCurrentValue.textContent = `$${currentValue.toFixed(2)}`;
        resultGrossGainLoss.textContent = `$${grossGainLoss.toFixed(2)}`;
        resultNetGainLoss.textContent = `$${netGainLoss.toFixed(2)}`;
        resultPercentageGainLoss.textContent = `${percentageGainLoss.toFixed(2)}%`;
        resultAnnualDividends.textContent = `$${annualDividends.toFixed(2)}`;

        // Apply colors to net gain/loss
        resultNetGainLoss.classList.remove('positive', 'negative', 'neutral');
        if (netGainLoss > 0) resultNetGainLoss.classList.add('positive');
        else if (netGainLoss < 0) resultNetGainLoss.classList.add('negative');
        else resultNetGainLoss.classList.add('neutral');

        // Apply colors to percentage gain/loss
        resultPercentageGainLoss.classList.remove('positive', 'negative', 'neutral');
        if (percentageGainLoss > 0) resultPercentageGainLoss.classList.add('positive');
        else if (percentageGainLoss < 0) resultPercentageGainLoss.classList.add('negative');
        else resultPercentageGainLoss.classList.add('neutral');


        calculatorResults.classList.remove('hidden');
    }


    // --- Theme Management ---
    function loadThemePreference() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme && themes.includes(savedTheme)) {
            document.body.classList.remove(...themes); // Remove all existing themes
            document.body.classList.add(savedTheme);
            currentThemeIndex = themes.indexOf(savedTheme);
            console.log(`[Theme] Loaded theme from localStorage: ${savedTheme}`);
        } else {
            // Default to light theme if no preference or invalid preference found
            document.body.classList.add('light-theme');
            localStorage.setItem('theme', 'light-theme');
            currentThemeIndex = themes.indexOf('light-theme');
            console.log("[Theme] No theme preference found or invalid, defaulting to light-theme.");
        }
    }

    function toggleTheme() {
        currentThemeIndex = (currentThemeIndex + 1) % themes.length;
        const newTheme = themes[currentThemeIndex];
        
        document.body.classList.remove(...themes); // Remove all previous themes
        document.body.classList.add(newTheme); // Add the new theme
        localStorage.setItem('theme', newTheme); // Save preference
        console.log(`[Theme] Switched to theme: ${newTheme}`);
    }


    // --- Event Listeners ---
    // Initialize Firebase Auth when DOM is ready
    initFirebaseAuth();

    // Modal close buttons
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', (event) => {
            const modalId = event.target.dataset.modal;
            const modalToClose = document.getElementById(modalId);
            if (modalToClose) {
                modalToClose.style.display = 'none';
                deselectCurrentShare(); // Deselect share if any modal closed
            }
        });
    });

    // Close modals on escape key
    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
            closeModals();
        }
    });

    // Add Share button handlers
    addShareHeaderBtn.addEventListener('click', () => showShareForm());
    addShareMainBtn.addEventListener('click', () => showShareForm());
    addShareSidebarBtn.addEventListener('click', () => showShareForm());

    // Share Form Submission
    shareForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const comments = [];
        commentsFormContainer.querySelectorAll('.comment-section').forEach(section => {
            const titleInput = section.querySelector('.comment-title');
            const textInput = section.querySelector('.comment-text');
            comments.push({
                title: titleInput ? titleInput.value.trim() : '',
                text: textInput ? textInput.value.trim() : ''
            });
        });

        const shareData = {
            asxCode: asxCodeInput.value.toUpperCase().trim(),
            companyName: companyNameInput.value.trim(),
            enteredPrice: parseFloat(enteredPriceInput.value),
            currentPrice: parseFloat(currentPriceInput.value),
            dividendYield: parseFloat(dividendYieldInput.value) || 0, // Default to 0 if empty
            isFavourite: isFavouriteInput.checked,
            comments: comments, // Array of {title, text} objects
            timestamp: new Date() // Add or update timestamp
        };

        if (currentShareDocId) {
            shareData.id = currentShareDocId; // Add ID for update operation
        }
        addOrUpdateShare(shareData);
    });

    // Delete Share button in Share Form Modal
    deleteShareFormBtn.addEventListener('click', () => {
        if (currentShareDocId) {
            deleteShare(currentShareDocId);
        } else {
            showCustomAlert("No share selected to delete.", 1500);
        }
    });

    // Edit Share button in Share Details Modal
    editShareFromDetailsBtn.addEventListener('click', () => {
        if (currentShareDocId) {
            closeModals(); // Close details modal first
            showShareForm(currentShareDocId); // Open form with share data
        } else {
            showCustomAlert("No share selected to edit.", 1500);
        }
    });

    // Delete Share button in Share Details Modal
    deleteShareFromDetailsBtn.addEventListener('click', () => {
        if (currentShareDocId) {
            deleteShare(currentShareDocId);
        } else {
            showCustomAlert("No share selected to delete.", 1500);
        }
    });

    // Calculator button
    calculatorSidebarBtn.addEventListener('click', showCalculatorModal);
    calculateBtn.addEventListener('click', calculateShareMetrics);

    // Custom dialog button handlers
    customDialogConfirmBtn.addEventListener('click', () => {
        closeModals();
        if (customDialogResolve) {
            customDialogResolve(true); // Resolve with true for confirm
            customDialogResolve = null; // Clear resolver
        }
    });

    customDialogCancelBtn.addEventListener('click', () => {
        closeModals();
        if (customDialogResolve) {
            customDialogResolve(false); // Resolve with false for cancel
            customDialogResolve = null; // Clear resolver
        }
    });


    // Filtering and Sorting event listeners
    allSharesBtn.addEventListener('click', () => {
        currentFilter = 'all';
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        allSharesBtn.classList.add('active');
        updateShareListUI();
    });

    favouriteSharesBtn.addEventListener('click', () => {
        currentFilter = 'favourite';
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        favouriteSharesBtn.classList.add('active');
        updateShareListUI();
    });

    positiveSharesBtn.addEventListener('click', () => {
        currentFilter = 'positive';
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        positiveSharesBtn.classList.add('active');
        updateShareListUI();
    });

    negativeSharesBtn.addEventListener('click', () => {
        currentFilter = 'negative';
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        negativeSharesBtn.classList.add('active');
        updateShareListUI();
    });

    neutralSharesBtn.addEventListener('click', () => {
        currentFilter = 'neutral';
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        neutralSharesBtn.classList.add('active');
        updateShareListUI();
    });

    sortOrderDropdown.addEventListener('change', (event) => {
        currentSort = event.target.value;
        updateShareListUI();
    });

    groupingDropdown.addEventListener('change', (event) => {
        currentGrouping = event.target.value;
        updateShareListUI();
    });

    // Scroll-to-top button logic
    window.addEventListener('scroll', () => {
        if (scrollToTopBtn) {
            if (window.scrollY > 300 && window.innerWidth < 768) { // Only show on mobile
                scrollToTopBtn.style.display = 'flex';
            } else {
                scrollToTopBtn.style.display = 'none';
            }
        }
    });

    if (scrollToTopBtn) {
        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({
                top: 0,
                behavior: 'smooth' // Smooth scroll
            });
        });
    }

    // Add Comment Button
    addCommentBtn.addEventListener('click', () => addCommentSection());

    // Theme Toggle Button
    themeToggleBtn.addEventListener('click', toggleTheme);
    loadThemePreference(); // Load theme on script load

    // Sidebar toggle and close listeners
    if (hamburgerBtn && appSidebar && sidebarOverlay && closeSidebarBtn) {
        hamburgerBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent this click from bubbling to document and closing
            toggleAppSidebar();
        });

        closeSidebarBtn.addEventListener('click', () => {
            toggleAppSidebar(false); // Explicitly close
        });

        sidebarOverlay.addEventListener('click', () => {
            toggleAppSidebar(false); // Explicitly close
        });

        // Document click listener for auto-closing sidebar
        document.addEventListener('click', (event) => {
            const isClickInsideSidebar = appSidebar.contains(event.target);
            const isClickOnHamburger = hamburgerBtn.contains(event.target);
            const isAppSidebarOpen = appSidebar.classList.contains('open');

            // Close sidebar if clicking outside the sidebar AND not on the hamburger button, AND sidebar is open
            if (!isClickInsideSidebar && !isClickOnHamburger && isAppSidebarOpen) {
                toggleAppSidebar(false); // Force close the sidebar
            }
        });

        // Handle resize event to adapt sidebar behavior
        window.addEventListener('resize', () => {
            // If sidebar is open, close it on resize to prevent layout issues
            if (appSidebar.classList.contains('open')) {
                toggleAppSidebar(false); // Force close
            }
            // Re-evaluate scroll-to-top button visibility on resize (only if applicable on desktop)
            if (scrollToTopBtn) {
                if (window.innerWidth >= 768) { // Desktop
                    scrollToTopBtn.style.display = 'none';
                } else { // Mobile
                    // Re-trigger scroll event to evaluate visibility based on scroll position
                    window.dispatchEvent(new Event('scroll'));
                }
            }
        });

        // Add event listeners to close menu when certain menu buttons are clicked
        const menuButtons = appSidebar.querySelectorAll('.menu-button-item');
        menuButtons.forEach(button => {
            if (button.dataset.actionClosesMenu === 'true') { 
                button.addEventListener('click', () => {
                    toggleAppSidebar(false); // Explicitly close the sidebar after these actions
                });
            }
        });
    }

}); // End DOMContentLoaded