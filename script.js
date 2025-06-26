// File Version: v88 (FIXED - Robust Auth Button Handling)
// Last Updated: 2025-06-26 (Added null checks for auth buttons in toggleSidebarAuthElements)

// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js (v88) DOMContentLoaded fired."); // New log to confirm script version and DOM ready

    // --- Global Variables (Re-declared for clarity within this scope if needed, but Firebase vars are on window) ---
    let selectedShareDocId = null;
    let allSharesData = []; // Stores all shares fetched from Firestore for the current watchlist
    let userWatchlists = []; // Stores all watchlists for the current user
    let currentWatchlistId = null; // The ID of the currently active watchlist
    let currentWatchlistName = null; // The name of the currently active watchlist
    let autoDismissTimeout = null; // For custom alerts
    let longPressTimer = null; // For mobile long press
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    let lastTapTime = 0;
    let selectedElementForTap = null;
    let tapTimeout = null;

    const LONG_PRESS_THRESHOLD = 500; // ms
    const TOUCH_MOVE_THRESHOLD = 10; // pixels

    const DEFAULT_WATCHLIST_NAME = "My First Watchlist";
    const DEFAULT_WATCHLIST_ID = "default"; // Placeholder for initial state, will be replaced by Firestore ID

    let currentLoggedInUser = null; // Stores the Firebase User object

    // UI Element References
    const shareFormSection = document.getElementById('shareFormSection');
    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsFormContainer = document.getElementById('commentsFormContainer');
    const addCommentBtn = document.getElementById('addCommentBtn');
    const saveShareBtn = document.getElementById('saveShareBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const deleteShareFromFormBtn = document.getElementById('deleteShareFromFormBtn');
    const formTitle = document.getElementById('formTitle');
    const formInputs = [shareNameInput, currentPriceInput, targetPriceInput, dividendAmountInput, frankingCreditsInput];

    const shareTableBody = document.querySelector('#shareTable tbody');
    const mobileShareCardsContainer = document.getElementById('mobileShareCards');

    const newShareBtn = document.getElementById('newShareBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const editShareBtn = document.getElementById('editShareBtn');
    const standardCalcBtn = document.getElementById('standardCalcBtn');
    const dividendCalcBtn = document.getElementById('dividendCalcBtn');

    // These are the elements causing the current error if not found
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const signOutBtn = document.getElementById('signOutBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPriceDetailed = document.getElementById('modalCurrentPriceDetailed');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalUnfrankedYieldSpan = document.getElementById('modalUnfrankedYield');
    const modalFrankedYieldSpan = document.getElementById('modalFrankedYield');
    const modalCommentsContainer = document.getElementById('modalCommentsContainer');
    const closeModalButtons = document.querySelectorAll('.close-modal');

    const calculatorModal = document.getElementById('calculatorModal');
    const calcInputA = document.getElementById('calcInputA');
    const calcInputB = document.getElementById('calcInputB');
    const calcResult = document.getElementById('calcResult');
    const calcTypeDisplay = document.getElementById('calcTypeDisplay');
    const calcInstruction = document.getElementById('calcInstruction');
    const standardCalcBtnInModal = document.getElementById('standardCalcBtnInModal');
    const dividendCalcBtnInModal = document.getElementById('dividendCalcBtnInModal');

    const customDialogModal = document.getElementById('customDialogModal');
    const customDialogMessage = document.getElementById('customDialogMessage');
    const customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    const customDialogCancelBtn = document.getElementById('customDialogCancelBtn');
    let currentDialogCallback = null; // For confirm dialogs

    const themeToggle = document.getElementById('themeToggle');
    const applyThemeBtn = document.getElementById('applyThemeBtn');

    const watchlistSelect = document.getElementById('watchlistSelect');
    const newWatchlistBtn = document.getElementById('newWatchlistBtn');
    const renameWatchlistBtn = document.getElementById('renameWatchlistBtn');
    const deleteWatchlistBtn = document.getElementById('deleteWatchlistBtn');
    const importWatchlistBtn = document.getElementById('importWatchlistBtn');
    const exportWatchlistBtn = document.getElementById('exportWatchlistBtn');
    const addShareToCurrentWatchlistBtn = document.getElementById('addShareToCurrentWatchlistBtn');

    const appSidebar = document.getElementById('appSidebar');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const sidebarOverlay = document.getElementById('sidebarOverlay');

    const sortSelect = document.getElementById('sortSelect');

    const asxCodeButtonsContainer = document.getElementById('asxCodeButtonsContainer'); // New container for ASX code buttons

    const scrollToTopBtn = document.getElementById('scrollToTopBtn');


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
    function showCustomAlert(message, duration = 1000) {
        if (!customDialogModal || !customDialogMessage || !customDialogConfirmBtn || !customDialogCancelBtn) {
            console.error("Custom dialog elements not found. Cannot show alert.");
            console.log("ALERT (fallback):", message);
            return;
        }
        customDialogMessage.textContent = message;
        customDialogConfirmBtn.style.display = 'none';
        customDialogCancelBtn.style.display = 'none';
        showModal(customDialogModal);
        if (autoDismissTimeout) { clearTimeout(autoDismissTimeout); }
        autoDismissTimeout = setTimeout(() => { hideModal(customDialogModal); autoDismissTimeout = null; }, duration);
    }

    // New version of prompt for rename/delete confirm to allow input (now for general use)
    function showCustomConfirm(message, onConfirm, onCancel = null) {
        if (!customDialogModal || !customDialogMessage || !customDialogConfirmBtn || !customDialogCancelBtn) {
            console.error("Custom dialog elements not found. Cannot show confirm.");
            const confirmed = window.confirm(message);
            if (confirmed && onConfirm) onConfirm();
            else if (!confirmed && onCancel) onCancel();
            return;
        }
        customDialogMessage.textContent = message;
        customDialogConfirmBtn.textContent = 'Yes';
        customDialogConfirmBtn.style.display = 'block';
        customDialogCancelBtn.textContent = 'No';
        customDialogCancelBtn.style.display = 'block';
        showModal(customDialogModal);
        if (autoDismissTimeout) { clearTimeout(autoDismissTimeout); }
        customDialogConfirmBtn.onclick = () => { hideModal(customDialogModal); if (onConfirm) onConfirm(); currentDialogCallback = null; };
        customDialogCancelBtn.onclick = () => { hideModal(customDialogModal); if (onCancel) onCancel(); currentDialogCallback = null; };
        currentDialogCallback = () => { hideModal(customDialogModal); if (onCancel) onCancel(); currentDialogCallback = null; };
    }


    // Date Formatting Helper Functions (Australian Style)
    function formatDate(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-AU', { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    function formatDateTime(dateString) {
        if (!dateString) return '';
        const date = new Date(dateString);
        if (isNaN(date.getTime())) return '';
        return date.toLocaleDateString('en-AU', {
            day: '2-digit', month: '2-digit', year: 'numeric',
            hour: '2-digit', minute: '2-digit', hour12: false
        });
    }

    // UI State Management Functions
    function updateAuthButtonText(isSignedIn, userName = 'Sign In') {
        if (googleAuthBtn) {
            googleAuthBtn.textContent = isSignedIn ? (userName || 'Signed In') : 'Sign In';
        }
    }

    function toggleSidebarAuthElements(isSignedIn) {
        // ADDED NULL CHECKS FOR ROBUSTNESS
        if (googleAuthBtn) {
            if (isSignedIn) {
                googleAuthBtn.style.display = 'none';
            } else {
                googleAuthBtn.style.display = 'block';
            }
        } else {
            console.warn("[UI] googleAuthBtn not found in DOM when trying to toggle visibility.");
        }

        if (signOutBtn) {
            if (isSignedIn) {
                signOutBtn.style.display = 'block';
            } else {
                signOutBtn.style.display = 'none';
            }
        } else {
            console.warn("[UI] signOutBtn not found in DOM when trying to toggle visibility.");
        }
    }

    function updateMainButtonsState(enable) {
        // These buttons are now primarily controlled by the unified sidebar.
        // Their disabled state should still reflect auth status.
        // We now reference the unified buttons directly.
        if (newShareBtn) newShareBtn.disabled = !enable;
        if (standardCalcBtn) standardCalcBtn.disabled = !enable;
        if (dividendCalcBtn) dividendCalcBtn.disabled = !enable;
        if (watchlistSelect) watchlistSelect.disabled = !enable;
        // viewDetailsBtn disabled state is managed by selectShare function, not here directly
    }

    function showModal(modalElement) {
        if (modalElement) {
            modalElement.style.setProperty('display', 'flex', 'important');
            modalElement.scrollTop = 0;
        }
    }

    function hideModal(modalElement) {
        if (modalElement) {
            modalElement.style.setProperty('display', 'none', 'important');
        }
    }

    // Watchlist UI clearing
    function clearWatchlistUI() {
        if (watchlistSelect) watchlistSelect.innerHTML = '';
        userWatchlists = [];
        if (watchlistSelect) watchlistSelect.disabled = true;
        renderWatchlistSelect(); // Re-render to show placeholder and disabled state
        renderSortSelect(); // Re-render to ensure sort is also reset
        console.log("[UI] Watchlist UI cleared.");
    }

    // Share List UI clearing
    function clearShareListUI() {
        if (shareTableBody) shareTableBody.innerHTML = '';
        if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
        console.log("[UI] Share list UI cleared.");
    }

    // Full share list clearing (UI + buttons + selection)
    function clearShareList() {
        clearShareListUI();
        if (asxCodeButtonsContainer) asxCodeButtonsContainer.innerHTML = '';
        deselectCurrentShare();
        console.log("[UI] Full share list cleared (UI + buttons).");
    }

    // Deselect currently highlighted share
    function deselectCurrentShare() {
        const currentlySelected = document.querySelectorAll('.share-list-section tr.selected, .mobile-card.selected');
        console.log(`[Selection] Attempting to deselect ${currentlySelected.length} elements.`);
        currentlySelected.forEach(el => {
            el.classList.remove('selected');
        });
        selectedShareDocId = null;
        if (viewDetailsBtn) {
            viewDetailsBtn.disabled = true; // Disable view details button if no share is selected
        }
        console.log("[Selection] Share deselected. selectedShareDocId is now null.");
    }

    // Function to truncate text
    function truncateText(text, maxLength) {
        if (typeof text !== 'string' || text.length <= maxLength) {
            return text;
        }
        return text.substring(0, maxLength) + '...';
    }

    // Function to add a comment section to the form
    function addCommentSection(title = '', text = '') {
        const commentSectionDiv = document.createElement('div');
        commentSectionDiv.className = 'comment-section';
        commentSectionDiv.innerHTML = `
            <div class="comment-section-header">
                <input type="text" class="comment-title-input" placeholder="Comment Title" value="${title}">
                <button type="button" class="comment-delete-btn">&times;</button>
            </div>
            <textarea class="comment-text-input" placeholder="Your comments here...">${text}</textarea>
        `;
        commentsFormContainer.appendChild(commentSectionDiv);
        commentSectionDiv.querySelector('.comment-delete-btn').addEventListener('click', (event) => {
            event.target.closest('.comment-section').remove();
        });
    }

    // Function to clear the form fields
    function clearForm() {
        formInputs.forEach(input => {
            if (input) { input.value = ''; }
        });
        commentsFormContainer.innerHTML = '';
        addCommentSection(); // Add one empty comment section by default
        selectedShareDocId = null;
        console.log("[Form] Form fields cleared and selectedShareDocId reset.");
    }

    // Function to show the edit form with selected share's data
    function showEditFormForSelectedShare() {
        if (!selectedShareDocId) {
            showCustomAlert("Please select a share to edit.");
            return;
        }
        const shareToEdit = allSharesData.find(share => share.id === selectedShareDocId);
        if (!shareToEdit) {
            showCustomAlert("Selected share not found.");
            return;
        }
        formTitle.textContent = 'Edit Share';
        shareNameInput.value = shareToEdit.shareName || '';
        currentPriceInput.value = shareToEdit.currentPrice !== null ? shareToEdit.currentPrice.toFixed(2) : '';
        targetPriceInput.value = shareToEdit.targetPrice !== null ? shareToEdit.targetPrice.toFixed(2) : '';
        dividendAmountInput.value = shareToEdit.dividendAmount !== null ? shareToEdit.dividendAmount.toFixed(3) : '';
        frankingCreditsInput.value = shareToEdit.frankingCredits !== null ? shareToEdit.frankingCredits.toFixed(1) : '';
        commentsFormContainer.innerHTML = '';
        if (shareToEdit.comments && Array.isArray(shareToEdit.comments)) {
            shareToEdit.comments.forEach(comment => addCommentSection(comment.title, comment.text));
        }
        if (shareToEdit.comments === undefined || shareToEdit.comments.length === 0) {
            addCommentSection();
        }
        deleteShareFromFormBtn.style.display = 'inline-flex';
        showModal(shareFormSection);
        shareNameInput.focus();
        console.log(`[Form] Opened edit form for share: ${shareToEdit.shareName} (ID: ${selectedShareDocId})`);
    }

    // Function to show share details in the modal
    function showShareDetails() {
        if (!selectedShareDocId) {
            showCustomAlert("Please select a share to view details.");
            return;
        }
        const share = allSharesData.find(s => s.id === selectedShareDocId);
        if (!share) {
            showCustomAlert("Share details not found.");
            return;
        }
        modalShareName.textContent = share.shareName || 'N/A';
        modalEntryDate.textContent = formatDate(share.entryDate) || 'N/A';
        modalCurrentPriceDetailed.textContent = share.lastFetchedPrice !== null && !isNaN(share.lastFetchedPrice)
                                                ? `$${share.lastFetchedPrice.toFixed(2)} (${formatDateTime(share.lastPriceUpdateTime)})`
                                                : 'N/A';
        modalTargetPrice.textContent = share.targetPrice !== null && !isNaN(share.targetPrice) ? `$${share.targetPrice.toFixed(2)}` : 'N/A';
        modalDividendAmount.textContent = share.dividendAmount !== null && !isNaN(share.dividendAmount) ? `$${share.dividendAmount.toFixed(3)}` : 'N/A';
        modalFrankingCredits.textContent = share.frankingCredits !== null && !isNaN(share.frankingCredits) ? `${share.frankingCredits.toFixed(1)}%` : 'N/A';
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        modalUnfrankedYieldSpan.textContent = unfrankedYield !== null ? `${unfrankedYield.toFixed(2)}%` : 'N/A';
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);
        modalFrankedYieldSpan.textContent = frankedYield !== null ? `${frankedYield.toFixed(2)}%` : 'N/A';
        modalCommentsContainer.innerHTML = '';
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0) {
            share.comments.forEach(comment => {
                if (comment.title || comment.text) {
                    const commentDiv = document.createElement('div');
                    commentDiv.className = 'modal-comment-item';
                    commentDiv.innerHTML = `
                        <strong>${comment.title || 'General Comment'}</strong>
                        <p>${comment.text || ''}</p>
                    `;
                    modalCommentsContainer.appendChild(commentDiv);
                }
            });
        } else {
            modalCommentsContainer.innerHTML = '<p style="text-align: center; color: var(--label-color);">No comments for this share.</p>';
        }
        showModal(shareDetailModal);
        console.log(`[Details] Displayed details for share: ${share.shareName} (ID: ${selectedShareDocId})`);
    }

    // Watchlist Sorting Logic
    function sortShares() {
        const sortValue = sortSelect.value;
        if (!sortValue || sortValue === '') {
            console.log("[Sort] Sort placeholder selected, no explicit sorting applied.");
            renderWatchlist();
            return;
        }
        const [field, order] = sortValue.split('-');
        allSharesData.sort((a, b) => {
            let valA = a[field];
            let valB = b[field];

            if (field === 'lastFetchedPrice' || field === 'dividendAmount' || field === 'currentPrice' || field === 'targetPrice' || field === 'frankingCredits') {
                valA = (typeof valA === 'string' && valA.trim() !== '') ? parseFloat(valA) : valA;
                valB = (typeof valB === 'string' && valB.trim() !== '') ? parseFloat(valB) : valB;
                valA = (valA === null || valA === undefined || isNaN(valA)) ? (order === 'asc' ? Infinity : -Infinity) : valA;
                valB = (valB === null || valB === undefined || isNaN(valB)) ? (order === 'asc' ? Infinity : -Infinity) : valB;
                return order === 'asc' ? valA - valB : valB - valA;
            } else if (field === 'shareName') {
                const nameA = (a.shareName || '').toUpperCase().trim();
                const nameB = (b.shareName || '').toUpperCase().trim();
                if (nameA === '' && nameB === '') return 0;
                if (nameA === '') return order === 'asc' ? 1 : -1;
                if (nameB === '') return order === 'asc' ? -1 : 1;
                return order === 'asc' ? nameA.localeCompare(nameB) : nameB.localeCompare(nameA);
            } else if (field === 'entryDate') {
                const dateA = new Date(valA);
                const dateB = new Date(valB);
                valA = isNaN(dateA.getTime()) ? (order === 'asc' ? Infinity : -Infinity) : dateA.getTime();
                valB = isNaN(dateB.getTime()) ? (order === 'asc' ? Infinity : -Infinity) : dateB.getTime();
                return order === 'asc' ? valA - valB : valB - valA;
            } else {
                if (order === 'asc') {
                    if (valA < valB) return -1;
                    if (valA > valB) return 1;
                    return 0;
                } else {
                    if (valA > valB) return -1;
                    if (valA < valB) return 1;
                    return 0;
                }
            }
        });
        console.log("[Sort] Shares sorted. Rendering watchlist.");
        renderWatchlist();
    }

    // Render options in the watchlist dropdown
    function renderWatchlistSelect() {
        if (!watchlistSelect) { console.error("[renderWatchlistSelect] watchlistSelect element not found."); return; }
        watchlistSelect.innerHTML = '';
        const placeholderOption = document.createElement('option');
        placeholderOption.value = '';
        placeholderOption.textContent = 'Watchlist';
        placeholderOption.disabled = true;
        // Only set selected if there's no currentWatchlistId or if it's the default
        if (!currentWatchlistId || currentWatchlistName === DEFAULT_WATCHLIST_NAME) {
            placeholderOption.selected = true;
        }
        watchlistSelect.appendChild(placeholderOption);

        if (userWatchlists.length === 0) {
            watchlistSelect.disabled = true;
            return;
        }
        userWatchlists.forEach(watchlist => {
            const option = document.createElement('option');
            option.value = watchlist.id;
            option.textContent = watchlist.name;
            watchlistSelect.appendChild(option);
        });
        if (currentWatchlistId && userWatchlists.some(w => w.id === currentWatchlistId)) {
            watchlistSelect.value = currentWatchlistId;
            console.log(`[UI Update] Watchlist dropdown set to: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
        } else if (userWatchlists.length > 0) {
            watchlistSelect.value = userWatchlists[0].id;
            currentWatchlistId = userWatchlists[0].id;
            currentWatchlistName = userWatchlists[0].name;
            console.warn(`[UI Update] currentWatchlistId was null/invalid, fallback to first watchlist: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
        } else {
             watchlistSelect.value = '';
        }
        watchlistSelect.disabled = false;
    }

    // Render options in the sort by dropdown
    function renderSortSelect() {
        if (!sortSelect) { console.error("[renderSortSelect] sortSelect element not found."); return; }
        const firstOption = sortSelect.options[0];
        if (firstOption && firstOption.value === '') {
            firstOption.textContent = 'Sort';
            firstOption.disabled = true;
            firstOption.selected = true;
        } else {
            const placeholderOption = document.createElement('option');
            placeholderOption.value = '';
            placeholderOption.textContent = 'Sort';
            placeholderOption.disabled = true;
            placeholderOption.selected = true;
            sortSelect.insertBefore(placeholderOption, sortSelect.firstChild);
        }
        if (!sortSelect.value || sortSelect.value === '') {
            sortSelect.value = '';
        }
    }

    // Add Share to UI Functions
    function addShareToTable(share) {
        if (!shareTableBody) { console.error("[addShareToTable] shareTableBody element not found."); return; }
        const row = shareTableBody.insertRow();
        row.dataset.docId = share.id;
        row.addEventListener('click', (event) => { selectShare(share.id); });
        row.addEventListener('dblclick', (event) => { selectShare(share.id); showShareDetails(); });

        const displayShareName = (share.shareName && String(share.shareName).trim() !== '') ? share.shareName : '(No ASX Code)';
        row.insertCell().textContent = displayShareName;

        const priceCell = row.insertCell();
        const priceDisplayDiv = document.createElement('div');
        priceDisplayDiv.className = 'current-price-display';
        const lastFetchedPriceNum = Number(share.lastFetchedPrice);
        const previousFetchedPriceNum = Number(share.previousFetchedPrice);
        const priceValueSpan = document.createElement('span');
        priceValueSpan.className = 'price';
        const displayPrice = (!isNaN(lastFetchedPriceNum) && lastFetchedPriceNum !== null) ? `$${lastFetchedPriceNum.toFixed(2)}` : '-';
        priceValueSpan.textContent = displayPrice;

        if (!isNaN(lastFetchedPriceNum) && !isNaN(previousFetchedPriceNum) && previousFetchedPriceNum !== 0) {
            if (lastFetchedPriceNum > previousFetchedPriceNum) { priceValueSpan.classList.add('price-up'); }
            else if (lastFetchedPriceNum < previousFetchedPriceNum) { priceValueSpan.classList.add('price-down'); }
            else { priceValueSpan.classList.add('price-no-change'); }
        } else { priceValueSpan.classList.add('price-no-change'); }
        priceDisplayDiv.appendChild(priceValueSpan);

        const formattedDate = formatDate(share.lastPriceUpdateTime);
        if (formattedDate) {
            const dateSpan = document.createElement('span');
            dateSpan.className = 'date';
            dateSpan.textContent = `(${formattedDate})`;
            priceDisplayDiv.appendChild(dateSpan);
        }
        priceCell.appendChild(priceDisplayDiv);

        const targetPriceNum = Number(share.targetPrice);
        const displayTargetPrice = (!isNaN(targetPriceNum) && targetPriceNum !== null) ? `$${targetPriceNum.toFixed(2)}` : '-';
        row.insertCell().textContent = displayTargetPrice;

        const dividendCell = row.insertCell();
        const dividendAmountNum = Number(share.dividendAmount);
        const frankingCreditsNum = Number(share.frankingCredits);
        const unfrankedYield = calculateUnfrankedYield(dividendAmountNum, lastFetchedPriceNum);
        const frankedYield = calculateFrankedYield(dividendAmountNum, lastFetchedPriceNum, frankingCreditsNum);
        const divAmountDisplay = (!isNaN(dividendAmountNum) && dividendAmountNum !== null) ? `$${dividendAmountNum.toFixed(2)}` : '-';

        dividendCell.innerHTML = `
            <div class="dividend-yield-cell-content">
                <span>Dividend:</span> <span class="value">${divAmountDisplay}</span>
            </div>
            <div class="dividend-yield-cell-content">
                <span>Unfranked Yield:</span> <span class="value">${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'}</span>
            </div>
            <div class="dividend-yield-cell-content">
                <span>Franked Yield:</span> <span class="value">${frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'}</span>
            </div>
        `;

        const commentsCell = row.insertCell();
        let commentsText = '';
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsText = share.comments[0].text;
        }
        commentsCell.textContent = truncateText(commentsText, 70);
        console.log(`[Render] Added share ${displayShareName} to table.`);
    }

    function addShareToMobileCards(share) {
        if (!mobileShareCardsContainer) { console.error("[addShareToMobileCards] mobileShareCardsContainer element not found."); return; }
        // Only add mobile cards if we are currently in a mobile viewport
        if (!window.matchMedia("(max-width: 768px)").matches) { return; }

        const card = document.createElement('div');
        card.className = 'mobile-card';
        card.dataset.docId = share.id;

        const lastFetchedPriceNum = Number(share.lastFetchedPrice);
        const previousFetchedPriceNum = Number(share.previousFetchedPrice);
        const dividendAmountNum = Number(share.dividendAmount);
        const frankingCreditsNum = Number(share.frankingCredits);
        const targetPriceNum = Number(share.targetPrice);

        const unfrankedYield = calculateUnfrankedYield(dividendAmountNum, lastFetchedPriceNum);
        const frankedYield = calculateFrankedYield(dividendAmountNum, lastFetchedPriceNum, frankingCreditsNum);

        let priceClass = 'price-no-change';
        if (!isNaN(lastFetchedPriceNum) && !isNaN(previousFetchedPriceNum) && previousFetchedPriceNum !== 0) {
            if (lastFetchedPriceNum > previousFetchedPriceNum) { priceClass = 'price-up'; }
            else if (lastFetchedPriceNum < previousFetchedPriceNum) { priceClass = 'price-down'; }
        }

        let commentsSummary = '-';
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsSummary = truncateText(share.comments[0].text, 70);
        }

        const displayCurrentPrice = (!isNaN(lastFetchedPriceNum) && lastFetchedPriceNum !== null) ? lastFetchedPriceNum.toFixed(2) : '-';
        const displayTargetPrice = (!isNaN(targetPriceNum) && targetPriceNum !== null) ? targetPriceNum.toFixed(2) : '-';
        const displayDividendAmount = (!isNaN(dividendAmountNum) && dividendAmountNum !== null) ? dividendAmountNum.toFixed(2) : '-';
        const displayFrankingCredits = (!isNaN(frankingCreditsNum) && frankingCreditsNum !== null) ? `${frankingCreditsNum}%` : '-';
        const displayShareName = (share.shareName && String(share.shareName).trim() !== '') ? share.shareName : '(No ASX Code)';

        card.innerHTML = `
            <h3>${displayShareName}</h3>
            <p><strong>Entered:</strong> ${formatDate(share.entryDate) || '-'}</p>
            <p><strong>Current:</strong> <span class="${priceClass}">$${displayCurrentPrice}</span> ${formatDate(share.lastPriceUpdateTime) ? `(${formatDate(share.lastPriceUpdateTime)})` : ''}</p>
            <p><strong>Target:</strong> $${displayTargetPrice}</p>
            <p><strong>Dividend:</strong> $${displayDividendAmount}</p>
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
            if (touchMoved) { return; }
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
        console.log(`[Render] Added share ${displayShareName} to mobile cards.`);
    }

    // Function to select a share by its document ID and visually highlight it
    function selectShare(docId) {
        deselectCurrentShare();
        if (docId) {
            selectedShareDocId = docId;
            const tableRow = shareTableBody.querySelector(`tr[data-doc-id="${docId}"]`);
            if (tableRow) {
                tableRow.classList.add('selected');
                console.log(`[Selection] Selected table row for docId: ${docId}`);
            }
            const mobileCard = mobileShareCardsContainer.querySelector(`.mobile-card[data-doc-id="${docId}"]`);
            if (mobileCard) {
                mobileCard.classList.add('selected');
                console.log(`[Selection] Selected mobile card for docId: ${docId}`);
            }
            if (viewDetailsBtn) {
                viewDetailsBtn.disabled = false;
            }
            console.log(`[Selection] New share selected: ${docId}. viewDetailsBtn enabled.`);
        }
    }

    // Function to re-render the watchlist (table and cards) after sorting or other changes
    function renderWatchlist() {
        console.log(`[Render] Rendering watchlist for currentWatchlistId: ${currentWatchlistId} (Name: ${currentWatchlistName})`);
        clearShareListUI();
        const sharesToRender = allSharesData.filter(share => share.watchlistId === currentWatchlistId);
        console.log(`[Render] Shares filtered for rendering. Total shares to render: ${sharesToRender.length}`);

        sharesToRender.forEach((share) => {
            addShareToTable(share);
            // Always attempt to add mobile cards, will be filtered by addShareToMobileCards based on media query
            addShareToMobileCards(share);
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

    // NEW FUNCTION: renderAsxCodeButtons
    function renderAsxCodeButtons() {
        if (!asxCodeButtonsContainer) { console.error("[renderAsxCodeButtons] asxCodeButtonsContainer element not found."); return; }
        asxCodeButtonsContainer.innerHTML = '';
        const uniqueAsxCodes = new Set();
        const sharesInCurrentWatchlist = allSharesData.filter(share => share.watchlistId === currentWatchlistId);
        sharesInCurrentWatchlist.forEach(share => {
            if (share.shareName && typeof share.shareName === 'string' && share.shareName.trim() !== '') {
                uniqueAsxCodes.add(share.shareName.trim().toUpperCase());
            }
        });
        if (uniqueAsxCodes.size === 0) {
            asxCodeButtonsContainer.style.display = 'none';
            return;
        } else {
            asxCodeButtonsContainer.style.display = 'flex';
        }
        const sortedAsxCodes = Array.from(uniqueAsxCodes).sort();
        sortedAsxCodes.forEach(asxCode => {
            const button = document.createElement('button');
            button.className = 'asx-code-button';
            button.textContent = asxCode;
            button.dataset.asxCode = asxCode;
            asxCodeButtonsContainer.appendChild(button);
            button.addEventListener('click', (event) => {
                const clickedCode = event.target.dataset.asxCode;
                scrollToShare(clickedCode);
            });
        });
        console.log(`[UI] Rendered ${sortedAsxCodes.length} ASX code buttons.`);
    }

    // NEW FUNCTION: scrollToShare
    function scrollToShare(asxCode) {
        console.log(`[UI] Attempting to scroll to/highlight share with ASX Code: ${asxCode}`);
        const targetShare = allSharesData.find(s => s.shareName && s.shareName.toUpperCase() === asxCode.toUpperCase());
        if (targetShare) {
            selectShare(targetShare.id);
            let elementToScrollTo = document.querySelector(`#shareTable tbody tr[data-doc-id="${targetShare.id}"]`);
            // Check for mobile card if table row not found or if on mobile
            if (!elementToScrollTo || window.matchMedia("(max-width: 768px)").matches) {
                elementToScrollTo = document.querySelector(`.mobile-card[data-doc-id="${targetShare.id}"]`);
            }
            if (elementToScrollTo) {
                elementToScrollTo.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }


    // --- Firebase/Firestore Operations ---

    // Function to fetch user's watchlists and shares
    async function fetchUserWatchlistsAndShares() {
        if (!window.userId) {
            console.log("[Firestore] No user logged in. Clearing data.");
            allSharesData = [];
            userWatchlists = [];
            currentWatchlistId = null;
            currentWatchlistName = null;
            clearWatchlistUI();
            clearShareList();
            return;
        }

        console.log(`[Firestore] Fetching watchlists for user: ${window.userId}`);
        const userWatchlistsCollectionRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists`);
        
        try {
            // Fetch watchlists
            const watchlistSnapshot = await window.firestore.getDocs(window.firestore.query(userWatchlistsCollectionRef));
            userWatchlists = [];
            if (watchlistSnapshot.empty) {
                console.log("[Firestore] No watchlists found for user. Creating a default watchlist.");
                await createDefaultWatchlist();
            } else {
                watchlistSnapshot.forEach(doc => {
                    userWatchlists.push({ id: doc.id, name: doc.data().name, createdAt: doc.data().createdAt });
                });
                // Sort watchlists by name, then by createdAt if names are identical
                userWatchlists.sort((a, b) => {
                    if (a.name === DEFAULT_WATCHLIST_NAME && b.name !== DEFAULT_WATCHLIST_NAME) return -1;
                    if (b.name === DEFAULT_WATCHLIST_NAME && a.name !== DEFAULT_WATCHLIST_NAME) return 1;
                    const nameCompare = a.name.localeCompare(b.name);
                    if (nameCompare === 0) {
                        return (a.createdAt || 0) - (b.createdAt || 0);
                    }
                    return nameCompare;
                });
                console.log("[Firestore] User watchlists loaded:", userWatchlists);
            }

            // Set current watchlist
            if (userWatchlists.length > 0) {
                // If currentWatchlistId is not set or not found in fetched watchlists, default to the first one
                if (!currentWatchlistId || !userWatchlists.some(wl => wl.id === currentWatchlistId)) {
                    currentWatchlistId = userWatchlists[0].id;
                    currentWatchlistName = userWatchlists[0].name;
                    console.log(`[Watchlist] Defaulting to first watchlist: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
                } else {
                    const foundWatchlist = userWatchlists.find(wl => wl.id === currentWatchlistId);
                    if (foundWatchlist) {
                        currentWatchlistName = foundWatchlist.name;
                        console.log(`[Watchlist] Retaining current watchlist: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
                    }
                }
            } else {
                currentWatchlistId = null;
                currentWatchlistName = null;
            }
            renderWatchlistSelect(); // Update dropdown with fetched watchlists
            renderSortSelect(); // Ensure sort is rendered

            // Fetch shares for the current watchlist using a real-time listener
            if (currentWatchlistId) {
                console.log(`[Firestore] Setting up real-time listener for shares in watchlist: ${currentWatchlistId}`);
                const sharesCollectionRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`);

                // Detach previous listener if any (important for switching watchlists)
                if (window.shareUnsubscribe) {
                    window.shareUnsubscribe();
                    console.log("[Firestore] Detached previous share listener.");
                }

                window.shareUnsubscribe = window.firestore.onSnapshot(sharesCollectionRef, (snapshot) => {
                    allSharesData = []; // Clear current data
                    snapshot.forEach(doc => {
                        allSharesData.push({ id: doc.id, ...doc.data() });
                    });
                    console.log(`[Firestore] Shares updated for watchlist ${currentWatchlistId}. Total: ${allSharesData.length}`);
                    sortShares(); // Sort and render whenever shares data changes
                }, (error) => {
                    console.error("[Firestore] Error fetching shares:", error);
                    showCustomAlert("Error loading shares. Please try again.");
                });
            } else {
                allSharesData = [];
                sortShares(); // Clear and render empty
            }

        } catch (error) {
            console.error("[Firestore] Error fetching watchlists:", error);
            showCustomAlert("Error loading watchlists. Please try again.");
            clearWatchlistUI();
            clearShareList();
        }
    }

    async function createDefaultWatchlist() {
        if (!window.userId || !window.firestore || !window.firestore.db) {
            console.error("[Firestore] Cannot create default watchlist: User not logged in or Firestore not initialized.");
            showCustomAlert("Authentication required to create watchlist.");
            return;
        }
        const watchlistDocRef = window.firestore.doc(window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists`));
        try {
            const newWatchlistData = {
                name: DEFAULT_WATCHLIST_NAME,
                createdAt: window.firestore.serverTimestamp(),
            };
            await window.firestore.setDoc(watchlistDocRef, newWatchlistData);
            console.log("[Firestore] Default watchlist created with ID:", watchlistDocRef.id);
            // Manually add the newly created watchlist to our local array
            userWatchlists.push({
                id: watchlistDocRef.id,
                name: newWatchlistData.name,
                createdAt: new Date().getTime() // Use client time for immediate display
            });
            currentWatchlistId = watchlistDocRef.id;
            currentWatchlistName = newWatchlistData.name;
            renderWatchlistSelect();
            sortShares(); // Re-render watchlist with the new, empty list
        } catch (error) {
            console.error("[Firestore] Error creating default watchlist:", error);
            showCustomAlert("Failed to create default watchlist. Please try again.");
        }
    }

    async function addOrUpdateShare(shareData) {
        if (!window.userId || !currentWatchlistId) {
            showCustomAlert("Please sign in and select a watchlist.");
            return;
        }
        try {
            let docRef;
            if (selectedShareDocId) {
                // Update existing share
                docRef = window.firestore.doc(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`, selectedShareDocId);
                const updatedData = {
                    ...shareData,
                    lastPriceUpdateTime: new Date().toISOString() // Update timestamp on edit
                };
                await window.firestore.updateDoc(docRef, updatedData);
                showCustomAlert("Share updated successfully!", 1500);
                console.log("[Firestore] Share updated:", selectedShareDocId);
            } else {
                // Add new share
                docRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`);
                const newShareData = {
                    ...shareData,
                    entryDate: new Date().toISOString(), // Set entry date for new share
                    lastPriceUpdateTime: new Date().toISOString(), // Initial price update time
                    watchlistId: currentWatchlistId
                };
                await window.firestore.addDoc(docRef, newShareData);
                showCustomAlert("Share added successfully!", 1500);
                console.log("[Firestore] Share added.");
            }
            clearForm();
            hideModal(shareFormSection);
        } catch (error) {
            console.error("Error adding/updating share:", error);
            showCustomAlert("Failed to save share. Please try again.");
        }
    }

    async function deleteShare() {
        if (!window.userId || !currentWatchlistId || !selectedShareDocId) {
            showCustomAlert("Cannot delete: No user, watchlist, or share selected.");
            return;
        }
        showCustomConfirm("Are you sure you want to delete this share?", async () => {
            try {
                const docRef = window.firestore.doc(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`, selectedShareDocId);
                await window.firestore.deleteDoc(docRef);
                showCustomAlert("Share deleted successfully!", 1500);
                console.log("[Firestore] Share deleted:", selectedShareDocId);
                deselectCurrentShare();
                hideModal(shareFormSection); // Hide form if open
            } catch (error) {
                console.error("Error deleting share:", error);
                showCustomAlert("Failed to delete share. Please try again.");
            }
        });
    }

    async function addNewWatchlist() {
        if (!window.userId) {
            showCustomAlert("Please sign in to create a new watchlist.");
            return;
        }
        // Using native prompt here as custom confirm is not designed for input
        const newName = prompt("Enter new watchlist name:");
        if (!newName || newName.trim() === "") {
            showCustomAlert("Watchlist name cannot be empty.");
            return;
        }
        if (userWatchlists.some(wl => wl.name.toLowerCase() === newName.toLowerCase().trim())) {
            showCustomAlert("A watchlist with this name already exists.");
            return;
        }
        try {
            const watchlistRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists`);
            const docRef = await window.firestore.addDoc(watchlistRef, {
                name: newName.trim(),
                createdAt: window.firestore.serverTimestamp()
            });
            showCustomAlert("Watchlist created!", 1500);
            console.log("New watchlist added:", docRef.id);
            // Force a re-fetch and update UI to include the new watchlist
            await fetchUserWatchlistsAndShares();
            // Select the newly created watchlist
            if (docRef.id) {
                currentWatchlistId = docRef.id;
                currentWatchlistName = newName.trim();
                renderWatchlistSelect();
                // Listener will automatically update shares
            }
        } catch (error) {
            console.error("Error adding new watchlist:", error);
            showCustomAlert("Failed to create watchlist. Please try again.");
        }
    }


    async function renameWatchlist() {
        if (!window.userId || !currentWatchlistId) {
            showCustomAlert("Please sign in and select a watchlist to rename.");
            return;
        }
        if (currentWatchlistName === DEFAULT_WATCHLIST_NAME) {
            showCustomAlert("The default watchlist cannot be renamed.");
            return;
        }

        const newName = prompt(`Rename "${currentWatchlistName}" to:`);
        if (!newName || newName.trim() === "" || newName.trim() === currentWatchlistName) {
            showCustomAlert("Rename cancelled or new name is invalid/same.");
            return;
        }
        if (userWatchlists.some(wl => wl.name.toLowerCase() === newName.toLowerCase().trim())) {
            showCustomAlert("A watchlist with this name already exists.");
            return;
        }

        try {
            const watchlistDocRef = window.firestore.doc(window.firestore.db, `users/${window.userId}/watchlists`, currentWatchlistId);
            await window.firestore.updateDoc(watchlistDocRef, { name: newName.trim() });
            showCustomAlert("Watchlist renamed successfully!", 1500);
            console.log(`Watchlist ${currentWatchlistId} renamed to ${newName.trim()}`);
            // Force re-fetch to update local state and UI
            await fetchUserWatchlistsAndShares();
        } catch (error) {
            console.error("Error renaming watchlist:", error);
            showCustomAlert("Failed to rename watchlist. Please try again.");
        }
    }

    async function deleteCurrentWatchlist() {
        if (!window.userId || !currentWatchlistId) {
            showCustomAlert("Please sign in and select a watchlist to delete.");
            return;
        }
        if (currentWatchlistName === DEFAULT_WATCHLIST_NAME) {
            showCustomAlert("The default watchlist cannot be deleted.");
            return;
        }
        showCustomConfirm(`Are you sure you want to delete the watchlist "${currentWatchlistName}" and all its shares? This cannot be undone.`, async () => {
            try {
                // First, delete all shares within the watchlist
                const sharesCollectionRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`);
                const shareDocs = await window.firestore.getDocs(sharesCollectionRef);
                const deleteSharePromises = [];
                shareDocs.forEach(doc => {
                    deleteSharePromises.push(window.firestore.deleteDoc(window.firestore.doc(sharesCollectionRef, doc.id)));
                });
                await Promise.all(deleteSharePromises);
                console.log(`All shares deleted for watchlist ${currentWatchlistId}`);

                // Then, delete the watchlist document itself
                const watchlistDocRef = window.firestore.doc(window.firestore.db, `users/${window.userId}/watchlists`, currentWatchlistId);
                await window.firestore.deleteDoc(watchlistDocRef);

                showCustomAlert("Watchlist deleted successfully!", 1500);
                console.log(`Watchlist ${currentWatchlistId} deleted.`);

                // Clear current watchlist selection and re-fetch everything
                currentWatchlistId = null;
                currentWatchlistName = null;
                await fetchUserWatchlistsAndShares(); // This will create a new default if no others exist
            } catch (error) {
                console.error("Error deleting watchlist:", error);
                showCustomAlert("Failed to delete watchlist. Please try again.");
            }
        });
    }

    async function exportCurrentWatchlist() {
        if (!window.userId || !currentWatchlistId) {
            showCustomAlert("Please sign in and select a watchlist to export.");
            return;
        }
        const watchlistData = allSharesData.filter(share => share.watchlistId === currentWatchlistId);
        if (watchlistData.length === 0) {
            showCustomAlert("No shares in this watchlist to export.");
            return;
        }

        const dataStr = JSON.stringify(watchlistData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const filename = `${currentWatchlistName.replace(/\s/g, '-')}-shares-${new Date().toISOString().slice(0, 10)}.json`;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        showCustomAlert("Watchlist exported!", 1500);
    }

    async function importSharesToCurrentWatchlist(file) {
        if (!window.userId || !currentWatchlistId) {
            showCustomAlert("Please sign in and select a watchlist to import into.");
            return;
        }
        if (!file) {
            showCustomAlert("No file selected for import.");
            return;
        }

        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const importedData = JSON.parse(event.target.result);
                if (!Array.isArray(importedData)) {
                    showCustomAlert("Imported file is not a valid list of shares.");
                    return;
                }

                showCustomConfirm(`Import ${importedData.length} shares into "${currentWatchlistName}"?`, async () => {
                    const importPromises = importedData.map(async (share) => {
                        // Clean up data for import (remove Firestore specific IDs, add current watchlist ID)
                        const { id, watchlistId, ...dataToImport } = share;
                        const newShareData = {
                            ...dataToImport,
                            entryDate: new Date().toISOString(), // Use current date for import
                            lastPriceUpdateTime: new Date().toISOString(),
                            watchlistId: currentWatchlistId
                        };
                        const docRef = window.firestore.collection(window.firestore.db, `users/${window.userId}/watchlists/${currentWatchlistId}/shares`);
                        return window.firestore.addDoc(docRef, newShareData);
                    });

                    await Promise.all(importPromises);
                    showCustomAlert(`${importedData.length} shares imported successfully!`, 2000);
                    // The onSnapshot listener will automatically re-render the list
                });

            } catch (e) {
                console.error("Error parsing or importing file:", e);
                showCustomAlert("Failed to import file. Make sure it's a valid JSON.", 3000);
            }
        };
        reader.onerror = () => {
            showCustomAlert("Error reading file.");
        };
        reader.readAsText(file);
    }


    // --- Calculation Functions ---
    function calculateUnfrankedYield(dividendAmount, currentPrice) {
        if (typeof dividendAmount !== 'number' || typeof currentPrice !== 'number' || isNaN(dividendAmount) || isNaN(currentPrice) || currentPrice <= 0) {
            return null;
        }
        return (dividendAmount / currentPrice) * 100;
    }

    function calculateFrankedYield(dividendAmount, currentPrice, frankingCredits) {
        if (typeof dividendAmount !== 'number' || typeof currentPrice !== 'number' || typeof frankingCredits !== 'number' || isNaN(dividendAmount) || isNaN(currentPrice) || isNaN(frankingCredits) || currentPrice <= 0 || frankingCredits < 0 || frankingCredits > 100) {
            return null;
        }
        const grossUpFactor = frankingCredits / 100;
        const grossedUpDividend = dividendAmount / (1 - (grossUpFactor * 0.3)); // Assuming 30% company tax rate
        return (grossedUpDividend / currentPrice) * 100;
    }

    function resetCalculator() {
        calcInputA.value = '';
        calcInputB.value = '';
        calcResult.textContent = '0.00';
        calcInputA.disabled = false;
        calcInputB.disabled = false;
        standardCalcBtnInModal.classList.remove('active');
        dividendCalcBtnInModal.classList.remove('active');
        // Clear previous event listeners to prevent multiple bindings if calculator is reused
        calcInputA.oninput = null;
        calcInputB.oninput = null;
        console.log("[Calculator] Reset.");
    }

    function setupStandardCalculator() {
        calcTypeDisplay.textContent = 'Standard Calculator';
        calcInstruction.textContent = 'Enter two numbers to multiply.';
        calcInputA.placeholder = 'Number 1';
        calcInputB.placeholder = 'Number 2';
        calcInputA.value = '';
        calcInputB.value = '';
        calcResult.textContent = '0.00';
        standardCalcBtnInModal.classList.add('active');
        dividendCalcBtnInModal.classList.remove('active');

        const performCalculation = () => {
            const numA = parseFloat(calcInputA.value) || 0;
            const numB = parseFloat(calcInputB.value) || 0;
            calcResult.textContent = (numA * numB).toFixed(2);
        };
        calcInputA.oninput = performCalculation;
        calcInputB.oninput = performCalculation;
        calcInputA.focus();
        console.log("[Calculator] Standard calculator setup.");
    }

    function setupDividendCalculator() {
        calcTypeDisplay.textContent = 'Dividend Yield Calculator';
        calcInstruction.textContent = 'Enter Dividend Amount and Current Price.';
        calcInputA.placeholder = 'Dividend Amount';
        calcInputB.placeholder = 'Current Price';
        calcInputA.value = '';
        calcInputB.value = '';
        calcResult.textContent = '0.00';
        dividendCalcBtnInModal.classList.add('active');
        standardCalcBtnInModal.classList.remove('active');

        const performCalculation = () => {
            const dividend = parseFloat(calcInputA.value) || 0;
            const price = parseFloat(calcInputB.value) || 0;
            const yieldVal = calculateUnfrankedYield(dividend, price);
            calcResult.textContent = yieldVal !== null ? `${yieldVal.toFixed(2)}%` : 'N/A';
        };
        calcInputA.oninput = performCalculation;
        calcInputB.oninput = performCalculation;
        calcInputA.focus();
        console.log("[Calculator] Dividend calculator setup.");
    }

    // --- Event Listeners ---

    // Global click listener to close modals/deselect shares
    document.body.addEventListener('click', function(event) {
        // Check if the click is outside any modal content AND not on a button that opens a modal
        const isClickInsideModal = event.target.closest('.modal-content') || event.target.closest('.modal-footer');
        const isModalTrigger = event.target.closest('[data-modal-target]'); // Buttons that open modals
        const isAuthButton = event.target.closest('#googleAuthBtn') || event.target.closest('#signOutBtn'); // Auth buttons might have their own logic
        const isSidebar = event.target.closest('#appSidebar') || event.target.closest('#hamburgerBtn'); // Sidebar elements

        // Close custom dialogs if clicking outside, unless it's the confirm/cancel buttons
        if (customDialogModal && customDialogModal.style.display === 'flex' && !event.target.closest('.custom-dialog-content') && !isAuthButton && !isSidebar) {
            if (currentDialogCallback) {
                currentDialogCallback(); // Execute cancel callback if exists
            } else {
                hideModal(customDialogModal);
            }
        }
        
        // General modal closing: If clicked outside an open modal AND not on a trigger button
        document.querySelectorAll('.modal').forEach(modal => {
            if (modal.style.display === 'flex' && !modal.contains(event.target) && !isModalTrigger && !isAuthButton && !isSidebar) {
                closeModals();
            }
        });

        // Deselect share if click is outside table/card area and not on a share selection or modal open button
        const isClickOnShareElement = event.target.closest('.share-list-section') || event.target.closest('.asx-code-button');
        const isClickOnFormOrDetailsModal = event.target.closest('#shareFormSection') || event.target.closest('#shareDetailModal');
        const isClickOnCalculatorModal = event.target.closest('#calculatorModal');

        if (selectedShareDocId && !isClickOnShareElement && !isClickOnFormOrDetailsModal && !isClickOnCalculatorModal && !isModalTrigger && !isAuthButton && !isSidebar) {
            deselectCurrentShare();
        }
    });


    // Close buttons for modals
    closeModalButtons.forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // Form button listeners
    if (saveShareBtn) {
        saveShareBtn.addEventListener('click', async (event) => {
            event.preventDefault(); // Prevent default form submission
            const shareName = shareNameInput.value.trim();
            if (!shareName) {
                showCustomAlert("Share name cannot be empty.");
                return;
            }

            const comments = Array.from(commentsFormContainer.children).map(section => ({
                title: section.querySelector('.comment-title-input').value.trim(),
                text: section.querySelector('.comment-text-input').value.trim()
            }));

            const shareData = {
                shareName: shareName,
                currentPrice: parseFloat(currentPriceInput.value) || null,
                targetPrice: parseFloat(targetPriceInput.value) || null,
                dividendAmount: parseFloat(dividendAmountInput.value) || null,
                frankingCredits: parseFloat(frankingCreditsInput.value) || null,
                // Do not store previousFetchedPrice directly from form, it's for external updates
                comments: comments
            };
            await addOrUpdateShare(shareData);
        });
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', (event) => {
            event.preventDefault();
            clearForm();
            hideModal(shareFormSection);
        });
    }

    if (deleteShareFromFormBtn) {
        deleteShareFromFormBtn.addEventListener('click', (event) => {
            event.preventDefault();
            deleteShare();
        });
    }

    if (addCommentBtn) {
        addCommentBtn.addEventListener('click', addCommentSection);
    }

    // Main action button listeners
    if (newShareBtn) {
        newShareBtn.addEventListener('click', () => {
            clearForm();
            formTitle.textContent = 'Add New Share';
            deleteShareFromFormBtn.style.display = 'none';
            showModal(shareFormSection);
            shareNameInput.focus();
            console.log("[UI] New Share button clicked. Showing add form.");
        });
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', showShareDetails);
    }

    if (editShareBtn) {
        editShareBtn.addEventListener('click', showEditFormForSelectedShare);
    }

    // Calculator buttons
    if (standardCalcBtn) {
        standardCalcBtn.addEventListener('click', () => {
            showModal(calculatorModal);
            setupStandardCalculator();
        });
    }
    if (dividendCalcBtn) {
        dividendCalcBtn.addEventListener('click', () => {
            showModal(calculatorModal);
            setupDividendCalculator();
        });
    }
    if (standardCalcBtnInModal) {
        standardCalcBtnInModal.addEventListener('click', setupStandardCalculator);
    }
    if (dividendCalcBtnInModal) {
        dividendCalcBtnInModal.addEventListener('click', setupDividendCalculator);
    }

    // Theme toggle listener
    if (themeToggle) {
        themeToggle.addEventListener('change', () => {
            document.body.classList.toggle('dark-theme', themeToggle.checked);
            localStorage.setItem('theme', themeToggle.checked ? 'dark' : 'light');
            console.log(`[Theme] Toggled to ${themeToggle.checked ? 'dark' : 'light'}.`);
        });
    }

    // Apply saved theme on load
    function applyTheme() {
        const savedTheme = localStorage.getItem('theme');
        if (savedTheme === 'dark') {
            document.body.classList.add('dark-theme');
            if (themeToggle) themeToggle.checked = true;
            console.log("[Theme] Applied saved theme: dark");
        } else if (savedTheme === 'light') {
            document.body.classList.remove('dark-theme');
            if (themeToggle) themeToggle.checked = false;
            console.log("[Theme] Applied saved theme: light");
        } else {
            // Default to system preference
            const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
            if (prefersDark) {
                document.body.classList.add('dark-theme');
                if (themeToggle) themeToggle.checked = true;
                console.log("[Theme] Applied system default theme: dark");
            } else {
                document.body.classList.remove('dark-theme');
                if (themeToggle) themeToggle.checked = false;
                console.log("[Theme] Applied system default theme: light");
            }
        }
    }
    applyTheme(); // Call on initial load

    if (applyThemeBtn) { // Button to apply system theme (if preference changes live) - though toggle is better
        applyThemeBtn.addEventListener('click', applyTheme);
    }

    // Watchlist management listeners
    if (watchlistSelect) {
        watchlistSelect.addEventListener('change', async (event) => {
            const newWatchlistId = event.target.value;
            const selectedWatchlist = userWatchlists.find(wl => wl.id === newWatchlistId);
            if (selectedWatchlist) {
                currentWatchlistId = newWatchlistId;
                currentWatchlistName = selectedWatchlist.name;
                console.log(`[Watchlist] Switched to watchlist: ${currentWatchlistName} (ID: ${currentWatchlistId})`);
                await fetchUserWatchlistsAndShares(); // This will detach old and attach new listener
            }
        });
    }

    if (newWatchlistBtn) {
        newWatchlistBtn.addEventListener('click', addNewWatchlist);
    }
    if (renameWatchlistBtn) {
        renameWatchlistBtn.addEventListener('click', renameWatchlist);
    }
    if (deleteWatchlistBtn) {
        deleteWatchlistBtn.addEventListener('click', deleteCurrentWatchlist);
    }
    if (exportWatchlistBtn) {
        exportWatchlistBtn.addEventListener('click', exportCurrentWatchlist);
    }
    if (importWatchlistBtn) {
        importWatchlistBtn.addEventListener('click', () => {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.accept = 'application/json';
            fileInput.onchange = (e) => {
                const file = e.target.files[0];
                importSharesToCurrentWatchlist(file);
            };
            fileInput.click();
        });
    }

    if (addShareToCurrentWatchlistBtn) {
        addShareToCurrentWatchlistBtn.addEventListener('click', () => {
            if (!currentWatchlistId) {
                showCustomAlert("Please create or select a watchlist first.");
                return;
            }
            clearForm();
            formTitle.textContent = `Add New Share to "${currentWatchlistName}"`;
            deleteShareFromFormBtn.style.display = 'none';
            showModal(shareFormSection);
            shareNameInput.focus();
            console.log(`[UI] Adding new share to watchlist: ${currentWatchlistName}`);
        });
    }


    // Sort select listener
    if (sortSelect) {
        sortSelect.addEventListener('change', sortShares);
    }


    // --- Authentication ---
    if (googleAuthBtn) {
        console.log("[Auth] Google Auth button enabled.");
        googleAuthBtn.addEventListener('click', async () => {
            try {
                // Ensure Firebase Auth is available
                if (!window.authFunctions || !window.authFunctions.signInWithPopup || !window.authFunctions.GoogleAuthProviderInstance || !window.firebaseAuth) {
                    console.error("[Auth] Firebase Auth functions not available for Google sign-in.");
                    showCustomAlert("Firebase Authentication is not available. Please check your configuration.");
                    return;
                }

                await window.authFunctions.signInWithPopup(window.firebaseAuth, window.authFunctions.GoogleAuthProviderInstance);
                // Auth state change listener will handle the rest
            } catch (error) {
                console.error("Google Sign-In Error:", error);
                if (error.code === 'auth/popup-closed-by-user') {
                    showCustomAlert("Sign-in cancelled.");
                } else if (error.code === 'auth/cancelled-popup-request') {
                    showCustomAlert("Pop-up already open or blocked. Please allow pop-ups for this site.");
                } else if (error.code === 'auth/network-request-failed') {
                    showCustomAlert("Network error. Please check your internet connection.");
                } else {
                    showCustomAlert(`Sign-in failed: ${error.message}`);
                }
            }
        });
    }

    if (signOutBtn) {
        signOutBtn.addEventListener('click', async () => {
            try {
                if (!window.authFunctions || !window.authFunctions.signOut || !window.firebaseAuth) {
                    console.error("[Auth] Firebase Auth functions not available for sign-out.");
                    showCustomAlert("Firebase Authentication is not available.");
                    return;
                }
                await window.authFunctions.signOut(window.firebaseAuth);
                // Auth state change listener will handle the rest
            } catch (error) {
                console.error("Sign-Out Error:", error);
                showCustomAlert(`Sign-out failed: ${error.message}`);
            }
        });
    }

    // Firebase Auth State Change Listener
    // This listener should always run to manage UI based on auth state,
    // regardless of whether `isAppReadyForFirestore` is true.
    // Data fetching (inside `fetchUserWatchlistsAndShares`) will handle its own readiness.
    if (window.authFunctions && window.authFunctions.onAuthStateChanged) {
        window.authFunctions.onAuthStateChanged(window.firebaseAuth, (user) => {
            // REMOVED THE PREVIOUS `isAppReadyForFirestore` BLOCK.

            window.userId = user ? user.uid : null;
            console.log(`[AuthState] User: ${window.userId ? 'signed in' : 'signed out'}.`);

            updateAuthButtonText(!!user, user ? (user.displayName || user.email || 'Signed In') : 'Sign In');
            toggleSidebarAuthElements(!!user); // This line calls the updated function

            if (user) {
                currentLoggedInUser = user;
                console.log("[Auth] User signed in. Fetching watchlists and shares...");
                updateMainButtonsState(true); // Enable buttons when signed in
                fetchUserWatchlistsAndShares();
            } else {
                currentLoggedInUser = null;
                console.log("[AuthState] User signed out.");
                updateMainButtonsState(false); // Disable buttons when signed out
                clearWatchlistUI();
                clearShareList();
                clearForm();
                // Optionally, show a sign-in prompt here
            }
        });
        console.log("[Auth] Firebase Auth state change listener initialized.");
    } else {
        console.error("[Auth] Firebase Auth functions not available on window.authFunctions.");
    }

    // --- Sidebar and Mobile UI Logic ---

    // Toggle sidebar function
    function toggleAppSidebar(open) {
        if (open === undefined) { // If no argument, toggle current state
            appSidebar.classList.toggle('open');
            sidebarOverlay.classList.toggle('visible');
        } else if (open) { // Explicitly open
            appSidebar.classList.add('open');
            sidebarOverlay.classList.add('visible');
        } else { // Explicitly close
            appSidebar.classList.remove('open');
            sidebarOverlay.classList.remove('visible');
        }
    }

    // Scroll-to-top button visibility
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            if (window.innerWidth <= 768) { // Only show on mobile
                if (window.scrollY > 200) {
                    scrollToTopBtn.style.display = 'flex'; // Use flex for centering
                } else {
                    scrollToTopBtn.style.display = 'none';
                }
            } else {
                scrollToTopBtn.style.display = 'none'; // Ensure hidden on desktop
            }
        });

        scrollToTopBtn.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        });
    }


    // Initialize sidebar and its event listeners if elements exist
    if (appSidebar && hamburgerBtn && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => toggleAppSidebar(true));
        sidebarOverlay.addEventListener('click', () => toggleAppSidebar(false)); // Close on overlay click

        // Handle resize event to adapt sidebar behavior
        window.addEventListener('resize', () => {
            const isDesktop = window.innerWidth > 768;
            // If sidebar is open, close it on resize to prevent layout issues
            if (appSidebar.classList.contains('open')) {
                toggleAppSidebar(false); // Force close
            }
            // Re-evaluate scroll-to-top button visibility on resize
            if (scrollToTopBtn) {
                if (window.innerWidth > 768) {
                    scrollToTopBtn.style.display = 'none';
                } else {
                    // Re-trigger scroll event to evaluate visibility based on scroll position
                    window.dispatchEvent(new Event('scroll'));
                }
            }
        });

        // Add event listeners to close menu when certain menu buttons are clicked
        const menuButtons = appSidebar.querySelectorAll('.menu-button-item');
        menuButtons.forEach(button => {
            // Check for the data-action-closes-menu attribute
            if (button.dataset.actionClosesMenu === 'true') {
                button.addEventListener('click', () => {
                    toggleAppSidebar(false); // Explicitly close the sidebar after these actions
                });
            }
        });
    }

}); // End DOMContentLoaded