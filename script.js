/*
 * File: script.js
 * Version: 124
 * Last Updated: 2025-06-27 (Implemented class-based modal show/hide, added closeAllModals on load, consolidated custom dialogs)
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
    loadingSpinner: document.getElementById('loadingSpinner'),
    authSection: document.getElementById('authSection'),
    googleAuthBtn: document.getElementById('googleAuthBtn'),
    authError: document.getElementById('authError'),
    shareListSection: document.getElementById('shareListSection'),
    shareTableBody: document.getElementById('shareTableBody'),
    mobileShareCards: document.getElementById('mobileShareCards'),
    noSharesMessage: document.getElementById('noSharesMessage'),
    addShareHeaderBtn: document.getElementById('addShareHeaderBtn'),
    addShareMainBtn: document.getElementById('addShareMainBtn'),
    addShareSidebarBtn: document.getElementById('addShareSidebarBtn'),

    shareFormModal: document.getElementById('shareFormModal'),
    shareFormTitle: document.getElementById('shareFormTitle'),
    shareForm: document.getElementById('shareForm'),
    asxCodeInput: document.getElementById('asxCode'),
    companyNameInput: document.getElementById('companyName'),
    enteredPriceInput: document.getElementById('enteredPrice'),
    currentPriceInput: document.getElementById('currentPrice'),
    dividendYieldInput: document.getElementById('dividendYield'),
    isFavouriteInput: document.getElementById('isFavourite'),
    commentsFormContainer: document.getElementById('commentsFormContainer'),
    addCommentBtn: document.getElementById('addCommentBtn'),
    saveShareBtn: document.getElementById('saveShareBtn'),
    deleteShareFormBtn: document.getElementById('deleteShareFormBtn'),

    shareDetailModal: document.getElementById('shareDetailModal'),
    modalShareName: document.getElementById('modalShareName'),
    modalAsxCode: document.getElementById('modalAsxCode'),
    modalEnteredPrice: document.getElementById('modalEnteredPrice'),
    modalCurrentPrice: document.getElementById('modalCurrentPrice'),
    modalGainLoss: document.getElementById('modalGainLoss'),
    modalDividendYield: document.getElementById('modalDividendYield'),
    modalCommentsContainer: document.getElementById('modalCommentsContainer'),
    editShareFromDetailsBtn: document.getElementById('editShareFromDetailsBtn'),
    deleteShareFromDetailsBtn: document.getElementById('deleteShareFromDetailsBtn'),

    calculatorModal: document.getElementById('calculatorModal'),
    calculatorSidebarBtn: document.getElementById('calculatorSidebarBtn'),
    calculatorForm: document.getElementById('calculatorForm'),
    calculateBtn: document.getElementById('calculateBtn'),
    calculatorResults: document.getElementById('calculatorResults'),
    calcSharesOwned: document.getElementById('calcSharesOwned'),
    calcPurchasePrice: document.getElementById('calcPurchasePrice'),
    calcCurrentPrice: document.getElementById('calcCurrentPrice'),
    calcDividendYield: document.getElementById('calcDividendYield'),
    calcBrokerageBuy: document.getElementById('calcBrokerageBuy'),
    calcBrokerageSell: document.getElementById('calcBrokerageSell'),

    resultPurchaseCost: document.getElementById('resultPurchaseCost'),
    resultCurrentValue: document.getElementById('resultCurrentValue'),
    resultGrossGainLoss: document.getElementById('resultGrossGainLoss'),
    resultNetGainLoss: document.getElementById('resultNetGainLoss'),
    resultPercentageGainLoss: document.getElementById('resultPercentageGainLoss'),
    resultAnnualDividends: document.getElementById('resultAnnualDividends'),

    mainTitle: document.getElementById('mainTitle'),
    appSidebar: document.getElementById('appSidebar'),
    hamburgerBtn: document.getElementById('hamburgerBtn'),
    closeSidebarBtn: document.getElementById('closeSidebarBtn'),
    sidebarOverlay: document.getElementById('sidebarOverlay'),
    sidebarUserName: document.getElementById('sidebarUserName'),
    sidebarUserEmail: document.getElementById('sidebarUserEmail'),
    signOutBtn: document.getElementById('signOutBtn'),
    deleteAccountBtn: document.getElementById('deleteAccountBtn'),

    customDialogModal: document.getElementById('customDialogModal'),
    customDialogMessage: document.getElementById('customDialogMessage'),
    customDialogConfirmBtn: document.getElementById('customDialogConfirmBtn'),
    customDialogCancelBtn: document.getElementById('customDialogCancelBtn'),

    allSharesBtn: document.getElementById('allSharesBtn'),
    favouriteSharesBtn: document.getElementById('favouriteSharesBtn'),
    positiveSharesBtn: document.getElementById('positiveSharesBtn'),
    negativeSharesBtn: document.getElementById('negativeSharesBtn'),
    neutralSharesBtn: document.getElementById('neutralSharesBtn'),
    sortOrderDropdown: document.getElementById('sortOrderDropdown'),
    groupingDropdown: document.getElementById('groupingDropdown'),
    watchlistControls: document.getElementById('watchlistControls'),

    scrollToTopBtn: document.getElementById('scrollToTopBtn'),

    themeToggleBtn: document.getElementById('themeToggleBtn')
};

let currentShareDocId = null; // Stores the ID of the share being edited/viewed
let currentUserId = null; // Stores the current logged-in user's ID
let currentShareSubscription = null; // Holds the Firestore real-time listener
let sharesCache = []; // Cache for shares data for filtering/sorting
let currentFilter = 'all'; // Default filter for watchlist
let currentSort = 'none'; // Default sort order
let currentGrouping = 'none'; // Default grouping
let currentThemeIndex = 0; // Index for current theme
const themes = ['light-theme', 'dark-theme', 'orange-theme', 'green-theme', 'blue-grey-theme', 'purple-theme', 'teal-theme', 'red-theme', 'yellow-theme', 'pink-theme', 'indigo-theme'];


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
        ui.customDialogCancelBtn.classList.toggle('hidden', !showCancel); // Use toggle for hidden class
        ui.customDialogConfirmBtn.textContent = showCancel ? 'Confirm' : 'OK'; // Set button text
        ui.customDialogModal.classList.add('is-active'); // Use class to show
        document.body.classList.add('modal-open');

        const confirmHandler = () => {
            ui.customDialogModal.classList.remove('is-active'); // Use class to hide
            document.body.classList.remove('modal-open');
            ui.customDialogConfirmBtn.removeEventListener('click', confirmHandler);
            ui.customDialogCancelBtn.removeEventListener('click', cancelHandler);
            resolve(true);
        };

        const cancelHandler = () => {
            ui.customDialogModal.classList.remove('is-active'); // Use class to hide
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
 * Calculates gain/loss and percentage.
 * @param {number} enteredPrice - The price at which the share was entered.
 * @param {number} currentPrice - The current price of the share.
 * @returns {{value: number, percentage: number}} - Object with absolute value and percentage gain/loss.
 */
function calculateGainLoss(enteredPrice, currentPrice) {
    const value = currentPrice - enteredPrice;
    const percentage = (enteredPrice !== 0) ? (value / enteredPrice) * 100 : 0;
    return { value, percentage };
}

// --- Firebase Auth & Firestore Integration ---
async function initFirebaseAuth() {
    const { onAuthStateChanged, GoogleAuthProviderInstance, signInWithPopup, signOut } = window.authFunctions;
    const { firestoreDb, firestore } = window; // Destructure firestore from window.firestore

    if (!firestoreDb) {
        console.error("Firebase Firestore is not initialized.");
        showCustomDialog("Error: Firebase not initialized. Please check your console.", false);
        return;
    }

    onAuthStateChanged(window.firebaseAuth, async (user) => {
        if (user) {
            currentUserId = user.uid;
            ui.sidebarUserName.textContent = user.displayName || "User";
            ui.sidebarUserEmail.textContent = user.email || "";
            ui.mainTitle.textContent = `${user.displayName ? user.displayName.split(' ')[0] + "'s" : "My"} Watchlist`;
            ui.googleAuthBtn.textContent = 'Sign Out'; // Update button text
            ui.googleAuthBtn.classList.add('signed-in'); // Add class for styling
            ui.signOutBtn.classList.remove('hidden'); // Show sign out in sidebar
            ui.deleteAccountBtn.classList.remove('hidden'); // Show delete account in sidebar
            ui.authSection.classList.add('hidden'); // Hide auth section
            ui.shareListSection.classList.remove('hidden'); // Show share list
            ui.watchlistControls.classList.remove('hidden'); // Show watchlist controls
            hideLoadingSpinner();
            subscribeToShares(currentUserId);
            loadThemePreference(); // Load theme preference on login
        } else {
            currentUserId = null;
            ui.sidebarUserName.textContent = "Guest";
            ui.sidebarUserEmail.textContent = "";
            ui.mainTitle.textContent = "Share Watchlist";
            ui.googleAuthBtn.textContent = 'Sign In with Google'; // Update button text
            ui.googleAuthBtn.classList.remove('signed-in'); // Remove class for styling
            ui.signOutBtn.classList.add('hidden'); // Hide sign out in sidebar
            ui.deleteAccountBtn.classList.add('hidden'); // Hide delete account in sidebar
            ui.authSection.classList.remove('hidden'); // Show auth section
            ui.shareListSection.classList.add('hidden'); // Hide share list
            ui.watchlistControls.classList.add('hidden'); // Hide watchlist controls
            hideLoadingSpinner();
            if (currentShareSubscription) {
                currentShareSubscription(); // Unsubscribe from old listener
                currentShareSubscription = null;
            }
            sharesCache = []; // Clear shares
            ui.shareTableBody.innerHTML = ''; // Clear shares
            ui.mobileShareCards.innerHTML = ''; // Clear mobile cards
            ui.noSharesMessage.classList.add('hidden'); // Hide "no shares" message
            closeAllModals(); // Close any open modals on sign out
            document.body.classList.remove(...themes); // Remove all theme classes
            document.body.classList.add('light-theme'); // Default to light theme
            localStorage.removeItem('theme'); // Clear stored theme
        }
    });

    ui.googleAuthBtn.addEventListener('click', async () => {
        try {
            showLoadingSpinner();
            await signInWithPopup(window.firebaseAuth, GoogleAuthProviderInstance);
            // User will be redirected or onAuthStateChanged will handle state
        } catch (error) {
            console.error("Google Auth Error:", error);
            ui.authError.textContent = `Authentication failed: ${error.message}`;
            hideLoadingSpinner();
            ui.authSection.classList.remove('hidden'); // Ensure auth section is visible on error
        }
    });

    ui.signOutBtn.addEventListener('click', async () => {
        try {
            await signOut(window.firebaseAuth);
            showCustomDialog("Signed out successfully!", false);
        } catch (error) {
            console.error("Sign Out Error:", error);
            showCustomDialog(`Sign out failed: ${error.message}`, false);
        }
    });

    ui.deleteAccountBtn.addEventListener('click', async () => {
        const confirmDelete = await showCustomDialog("Are you sure you want to delete your account and all your data? This cannot be undone.", true);
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

                showCustomDialog("Account and all data deleted successfully.", false);
                // onAuthStateChanged will handle UI update
            } catch (error) {
                console.error("Error deleting account:", error);
                // Handle specific errors like auth/requires-recent-login
                if (error.code === 'auth/requires-recent-login') {
                    showCustomDialog("Please sign in again to delete your account.", false);
                    // Force sign out to prompt re-authentication
                    await signOut(window.firebaseAuth);
                } else {
                    showCustomDialog(`Error deleting account: ${error.message}`, false);
                }
                hideLoadingSpinner();
                ui.shareListSection.classList.remove('hidden'); // Remain on share list if deletion failed
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
        showCustomDialog("Error fetching shares. Please try again later.", false);
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
            showCustomDialog("Share updated successfully!", false);
        } else {
            // Add new share
            await firestore.addDoc(sharesCollectionRef, shareData);
            showCustomDialog("Share added successfully!", false);
        }
        closeModal(ui.shareFormModal); // Use closeModal with the specific modal
        ui.shareForm.reset(); // Clear form
        resetCommentSections(); // Reset comment sections after saving
        // The onSnapshot listener will automatically re-render the list
    } catch (error) {
        console.error("Error adding/updating share:", error);
        showCustomDialog(`Error saving share: ${error.message}`, false);
    } finally {
        hideLoadingSpinner();
    }
}

async function deleteShare(shareId) {
    const confirmDelete = await showCustomDialog("Are you sure you want to delete this share?", true);
    if (confirmDelete) {
        showLoadingSpinner();
        const { firestoreDb, firestore } = window;
        const sharesCollectionRef = firestore.collection(firestoreDb, `users/${currentUserId}/shares`);
        try {
            await firestore.deleteDoc(firestore.doc(sharesCollectionRef, shareId));
            showCustomDialog("Share deleted successfully!", false);
            closeAllModals(); // Close all modals after deletion
            // onSnapshot listener will update UI
        } catch (error) {
            console.error("Error deleting share:", error);
            showCustomDialog(`Error deleting share: ${error.message}`, false);
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
        showCustomDialog("Error updating favourite status.", false);
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


    ui.shareTableBody.innerHTML = '';
    ui.mobileShareCards.innerHTML = '';

    if (sharesToRender.length === 0) {
        ui.noSharesMessage.classList.remove('hidden');
    } else {
        ui.noSharesMessage.classList.add('hidden');
        for (const groupName in groupedShares) {
            // Add group header for tables (desktop)
            if (currentGrouping !== 'none') {
                const groupHeaderRow = ui.shareTableBody.insertRow();
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
                ui.mobileShareCards.appendChild(groupHeaderCard);
            }

            groupedShares[groupName].forEach(share => {
                const gainLoss = calculateGainLoss(share.enteredPrice, share.currentPrice);
                const gainLossClass = gainLoss.percentage > 0 ? 'positive' : gainLoss.percentage < 0 ? 'negative' : 'neutral';
                const favouriteIconClass = share.isFavourite ? 'fas' : 'far'; // fas for solid, far for regular

                // For Desktop Table
                const row = ui.shareTableBody.insertRow();
                row.dataset.docId = share.id; // Store Firestore document ID
                row.innerHTML = `
                    <td><i class="${favouriteIconClass} fa-star favourite-icon" data-id="${share.id}" data-favourite="${share.isFavourite}"></i></td>
                    <td><button class="asx-code-btn" data-id="${share.id}">${share.asxCode}</button></td>
                    <td>${share.companyName}</td>
                    <td>${formatCurrency(share.enteredPrice)}</td>
                    <td>${formatCurrency(share.currentPrice)}</td>
                    <td class="${gainLossClass}">${gainLoss.percentage.toFixed(2)}% (${formatCurrency(gainLoss.value)})</td>
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
                        <p>Entered Price: <span>${formatCurrency(share.enteredPrice)}</span></p>
                        <p>Current Price: <span>${formatCurrency(share.currentPrice)}</span></p>
                        <p>Gain/Loss: <span class="${gainLossClass}">${gainLoss.percentage.toFixed(2)}% (${formatCurrency(gainLoss.value)})</span></p>
                        <p>Dividend Yield: <span>${share.dividendYield ? share.dividendYield.toFixed(2) + '%' : 'N/A'}</span></p>
                        <p class="card-notes">${share.comments && share.comments.length > 0 ? `<i class="fas fa-comment-dots" title="${share.comments.map(c => `${c.title}: ${c.text}`).join('\n')}"></i> Notes present` : 'No Notes'}</p>
                    </div>
                    <div class="card-actions">
                        <button class="view-details-btn" data-id="${share.id}">View Details</button>
                        <button class="edit-share-btn" data-id="${share.id}">Edit</button>
                        <button class="delete-share-btn" data-id="${share.id}">Delete</button>
                    </div>
                `;
                ui.mobileShareCards.appendChild(card);
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


// --- Share Form Modal Functions ---
function showShareForm(shareId = null) {
    currentShareDocId = shareId;
    ui.shareForm.reset(); // Clear previous form data
    resetCommentSections(); // Start with one empty comment section

    if (shareId) {
        ui.shareFormTitle.textContent = "Edit Share";
        ui.saveShareBtn.textContent = "Update Share";
        ui.deleteShareFormBtn.classList.remove('hidden');
        const share = sharesCache.find(s => s.id === shareId);
        if (share) {
            ui.asxCodeInput.value = share.asxCode;
            ui.companyNameInput.value = share.companyName;
            ui.enteredPriceInput.value = share.enteredPrice;
            ui.currentPriceInput.value = share.currentPrice;
            ui.dividendYieldInput.value = share.dividendYield || '';
            ui.isFavouriteInput.checked = share.isFavourite || false;

            // Populate dynamic comments
            if (share.comments && share.comments.length > 0) {
                ui.commentsFormContainer.innerHTML = ''; // Clear initial one
                share.comments.forEach((comment) => {
                    addCommentSection(comment.title, comment.text);
                });
            } else {
                resetCommentSections(); // Ensure at least one empty comment section is present
            }

        } else {
            showCustomDialog("Share not found!", false);
            closeModal(ui.shareFormModal); // Close the modal if share not found
            return;
        }
    } else {
        ui.shareFormTitle.textContent = "Add New Share";
        ui.saveShareBtn.textContent = "Save Share";
        ui.deleteShareFormBtn.classList.add('hidden');
    }
    ui.shareFormModal.classList.add('is-active'); // Use class to show
    ui.asxCodeInput.focus(); // Focus on the first input
}

function addCommentSection(title = '', text = '') {
    const commentSectionDiv = document.createElement('div');
    commentSectionDiv.classList.add('comment-section');
    commentSectionDiv.innerHTML = `
        <label>Comment Title:</label>
        <input type="text" class="comment-title" placeholder="e.g., Investment Thesis" value="${title}">
        <label>Comment:</label>
        <textarea class="comment-text" rows="3" placeholder="e.g., Strong fundamentals, long-term hold.">${text}</textarea>
        <button type="button" class="comment-delete-btn"><i class="fas fa-times"></i></button>
    `;
    ui.commentsFormContainer.appendChild(commentSectionDiv);

    // Add event listener for the new delete button
    commentSectionDiv.querySelector('.comment-delete-btn').addEventListener('click', function() {
        commentSectionDiv.remove();
    });
}

function resetCommentSections() {
    ui.commentsFormContainer.innerHTML = ''; // Clear all existing comment sections
    addCommentSection(); // Add one empty comment section by default
}

function showShareDetails(shareId) {
    const share = sharesCache.find(s => s.id === shareId);
    if (!share) {
        showCustomDialog("Share details not found.", false);
        return;
    }

    ui.modalShareName.textContent = share.companyName;
    ui.modalAsxCode.textContent = share.asxCode;
    ui.modalEnteredPrice.textContent = formatCurrency(share.enteredPrice);
    ui.modalCurrentPrice.textContent = formatCurrency(share.currentPrice);

    const gainLoss = calculateGainLoss(share.enteredPrice, share.currentPrice);
    ui.modalGainLoss.textContent = `${gainLoss.percentage.toFixed(2)}% (${formatCurrency(gainLoss.value)})`;
    ui.modalGainLoss.className = ''; // Clear previous classes
    ui.modalGainLoss.classList.add(gainLoss.percentage > 0 ? 'positive' : gainLoss.percentage < 0 ? 'negative' : 'neutral');

    ui.modalDividendYield.textContent = share.dividendYield ? share.dividendYield.toFixed(2) + '%' : 'N/A';

    // Populate comments in detail modal
    ui.modalCommentsContainer.innerHTML = '<h3>Comments</h3>'; // Clear previous comments
    if (share.comments && share.comments.length > 0) {
        share.comments.forEach(comment => {
            const commentElement = document.createElement('div');
            commentElement.classList.add('modal-comment-item');
            commentElement.innerHTML = `<strong>${comment.title}</strong><p>${comment.text}</p>`;
            ui.modalCommentsContainer.appendChild(commentElement);
        });
    } else {
        ui.modalCommentsContainer.innerHTML += '<p>No comments for this share.</p>';
    }

    currentShareDocId = shareId; // Set for edit/delete from details modal
    ui.shareDetailModal.classList.add('is-active'); // Use class to show
}

// --- Calculator Functions ---

function calculateAndDisplayResults() {
    const sharesOwned = parseFloat(ui.calcSharesOwned.value) || 0;
    const purchasePrice = parseFloat(ui.calcPurchasePrice.value) || 0;
    const currentPrice = parseFloat(ui.calcCurrentPrice.value) || 0;
    const dividendYield = parseFloat(ui.calcDividendYield.value) || 0;
    const brokerageBuy = parseFloat(ui.calcBrokerageBuy.value) || 0;
    const brokerageSell = parseFloat(ui.calcBrokerageSell.value) || 0;

    const totalPurchaseCost = (sharesOwned * purchasePrice) + brokerageBuy;
    const currentValue = (sharesOwned * currentPrice) - brokerageSell;
    const grossGainLoss = currentValue - (sharesOwned * purchasePrice);
    const netGainLoss = currentValue - totalPurchaseCost;
    const percentageGainLoss = (totalPurchaseCost !== 0) ? (netGainLoss / totalPurchaseCost) * 100 : 0;
    const annualDividends = (sharesOwned * currentPrice * (dividendYield / 100));

    ui.resultPurchaseCost.textContent = formatCurrency(totalPurchaseCost);
    ui.resultCurrentValue.textContent = formatCurrency(currentValue);
    ui.resultGrossGainLoss.textContent = formatCurrency(grossGainLoss);
    ui.resultNetGainLoss.textContent = formatCurrency(netGainLoss);
    ui.resultPercentageGainLoss.textContent = `${percentageGainLoss.toFixed(2)}%`;
    ui.resultAnnualDividends.textContent = formatCurrency(annualDividends);

    // Apply color to gain/loss
    ui.resultGrossGainLoss.className = '';
    ui.resultNetGainLoss.className = '';
    ui.resultPercentageGainLoss.className = '';

    if (grossGainLoss > 0) ui.resultGrossGainLoss.classList.add('positive');
    else if (grossGainLoss < 0) ui.resultGrossGainLoss.classList.add('negative');
    else ui.resultGrossGainLoss.classList.add('neutral');

    if (netGainLoss > 0) {
        ui.resultNetGainLoss.classList.add('positive');
        ui.resultPercentageGainLoss.classList.add('positive');
    } else if (netGainLoss < 0) {
        ui.resultNetGainLoss.classList.add('negative');
        ui.resultPercentageGainLoss.classList.add('negative');
    } else {
        ui.resultNetGainLoss.classList.add('neutral');
        ui.resultPercentageGainLoss.classList.add('neutral');
    }

    ui.calculatorResults.classList.remove('hidden');
}

function resetCalculator() {
    ui.calculatorForm.reset();
    ui.calculatorResults.classList.add('hidden');
}

// --- Theme Toggling ---
function loadThemePreference() {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme && themes.includes(savedTheme)) {
        document.body.className = savedTheme;
        currentThemeIndex = themes.indexOf(savedTheme);
        console.log(`[Theme] Loaded preference: ${savedTheme}`);
    } else {
        document.body.className = 'light-theme'; // Default
        currentThemeIndex = themes.indexOf('light-theme');
        console.log("[Theme] No theme preference found or invalid, defaulting to light-theme.");
    }
}

function toggleTheme() {
    currentThemeIndex = (currentThemeIndex + 1) % themes.length;
    const newTheme = themes[currentThemeIndex];
    document.body.className = newTheme;
    localStorage.setItem('theme', newTheme);
    showCustomDialog(`Theme changed to: ${newTheme.replace('-', ' ').replace('theme', '')}`, false);
}

// --- Modal Management ---
function closeModal(modalElement) {
    modalElement.classList.remove('is-active'); // Use class to hide
    document.body.classList.remove('modal-open'); // Remove body overflow hidden
}

function closeAllModals() {
    document.querySelectorAll('.modal').forEach(modal => {
        modal.classList.remove('is-active');
    });
    document.body.classList.remove('modal-open');
}

// --- Event Listeners ---

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js (v124) DOMContentLoaded fired."); // New log to confirm script version and DOM ready

    // Initialize Firebase Auth and setup listener
    initFirebaseAuth();

    // Ensure all modals are closed on initial load to prevent blocking UI
    closeAllModals();

    // --- Header Buttons ---
    ui.hamburgerBtn.addEventListener('click', () => {
        ui.appSidebar.classList.add('open');
        ui.sidebarOverlay.classList.add('open');
        document.body.classList.add('sidebar-active'); // Prevent scrolling
    });

    ui.addShareHeaderBtn.addEventListener('click', () => showShareForm());

    // --- Sidebar Buttons ---
    ui.closeSidebarBtn.addEventListener('click', () => {
        ui.appSidebar.classList.remove('open');
        ui.sidebarOverlay.classList.remove('open');
        document.body.classList.remove('sidebar-active');
    });

    ui.sidebarOverlay.addEventListener('click', () => {
        ui.appSidebar.classList.remove('open');
        ui.sidebarOverlay.classList.remove('open');
        document.body.classList.remove('sidebar-active');
    });

    // Close menu when certain menu buttons are clicked
    document.querySelectorAll('.menu-button-item').forEach(button => {
        if (button.dataset.actionClosesMenu === 'true') {
            button.addEventListener('click', () => {
                ui.appSidebar.classList.remove('open');
                ui.sidebarOverlay.classList.remove('open');
                document.body.classList.remove('sidebar-active');
            });
        }
    });

    ui.addShareSidebarBtn.addEventListener('click', () => showShareForm());
    ui.calculatorSidebarBtn.addEventListener('click', () => {
        resetCalculator(); // Reset calculator state
        ui.calculatorModal.classList.add('is-active'); // Use class to show
    });
    ui.themeToggleBtn.addEventListener('click', toggleTheme);

    // --- Watchlist Filter Buttons ---
    ui.allSharesBtn.addEventListener('click', () => {
        currentFilter = 'all';
        updateShareListUI();
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        ui.allSharesBtn.classList.add('active');
    });
    ui.favouriteSharesBtn.addEventListener('click', () => {
        currentFilter = 'favourite';
        updateShareListUI();
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        ui.favouriteSharesBtn.classList.add('active');
    });
    ui.positiveSharesBtn.addEventListener('click', () => {
        currentFilter = 'positive';
        updateShareListUI();
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        ui.positiveSharesBtn.classList.add('active');
    });
    ui.negativeSharesBtn.addEventListener('click', () => {
        currentFilter = 'negative';
        updateShareListUI();
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        ui.negativeSharesBtn.classList.add('active');
    });
    ui.neutralSharesBtn.addEventListener('click', () => {
        currentFilter = 'neutral';
        updateShareListUI();
        document.querySelectorAll('.watchlist-filter-btn').forEach(btn => btn.classList.remove('active'));
        ui.neutralSharesBtn.classList.add('active');
    });

    // --- Sort and Grouping Dropdowns ---
    ui.sortOrderDropdown.addEventListener('change', (e) => {
        currentSort = e.target.value;
        updateShareListUI();
    });

    ui.groupingDropdown.addEventListener('change', (e) => {
        currentGrouping = e.target.value;
        updateShareListUI();
    });

    // --- Main Add Share Button ---
    ui.addShareMainBtn.addEventListener('click', () => showShareForm());

    // --- Share Form Modal Events ---
    document.querySelectorAll('.close-button[data-modal]').forEach(button => {
        button.addEventListener('click', (e) => {
            const modalId = e.currentTarget.dataset.modal;
            closeModal(document.getElementById(modalId));
        });
    });

    ui.shareForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const shareData = {
            id: currentShareDocId, // Will be null for new shares
            asxCode: ui.asxCodeInput.value.toUpperCase(),
            companyName: ui.companyNameInput.value,
            enteredPrice: parseFloat(ui.enteredPriceInput.value),
            currentPrice: parseFloat(ui.currentPriceInput.value),
            dividendYield: parseFloat(ui.dividendYieldInput.value) || 0,
            isFavourite: ui.isFavouriteInput.checked,
            comments: Array.from(document.querySelectorAll('#commentsFormContainer .comment-section')).map(section => ({
                title: section.querySelector('.comment-title').value.trim(),
                text: section.querySelector('.comment-text').value.trim()
            }))
        };
        await addOrUpdateShare(shareData);
    });

    ui.saveShareBtn.addEventListener('click', (e) => {
        e.preventDefault(); // Prevent default form submission
        ui.shareForm.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true })); // Manually trigger form submission
    });

    ui.deleteShareFormBtn.addEventListener('click', () => {
        if (currentShareDocId) {
            deleteShare(currentShareDocId);
        } else {
            showCustomDialog("No share selected to delete.", false);
        }
    });

    ui.addCommentBtn.addEventListener('click', () => addCommentSection());

    // --- Calculator Modal Events ---
    ui.calculateBtn.addEventListener('click', calculateAndDisplayResults);

    // --- Scroll to Top Button ---
    window.addEventListener('scroll', () => {
        if (window.scrollY > 200) { // Show button after scrolling 200px
            ui.scrollToTopBtn.classList.remove('hidden');
        } else {
            ui.scrollToTopBtn.classList.add('hidden');
        }
    });

    ui.scrollToTopBtn.addEventListener('click', () => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });

    // --- Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            // Updated path to include repository name for GitHub Pages
            navigator.serviceWorker.register('/ASX-Share-Tracker/service-worker.js?v=35')
                .then(registration => {
                    console.log('ServiceWorker registration successful with scope: ', registration.scope);
                })
                .catch(err => {
                    console.log('ServiceWorker registration failed: ', err);
                });
        });
    }
});
