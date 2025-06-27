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
            console.erro