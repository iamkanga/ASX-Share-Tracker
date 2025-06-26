// File Version: v88
// Last Updated: 2025-06-26 (Fixed updateAuthButtonState ReferenceError)

// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js (v88) DOMContentLoaded fired."); // New log to confirm script version and DOM ready

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
                <span>Unfranked Yield:</span> <span class="value">${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : '-'}%</span>
            </div>
            <div class="dividend-yield-cell-content">
                <span>Franked Yield:</span> <span class="value">${frankedYield !== null ? frankedYield.toFixed(2) + '%' : '-'}%</span>
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
            showShareDetails();
        } else {
            showCustomAlert(`Share '${asxCode}' not found.`);
        }
    }

    // Financial Calculation Functions (Australian context)
    const COMPANY_TAX_RATE = 0.30; // 30% company tax rate
    function calculateUnfrankedYield(dividendAmount, currentPrice) {
        if (typeof dividendAmount !== 'number' || isNaN(dividendAmount) || dividendAmount <= 0) { return null; }
        if (typeof currentPrice !== 'number' || isNaN(currentPrice) || currentPrice <= 0) { return null; }
        return (dividendAmount / currentPrice) * 100;
    }

    function calculateFrankedYield(dividendAmount, currentPrice, frankingCreditsPercentage) {
        if (typeof dividendAmount !== 'number' || isNaN(dividendAmount) || dividendAmount <= 0) { return null; }
        if (typeof currentPrice !== 'number' || isNaN(currentPrice) || currentPrice <= 0) { return null; }
        if (typeof frankingCreditsPercentage !== 'number' || isNaN(frankingCreditsPercentage) || frankingCreditsPercentage < 0 || frankingCreditsPercentage > 100) { return null; }
        const unfrankedYield = calculateUnfrankedYield(dividendAmount, currentPrice);
        if (unfrankedYield === null) return null;
        const frankingRatio = frankingCreditsPercentage / 100;
        const frankingCreditPerShare = dividendAmount * (COMPANY_TAX_RATE / (1 - COMPANY_TAX_RATE)) * frankingRatio;
        const grossedUpDividend = dividendAmount + frankingCreditPerShare;
        return (grossedUpDividend / currentPrice) * 100;
    }

    function estimateDividendIncome(investmentValue, dividendAmountPerShare, currentPricePerShare) {
        if (typeof investmentValue !== 'number' || isNaN(investmentValue) || investmentValue <= 0) { return null; }
        if (typeof dividendAmountPerShare !== 'number' || isNaN(dividendAmountPerShare) || dividendAmountPerShare <= 0) { return null; }
        if (typeof currentPricePerShare !== 'number' || isNaN(currentPricePerShare) || currentPricePerShare <= 0) { return null; }
        const numberOfShares = investmentValue / currentPricePerShare;
        return numberOfShares * dividendAmountPerShare;
    }

    // Calculator Functions
    function updateCalculatorDisplay() {
        calculatorInput.textContent = previousCalculatorInput + (operator ? ` ${getOperatorSymbol(operator)} ` : '') + currentCalculatorInput;
        if (resultDisplayed) { /* nothing */ }
        else if (currentCalculatorInput !== '') { calculatorResult.textContent = currentCalculatorInput; }
        else if (previousCalculatorInput !== '' && operator) { calculatorResult.textContent = previousCalculatorInput; }
        else { calculatorResult.textContent = '0'; }
    }

    function calculateResult() {
        let prev = parseFloat(previousCalculatorInput);
        let current = parseFloat(currentCalculatorInput);
        if (isNaN(prev) || isNaN(current)) return;
        let res;
        switch (operator) {
            case 'add': res = prev + current; break;
            case 'subtract': res = prev - current; break;
            case 'multiply': res = prev * current; break;
            case 'divide':
                if (current === 0) { showCustomAlert("Cannot divide by zero!"); res = 'Error'; }
                else { res = prev / current; }
                break;
            default: return;
        }
        if (typeof res === 'number' && !isNaN(res)) { res = parseFloat(res.toFixed(10)); }
        calculatorResult.textContent = res;
        previousCalculatorInput = res.toString();
        currentCalculatorInput = '';
    }

    function getOperatorSymbol(op) {
        switch (op) {
            case 'add': return '+'; case 'subtract': return '-';
            case 'multiply': return '×'; case 'divide': return '÷';
            default: return '';
        }
    }

    function resetCalculator() {
        currentCalculatorInput = ''; operator = null; previousCalculatorInput = '';
        resultDisplayed = false; calculatorInput.textContent = ''; calculatorResult.textContent = '0';
        console.log("[Calculator] Calculator state reset.");
    }

    // Theme Toggling Logic
    function toggleTheme() {
        const body = document.body;
        if (body.classList.contains('dark-theme')) {
            body.classList.remove('dark-theme');
            localStorage.setItem('theme', 'light');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
        } else {
            body.classList.add('dark-theme');
            localStorage.setItem('theme', 'dark');
            if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
        }
        console.log(`[Theme] Theme toggled to: ${localStorage.getItem('theme')}`);
    }

    function applySavedTheme() {
        const savedTheme = localStorage.getItem('theme');
        const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const body = document.body;
        if (savedTheme) {
            if (savedTheme === 'dark') {
                body.classList.add('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
            } else {
                body.classList.remove('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
            }
            console.log(`[Theme] Applied saved theme: ${savedTheme}`);
        } else {
            if (systemPrefersDark) {
                body.classList.add('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
            } else {
                body.classList.remove('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
            }
            localStorage.setItem('theme', systemPrefersDark ? 'dark' : 'light');
            console.log(`[Theme] Applied system default theme: ${systemPrefersDark ? 'dark' : 'light'}`);
        }
    }

    // Hamburger/Sidebar Menu Logic (Unified for Mobile & Desktop)
    function toggleAppSidebar(force) {
        const isSidebarOpen = appSidebar.classList.contains('open');
        const isForcedOpen = (typeof force === 'boolean' && force === true);
        const isForcedClosed = (typeof force === 'boolean' && force === false);

        // Determine the target state based on 'force' or current state
        let targetState;
        if (isForcedOpen) { targetState = true; }
        else if (isForcedClosed) { targetState = false; }
        else { targetState = !isSidebarOpen; } // Toggle if no force specified

        if (targetState) {
            appSidebar.classList.add('open');
            sidebarOverlay.classList.add('open'); // Show overlay
            document.body.classList.add('sidebar-active'); // Shift content
            document.body.style.overflow = 'hidden'; // Prevent scrolling background
        } else {
            appSidebar.classList.remove('open');
            sidebarOverlay.classList.remove('open'); // Hide overlay
            document.body.classList.remove('sidebar-active'); // Revert content shift
            document.body.style.overflow = ''; // Allow scrolling background
        }
        console.log(`[Menu] App sidebar toggled. Open: ${appSidebar.classList.contains('open')}`);
    }


    // Watchlist ID generation
    function getDefaultWatchlistId(userId) {
        return `${userId}_${DEFAULT_WATCHLIST_ID_SUFFIX}`;
    }

    // Save the last selected watchlist ID to user's profile
    async function saveLastSelectedWatchlistId(watchlistId) {
        if (!db || !currentUserId || !window.firestore) {
            console.warn("[Watchlist] Cannot save last selected watchlist: DB, User ID, or Firestore functions not available.");
            return;
        }
        const userProfileDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/profile/settings`);
        try {
            await window.firestore.setDoc(userProfileDocRef, { lastSelectedWatchlistId: watchlistId }, { merge: true });
            console.log(`[Watchlist] Saved last selected watchlist ID: ${watchlistId}`);
        } catch (error) {
            console.error("[Watchlist] Error saving last selected watchlist ID:", error);
        }
    }

    // Load watchlists from Firestore and set the current one
    async function loadUserWatchlists() {
        if (!db || !currentUserId) {
            console.warn("[Watchlist] Firestore DB or User ID not available for loading watchlists.");
            return;
        }
        userWatchlists = [];
        const watchlistsColRef = window.firestore ? window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists`) : null;
        const userProfileDocRef = window.firestore ? window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/profile/settings`) : null;

        if (!watchlistsColRef || !userProfileDocRef) {
            console.error("[Watchlist] Firestore collection or doc reference is null. Cannot load watchlists.");
            showCustomAlert("Firestore services not fully initialized. Cannot load watchlists.");
            return;
        }

        try {
            console.log("[Watchlist] Fetching user watchlists...");
            const querySnapshot = await window.firestore.getDocs(watchlistsColRef);
            querySnapshot.forEach(doc => { userWatchlists.push({ id: doc.id, name: doc.data().name }); });
            console.log(`[Watchlist] Found ${userWatchlists.length} existing watchlists.`);

            if (userWatchlists.length === 0) {
                const defaultWatchlistRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/watchlists/${getDefaultWatchlistId(currentUserId)}`);
                await window.firestore.setDoc(defaultWatchlistRef, { name: DEFAULT_WATCHLIST_NAME, createdAt: new Date().toISOString() });
                userWatchlists.push({ id: getDefaultWatchlistId(currentUserId), name: DEFAULT_WATCHLIST_NAME });
                console.log("[Watchlist] Created default watchlist.");
            }
            userWatchlists.sort((a, b) => a.name.localeCompare(b.name));

            const userProfileSnap = await window.firestore.getDoc(userProfileDocRef);
            let lastSelectedWatchlistId = null;
            if (userProfileSnap.exists()) {
                lastSelectedWatchlistId = userProfileSnap.data().lastSelectedWatchlistId;
                console.log(`[Watchlist] Found last selected watchlist in profile: ${lastSelectedWatchlistId}`);
            }

            let targetWatchlist = null;
            if (lastSelectedWatchlistId) { targetWatchlist = userWatchlists.find(w => w.id === lastSelectedWatchlistId); }
            if (!targetWatchlist) { targetWatchlist = userWatchlists.find(w => w.name === DEFAULT_WATCHLIST_NAME); }
            if (!targetWatchlist && userWatchlists.length > 0) { targetWatchlist = userWatchlists[0]; }

            if (targetWatchlist) {
                currentWatchlistId = targetWatchlist.id;
                currentWatchlistName = targetWatchlist.name;
                console.log(`[Watchlist] Setting current watchlist to: '${currentWatchlistName}' (ID: ${currentWatchlistId})`);
            } else {
                currentWatchlistId = null;
                currentWatchlistName = 'No Watchlist Selected';
                console.log("[Watchlist] No watchlists available. Current watchlist set to null.");
            }

            renderWatchlistSelect();
            renderSortSelect();
            updateMainButtonsState(true);

            const migratedSomething = await migrateOldSharesToWatchlist();
            if (!migratedSomething) {
                console.log("[Watchlist] No old shares to migrate/update, directly loading shares for current watchlist.");
                await loadShares();
            }

        } catch (error) {
            console.error("[Watchlist] Error loading user watchlists:", error);
            showCustomAlert("Error loading watchlists: " + error.message);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // Load shares from Firestore
    async function loadShares() {
        if (!db || !currentUserId || !currentWatchlistId || !window.firestore) {
            console.warn("[Shares] Firestore DB, User ID, Watchlist ID, or Firestore functions not available for loading shares. Clearing list.");
            clearShareList();
            return;
        }
        if (loadingIndicator) loadingIndicator.style.display = 'block';
        allSharesData = [];
        try {
            const sharesCol = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            const q = window.firestore.query( sharesCol, window.firestore.where("watchlistId", "==", currentWatchlistId) );
            console.log(`[Shares] Attempting to load shares for watchlist ID: ${currentWatchlistId} (Name: ${currentWatchlistName})`);
            const querySnapshot = await window.firestore.getDocs(q);
            querySnapshot.forEach((doc) => {
                const share = { id: doc.id, ...doc.data() };
                allSharesData.push(share);
            });
            console.log(`[Shares] Shares loaded successfully for watchlist: '${currentWatchlistName}' (ID: ${currentWatchlistId}). Total shares: ${allSharesData.length}`);
            console.log("[Shares] All shares data (after load):", allSharesData);
            sortShares();
            renderAsxCodeButtons();
        } catch (error) {
            console.error("[Shares] Error loading shares:", error);
            showCustomAlert("Error loading shares: " + error.message);
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // One-time migration function for old shares
    async function migrateOldSharesToWatchlist() {
        if (!db || !currentUserId || !window.firestore) {
            console.warn("[Migration] Firestore DB, User ID, or Firestore functions not available for migration.");
            return false;
        }
        const sharesCol = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
        const q = window.firestore.query(sharesCol);
        let sharesToUpdate = [];
        let anyMigrationPerformed = false;
        try {
            console.log("[Migration] Checking for old shares to migrate/update schema and data types...");
            const querySnapshot = await window.firestore.getDocs(q);
            querySnapshot.forEach(doc => {
                const shareData = doc.data();
                let updatePayload = {};
                let needsUpdate = false;
                if (!shareData.hasOwnProperty('watchlistId')) {
                    needsUpdate = true;
                    updatePayload.watchlistId = getDefaultWatchlistId(currentUserId);
                    console.log(`[Migration] Share '${doc.id}' missing watchlistId. Assigning to default.`);
                }
                if ((!shareData.shareName || String(shareData.shareName).trim() === '') && shareData.hasOwnProperty('name') && String(shareData.name).trim() !== '') {
                    needsUpdate = true;
                    updatePayload.shareName = String(shareData.name).trim();
                    updatePayload.name = window.firestore.deleteField();
                    console.log(`[Migration] Share '${doc.id}' missing 'shareName' but has 'name' ('${shareData.name}'). Migrating 'name' to 'shareName'.`);
                }
                const fieldsToConvert = ['currentPrice', 'targetPrice', 'dividendAmount', 'frankingCredits', 'entryPrice', 'lastFetchedPrice', 'previousFetchedPrice'];
                fieldsToConvert.forEach(field => {
                    const value = shareData[field];
                    const originalValueType = typeof value;
                    let parsedValue = value;
                    if (originalValueType === 'string' && value.trim() !== '') {
                        parsedValue = parseFloat(value);
                        if (!isNaN(parsedValue)) {
                            if (originalValueType !== typeof parsedValue || value !== String(parsedValue)) {
                                needsUpdate = true;
                                updatePayload[field] = parsedValue;
                                console.log(`[Migration] Share '${doc.id}': Converted ${field} from string '${value}' (type ${originalValueType}) to number ${parsedValue}.`);
                            }
                        } else {
                            needsUpdate = true;
                            updatePayload[field] = null;
                            console.warn(`[Migration] Share '${doc.id}': Field '${field}' was invalid string '${value}', setting to null.`);
                        }
                    } else if (originalValueType === 'number' && isNaN(value)) {
                        needsUpdate = true;
                        updatePayload[field] = null;
                        console.warn(`[Migration] Share '${doc.id}': Field '${field}' was NaN number, setting to null.`);
                    }
                    if (field === 'frankingCredits' && typeof parsedValue === 'number' && !isNaN(parsedValue)) {
                        if (parsedValue > 0 && parsedValue < 1) {
                            needsUpdate = true;
                            updatePayload.frankingCredits = parsedValue * 100;
                            console.log(`[Migration] Share '${doc.id}': Converted frankingCredits from decimal ${parsedValue} to percentage ${parsedValue * 100}.`);
                        }
                    }
                });
                const effectiveCurrentPrice = (typeof updatePayload.currentPrice === 'number' && !isNaN(updatePayload.currentPrice)) ? updatePayload.currentPrice :
                                              ((typeof shareData.currentPrice === 'string' ? parseFloat(shareData.currentPrice) : shareData.currentPrice) || null);
                if (!shareData.hasOwnProperty('lastFetchedPrice') || (typeof shareData.lastFetchedPrice === 'string' && isNaN(parseFloat(shareData.lastFetchedPrice)))) {
                    needsUpdate = true;
                    updatePayload.lastFetchedPrice = effectiveCurrentPrice;
                    console.log(`[Migration] Share '${doc.id}': Setting missing lastFetchedPrice to ${effectiveCurrentPrice}.`);
                }
                if (!shareData.hasOwnProperty('previousFetchedPrice') || (typeof shareData.previousFetchedPrice === 'string' && isNaN(parseFloat(shareData.previousFetchedPrice)))) {
                    needsUpdate = true;
                    updatePayload.previousFetchedPrice = effectiveCurrentPrice;
                    console.log(`[Migration] Share '${doc.id}': Setting missing previousFetchedPrice to ${effectiveCurrentPrice}.`);
                }
                if (!shareData.hasOwnProperty('lastPriceUpdateTime')) {
                    needsUpdate = true;
                    updatePayload.lastPriceUpdateTime = new Date().toISOString();
                    console.log(`[Migration] Share '${doc.id}': Setting missing lastPriceUpdateTime.`);
                }
                if (typeof shareData.comments === 'string' && shareData.comments.trim() !== '') {
                    try {
                        const parsedComments = JSON.parse(shareData.comments);
                        if (Array.isArray(parsedComments)) {
                            needsUpdate = true;
                            updatePayload.comments = parsedComments;
                            console.log(`[Migration] Share '${doc.id}': Converted comments string to array.`);
                        }
                    } catch (e) {
                        needsUpdate = true;
                        updatePayload.comments = [{ title: "General Comments", text: shareData.comments }];
                        console.log(`[Migration] Share '${doc.id}': Wrapped comments string as single comment object.`);
                    }
                }
                if (needsUpdate) { sharesToUpdate.push({ ref: doc.ref, data: updatePayload }); }
            });
            if (sharesToUpdate.length > 0) {
                console.log(`[Migration] Performing consolidated update for ${sharesToUpdate.length} shares.`);
                for (const item of sharesToUpdate) { await window.firestore.updateDoc(item.ref, item.data); }
                showCustomAlert(`Migrated/Updated ${sharesToUpdate.length} old shares.`, 2000);
                console.log("[Migration] Migration complete. Reloading shares.");
                await loadShares();
                anyMigrationPerformed = true;
            } else {
                console.log("[Migration] No old shares found requiring migration or schema update.");
            }
            return anyMigrationPerformed;
        } catch (error) {
            console.error("[Migration] Error during migration/schema update:", error);
            showCustomAlert("Error during data migration: " + error.message);
            return false;
        }
    }


    // --- UI Element References (Declared here after core functions, but before initial setup uses them) ---
    const mainTitle = document.getElementById('mainTitle');
    // Unified button IDs (no Desktop/Mobile suffix in JS)
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
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsFormContainer = document.getElementById('commentsFormContainer');
    const addCommentSectionBtn = document.getElementById('addCommentSectionBtn');
    const shareTableBody = document.querySelector('#shareTable tbody');
    const mobileShareCardsContainer = document.getElementById('mobileShareCards');
    const loadingIndicator = document.getElementById('loadingIndicator');
    const googleAuthBtn = document.getElementById('googleAuthBtn');
    const shareDetailModal = document.getElementById('shareDetailModal');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPriceDetailed = document.getElementById('modalCurrentPriceDetailed');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalCommentsContainer = document.getElementById('modalCommentsContainer');
    const modalUnfrankedYieldSpan = document.getElementById('modalUnfrankedYield');
    const modalFrankedYieldSpan = document.getElementById('modalFrankedYield');
    const editShareFromDetailBtn = document.getElementById('editShareFromDetailBtn');
    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal');
    const calcCloseButton = document.querySelector('.calc-close-button');
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYieldSpan = document.getElementById('calcUnfrankedYield');
    const calcFrankedYieldSpan = document.getElementById('calcFrankedYield');
    const investmentValueSelect = document.getElementById('investmentValueSelect');
    const calcEstimatedDividend = document.getElementById('calcEstimatedDividend');
    const sortSelect = document.getElementById('sortSelect');
    const customDialogModal = document.getElementById('customDialogModal');
    const customDialogMessage = document.getElementById('customDialogMessage');
    const customDialogConfirmBtn = document.getElementById('customDialogConfirmBtn');
    const customDialogCancelBtn = document.getElementById('customDialogCancelBtn');
    const calculatorModal = document.getElementById('calculatorModal');
    const calculatorInput = document.getElementById('calculatorInput');
    const calculatorResult = document.getElementById('calculatorResult');
    const calculatorButtons = document.querySelector('.calculator-buttons');
    const watchlistSelect = document.getElementById('watchlistSelect');
    const themeToggleBtn = document.getElementById('themeToggleBtn'); // Unified ID
    const scrollToTopBtn = document.getElementById('scrollToTopBtn');
    const hamburgerBtn = document.getElementById('hamburgerBtn');
    const appSidebar = document.getElementById('appSidebar'); // Renamed from mobileMenu
    const closeMenuBtn = document.getElementById('closeMenuBtn');
    // Ensure sidebarOverlay is correctly referenced or created if not already in HTML
    let sidebarOverlay = document.querySelector('.sidebar-overlay');
    if (!sidebarOverlay) { // Create if it doesn't exist
        sidebarOverlay = document.createElement('div');
        sidebarOverlay.classList.add('sidebar-overlay');
        document.body.appendChild(sidebarOverlay);
    }

    // Array of all form input elements for easy iteration and form clearing (excluding dynamic comments)
    const formInputs = [
        shareNameInput, currentPriceInput, targetPriceInput,
        dividendAmountInput, frankingCreditsInput
    ];

    // --- State Variables (Declared here) ---
    let db;
    let auth = null;
    let currentUserId = null;
    let currentAppId;
    let selectedShareDocId = null;
    let allSharesData = [];
    let currentDialogCallback = null;
    let autoDismissTimeout = null;
    let lastTapTime = 0;
    let tapTimeout;
    let selectedElementForTap = null;
    let longPressTimer;
    const LONG_PRESS_THRESHOLD = 500;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TOUCH_MOVE_THRESHOLD = 10;
    const KANGA_EMAIL = 'iamkanga@gmail.com';
    let currentCalculatorInput = '';
    let operator = null;
    let previousCalculatorInput = '';
    let resultDisplayed = false;
    const DEFAULT_WATCHLIST_NAME = 'My Watchlist';
    const DEFAULT_WATCHLIST_ID_SUFFIX = 'default';
    let userWatchlists = [];
    let currentWatchlistId = null;
    let currentWatchlistName = '';


    // --- Initial UI Setup (Now after all element references and core functions) ---
    if (shareFormSection) shareFormSection.style.setProperty('display', 'none', 'important');
    if (dividendCalculatorModal) dividendCalculatorModal.style.setProperty('display', 'none', 'important');
    if (shareDetailModal) shareDetailModal.style.setProperty('display', 'none', 'important');
    if (customDialogModal) customDialogModal.style.setProperty('display', 'none', 'important');
    if (calculatorModal) calculatorModal.style.setProperty('display', 'none', 'important');
    updateMainButtonsState(false);
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (watchlistSelect) watchlistSelect.disabled = true;
    if (googleAuthBtn) googleAuthBtn.disabled = true;
    applySavedTheme(); // Applies theme and updates themeToggleBtn text


    // --- PWA Service Worker Registration ---
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('./service-worker.js', { scope: './' }) 
                .then(registration => {
                    console.log('Service Worker (v9) from script.js: Registered with scope:', registration.scope); 
                })
                .catch(error => {
                    console.error('Service Worker (v9) from script.js: Registration failed:', error);
                });
        });
    }

    // --- Event Listeners for Input Fields ---
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() { this.value = this.value.toUpperCase(); });
    }
    formInputs.forEach((input, index) => {
        if (input) {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (index === formInputs.length - 1) {
                        const currentCommentInputs = commentsFormContainer.querySelector('.comment-title-input');
                        if (currentCommentInputs) { currentCommentInputs.focus(); }
                        else if (saveShareBtn) { saveShareBtn.click(); }
                    } else {
                        if (formInputs[index + 1]) formInputs[index + 1].focus();
                    }
                }
            });
        }
    });

    // --- Event Listeners for Modal Close Buttons ---
    document.querySelectorAll('.close-button').forEach(button => { button.addEventListener('click', closeModals); });

    // --- Event Listener for Clicking Outside Modals ---
    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal || event.target === dividendCalculatorModal ||
            event.target === shareFormSection || event.target === customDialogModal ||
            event.target === calculatorModal) {
            closeModals();
        }
    });

    // --- Firebase Initialization and Authentication State Listener ---
    // Ensure window.firestoreDb, window.firebaseAuth, window.getFirebaseAppId are set by the module script first.
    db = window.firestoreDb;
    auth = window.firebaseAuth;
    currentAppId = window.getFirebaseAppId();

    if (auth && window.firestore) { // Ensure auth and firestore are initialized via the module script
        if (googleAuthBtn) {
            googleAuthBtn.disabled = false;
            console.log("[Auth] Google Auth button enabled.");
        }
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                updateAuthButtonText(true, user.email || user.displayName);
                console.log("[AuthState] User signed in:", user.uid);
                if (user.email && user.email.toLowerCase() === KANGA_EMAIL) {
                    mainTitle.textContent = "Kangas ASX Share Watchlist";
                } else {
                    mainTitle.textContent = "My ASX Share Watchlist";
                }
                updateMainButtonsState(true);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                await loadUserWatchlists();
            } else {
                currentUserId = null;
                updateAuthButtonText(false);
                mainTitle.textContent = "My ASX Share Watchlist";
                console.log("[AuthState] User signed out.");
                updateMainButtonsState(false);
                clearShareList();
                clearWatchlistUI();
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });
    } else {
        console.error("[Firebase] Firebase Auth or Firestore functions not available. Cannot set up auth state listener or proceed with data loading.");
        updateMainButtonsState(false); // Corrected function call here
        if (googleAuthBtn) googleAuthBtn.disabled = true; // Disable auth button if firebase not ready
        if (loadingIndicator) loadingIndicator.style.display = 'none';
        // Display the error message from index.html if it's not already visible
        const errorDiv = document.getElementById('firebaseInitError');
        if (errorDiv) errorDiv.style.display = 'block';
    }


    // --- Authentication Functions Event Listener ---
    if (googleAuthBtn) {
        googleAuthBtn.addEventListener('click', async () => {
            console.log("[Auth] Google Auth Button Clicked.");
            const currentAuth = window.firebaseAuth;
            if (!currentAuth || !window.authFunctions) {
                console.warn("[Auth] Auth service not ready or functions not loaded. Cannot process click. Is button still disabled?");
                showCustomAlert("Authentication service not ready. Please try again in a moment.");
                return;
            }
            if (currentAuth.currentUser) {
                console.log("[Auth] Current user exists, attempting sign out.");
                try {
                    await window.authFunctions.signOut(currentAuth);
                    console.log("[Auth] User signed out.");
                } catch (error) {
                    console.error("[Auth] Sign-Out failed:", error);
                    showCustomAlert("Sign-Out failed: " + error.message);
                }
            } else {
                console.log("[Auth] No current user, attempting sign in.");
                try {
                    const provider = window.authFunctions.GoogleAuthProviderInstance;
                    if (!provider) {
                        console.error("[Auth] GoogleAuthProvider instance not found. Is Firebase module script loaded?");
                        showCustomAlert("Authentication service not ready. Please ensure Firebase module script is loaded.");
                        return;
                    }
                    await window.authFunctions.signInWithPopup(currentAuth, provider);
                    console.log("[Auth] Google Sign-In successful.");
                }
                catch (error) {
                    console.error("[Auth] Google Sign-In failed:", error.message);
                    showCustomAlert("Google Sign-In failed: " + error.message);
                }
            }
        });
    }

    // --- Event Listener for Watchlist Dropdown ---
    if (watchlistSelect) {
        watchlistSelect.addEventListener('change', async () => {
            currentWatchlistId = watchlistSelect.value;
            const selectedWatchlistObj = userWatchlists.find(w => w.id === currentWatchlistId);
            if (selectedWatchlistObj) {
                currentWatchlistName = selectedWatchlistObj.name;
                console.log(`[Watchlist Change] User selected: '${currentWatchlistName}' (ID: ${currentWatchlistId})`);
                await saveLastSelectedWatchlistId(currentWatchlistId);
                await loadShares();
            }
        });
    }

    // --- Event Listener for Sort Dropdown ---
    if (sortSelect) {
        sortSelect.addEventListener('change', sortShares);
    }

    // --- Share Form Functions (Add/Edit) Event Listeners ---
    if (newShareBtn) {
        newShareBtn.addEventListener('click', () => {
            clearForm();
            formTitle.textContent = 'Add New Share';
            deleteShareFromFormBtn.style.display = 'none';
            showModal(shareFormSection);
            shareNameInput.focus();
            // Close sidebar when opening a modal/form
            toggleAppSidebar(false); 
        });
    }

    if (saveShareBtn) {
        saveShareBtn.addEventListener('click', async () => {
            const shareName = shareNameInput.value.trim().toUpperCase();
            if (!shareName) { showCustomAlert("ASX Code is required!"); return; }

            const currentPrice = parseFloat(currentPriceInput.value);
            const targetPrice = parseFloat(targetPriceInput.value);
            const dividendAmount = parseFloat(dividendAmountInput.value);
            const frankingCredits = parseFloat(frankingCreditsInput.value);

            const comments = [];
            commentsFormContainer.querySelectorAll('.comment-section').forEach(section => {
                const titleInput = section.querySelector('.comment-title-input');
                const textInput = section.querySelector('.comment-text-input');
                if (titleInput.value.trim() || textInput.value.trim()) {
                    comments.push({ title: titleInput.value.trim(), text: textInput.value.trim() });
                }
            });

            const shareData = {
                shareName: shareName,
                currentPrice: isNaN(currentPrice) ? null : currentPrice,
                targetPrice: isNaN(targetPrice) ? null : targetPrice,
                dividendAmount: isNaN(dividendAmount) ? null : dividendAmount,
                frankingCredits: isNaN(frankingCredits) ? null : frankingCredits,
                comments: comments,
                userId: currentUserId,
                watchlistId: currentWatchlistId,
                lastPriceUpdateTime: new Date().toISOString()
            };

            if (selectedShareDocId) {
                const existingShare = allSharesData.find(s => s.id === selectedShareDocId);
                if (existingShare) { shareData.previousFetchedPrice = existingShare.lastFetchedPrice; }
                else { shareData.previousFetchedPrice = shareData.currentPrice; }
                shareData.lastFetchedPrice = shareData.currentPrice;

                try {
                    const shareDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, selectedShareDocId);
                    await window.firestore.updateDoc(shareDocRef, shareData);
                    showCustomAlert(`Share '${shareName}' updated successfully!`, 1500);
                    console.log(`[Firestore] Share '${shareName}' (ID: ${selectedShareDocId}) updated.`);
                } catch (error) {
                    console.error("[Firestore] Error updating share:", error);
                    showCustomAlert("Error updating share: " + error.message);
                }
            } else {
                shareData.entryDate = new Date().toISOString();
                shareData.lastFetchedPrice = shareData.currentPrice;
                shareData.previousFetchedPrice = shareData.currentPrice;

                try {
                    const sharesColRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
                    const newDocRef = await window.firestore.addDoc(sharesColRef, shareData);
                    selectedShareDocId = newDocRef.id;
                    showCustomAlert(`Share '${shareName}' added successfully!`, 1500);
                    console.log(`[Firestore] Share '${shareName}' added with ID: ${newDocRef.id}`);
                } catch (error) {
                    console.error("[Firestore] Error adding share:", error);
                    showCustomAlert("Error adding share: " + error.message);
                }
            }
            await loadShares();
            closeModals();
        });
    }

    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', () => { clearForm(); hideModal(shareFormSection); console.log("[Form] Form canceled."); });
    }

    if (deleteShareFromFormBtn) {
        deleteShareFromFormBtn.addEventListener('click', () => {
            if (selectedShareDocId) {
                showCustomConfirm("Are you sure you want to delete this share? This action cannot be undone.", async () => {
                    try {
                        const shareDocRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, selectedShareDocId);
                        await window.firestore.deleteDoc(shareDocRef);
                        showCustomAlert("Share deleted successfully!", 1500);
                        console.log(`[Firestore] Share (ID: ${selectedShareDocId}) deleted.`);
                        closeModals();
                        await loadShares();
                    } catch (error) {
                        console.error("[Firestore] Error deleting share:", error);
                        showCustomAlert("Error deleting share: " + error.message);
                    }
                });
            } else { showCustomAlert("No share selected for deletion."); }
        });
    }

    if (addCommentSectionBtn) {
        addCommentSectionBtn.addEventListener('click', () => addCommentSection());
    }

    // --- Share Detail Modal Functions Event Listeners ---
    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', () => {
            showShareDetails();
            // Close sidebar when opening a modal/form
            toggleAppSidebar(false);
        });
    }

    if (editShareFromDetailBtn) {
        editShareFromDetailBtn.addEventListener('click', () => {
            hideModal(shareDetailModal);
            showEditFormForSelectedShare();
        });
    }

    // --- Dividend Calculator Functions Event Listeners ---
    if (dividendCalcBtn) {
        dividendCalcBtn.addEventListener('click', () => {
            console.log("[UI] Dividend button clicked. Attempting to open modal.");
            calcDividendAmountInput.value = ''; calcCurrentPriceInput.value = ''; calcFrankingCreditsInput.value = '';
            calcUnfrankedYieldSpan.textContent = '-'; calcFrankedYieldSpan.textContent = '-'; calcEstimatedDividend.textContent = '-';
            investmentValueSelect.value = '10000';
            showModal(dividendCalculatorModal);
            calcDividendAmountInput.focus();
            console.log("[UI] Dividend Calculator modal opened.");
            // Close sidebar when opening a modal/form
            toggleAppSidebar(false);
        });
    }

    [calcDividendAmountInput, calcCurrentPriceInput, calcFrankingCreditsInput, investmentValueSelect].forEach(input => {
        if (input) {
            input.addEventListener('input', updateDividendCalculations);
            input.addEventListener('change', updateDividendCalculations);
        }
    });

    function updateDividendCalculations() {
        const dividendAmount = parseFloat(calcDividendAmountInput.value);
        const currentPrice = parseFloat(calcCurrentPriceInput.value);
        const frankingCredits = parseFloat(calcFrankingCreditsInput.value);
        const investmentValue = parseFloat(investmentValueSelect.value);
        const unfrankedYield = calculateUnfrankedYield(dividendAmount, currentPrice);
        const frankedYield = calculateFrankedYield(dividendAmount, currentPrice, frankingCredits);
        const estimatedDividend = estimateDividendIncome(investmentValue, dividendAmount, currentPrice);
        calcUnfrankedYieldSpan.textContent = unfrankedYield !== null ? `${unfrankedYield.toFixed(2)}%` : '-';
        calcFrankedYieldSpan.textContent = frankedYield !== null ? `${frankedYield.toFixed(2)}%` : '-';
        calcEstimatedDividend.textContent = estimatedDividend !== null ? `$${estimatedDividend.toFixed(2)}` : '-';
    }

    // --- Standard Calculator Functions Event Listeners ---
    if (standardCalcBtn) {
        standardCalcBtn.addEventListener('click', () => {
            resetCalculator();
            showModal(calculatorModal);
            console.log("[UI] Standard Calculator modal opened.");
            // Close sidebar when opening a modal/form
            toggleAppSidebar(false);
        });
    }

    if (calculatorButtons) {
        calculatorButtons.addEventListener('click', (event) => {
            const target = event.target;
            if (!target.classList.contains('calc-btn')) { return; }
            const value = target.dataset.value;
            const action = target.dataset.action;
            if (value) { appendNumber(value); }
            else if (action) { handleAction(action); }
        });
    }

    function appendNumber(num) {
        if (resultDisplayed) { currentCalculatorInput = num; resultDisplayed = false; }
        else { if (num === '.' && currentCalculatorInput.includes('.')) return; currentCalculatorInput += num; }
        updateCalculatorDisplay();
    }

    function handleAction(action) {
        if (action === 'clear') { resetCalculator(); return; }
        if (action === 'percentage') { if (currentCalculatorInput === '') return; currentCalculatorInput = (parseFloat(currentCalculatorInput) / 100).toString(); updateCalculatorDisplay(); return; }
        if (['add', 'subtract', 'multiply', 'divide'].includes(action)) {
            if (currentCalculatorInput === '' && previousCalculatorInput === '') return;
            if (currentCalculatorInput !== '') {
                if (previousCalculatorInput !== '') { calculateResult(); previousCalculatorInput = calculatorResult.textContent; }
                else { previousCalculatorInput = currentCalculatorInput; }
            }
            operator = action; currentCalculatorInput = ''; resultDisplayed = false; updateCalculatorDisplay(); return;
        }
        if (action === 'calculate') {
            if (previousCalculatorInput === '' || currentCalculatorInput === '' || operator === null) { return; }
            calculateResult(); operator = null; resultDisplayed = true;
        }
    }

    // --- Theme Toggling Logic Event Listener ---
    if (themeToggleBtn) { // This is the unified theme toggle button
        themeToggleBtn.addEventListener('click', toggleTheme);
    }

    // Listen for system theme changes (if no explicit saved theme is set)
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', event => {
        // Only react to system changes if no explicit theme is saved by the user
        if (!localStorage.getItem('theme')) {
            if (event.matches) {
                document.body.classList.add('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-sun"></i> Toggle Theme';
                localStorage.setItem('theme', 'dark'); // Save system preference
            } else {
                document.body.classList.remove('dark-theme');
                if (themeToggleBtn) themeToggleBtn.innerHTML = '<i class="fas fa-moon"></i> Toggle Theme';
                localStorage.setItem('theme', 'light'); // Save system preference
            }
            console.log("[Theme] System theme preference changed and applied.");
        }
    });

    // --- Scroll-to-Top Button Logic ---
    if (scrollToTopBtn) {
        window.addEventListener('scroll', () => {
            // Only show on mobile devices (or smaller screens as defined by CSS media query breakpoint)
            // Using window.innerWidth to check screen size for mobile responsiveness
            if (window.innerWidth <= 768) { // Assuming 768px as the breakpoint for mobile layout
                if (window.scrollY > 200) { // Show after scrolling down 200px
                    scrollToTopBtn.style.display = 'flex'; // Use flex to center arrow
                    scrollToTopBtn.style.opacity = '1';
                } else {
                    scrollToTopBtn.style.opacity = '0';
                    setTimeout(() => { // Hide completely after fade out
                        scrollToTopBtn.style.display = 'none';
                    }, 300); // Match CSS transition duration
                }
            } else {
                // Ensure it's hidden on desktop
                scrollToTopBtn.style.display = 'none';
            }
        });
        // Initial check for desktop to hide it immediately if window is resized or loaded on desktop
        if (window.innerWidth > 768) {
            scrollToTopBtn.style.display = 'none';
        }
        scrollToTopBtn.addEventListener('click', () => { window.scrollTo({ top: 0, behavior: 'smooth' }); console.log("[UI] Scrolled to top."); });
    }

    // --- Hamburger/Sidebar Menu Logic Event Listeners ---
    if (hamburgerBtn && appSidebar && closeMenuBtn && sidebarOverlay) {
        hamburgerBtn.addEventListener('click', () => toggleAppSidebar()); // No force, just toggle
        closeMenuBtn.addEventListener('click', () => toggleAppSidebar(false)); // Force close
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
