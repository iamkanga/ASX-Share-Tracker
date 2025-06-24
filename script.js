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

    const displayUserNameSpan = document.getElementById('displayUserName'); // Span to display user name/email in footer
    const loadingIndicator = document.getElementById('loadingIndicator');

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

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

    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal');
    const calcCloseButton = document.querySelector('.calc-close-button');
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYieldSpan = document.getElementById('calcUnfrankedYield');
    const calcFrankedYieldSpan = document.getElementById('calcFrankedYield');
    const investmentValueSelect = document.getElementById('investmentValueSelect'); // New dropdown for investment value
    const calcEstimatedDividend = document.getElementById('calcEstimatedDividend'); // New display for estimated dividend

    // New references for collapsible auth buttons in footer (mobile only)
    const authCollapsibleContainer = document.getElementById('authCollapsibleContainer');
    const authToggleTab = document.getElementById('authToggleTab');


    const sortSelect = document.getElementById('sortSelect'); // New sort dropdown

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


    // --- Initial UI Setup ---
    shareFormSection.style.display = 'none';
    dividendCalculatorModal.style.display = 'none';
    updateMainButtonsState(false);
    if (loadingIndicator) loadingIndicator.style.display = 'block';

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
                        // If it's the last standard input, focus on comments or save
                        const currentCommentInputs = commentsFormContainer.querySelector('.comment-title-input');
                        if (currentCommentInputs) { // Check if any comment inputs exist
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
            if (modal) { // Added null check for safety
                modal.style.display = 'none';
            }
        });
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
        if (event.target === shareDetailModal && shareDetailModal) {
            shareDetailModal.style.display = 'none';
        }
        if (event.target === dividendCalculatorModal && dividendCalculatorModal) {
            dividendCalculatorModal.style.display = 'none';
        }
        if (event.target === shareFormSection && shareFormSection) {
            shareFormSection.style.display = 'none';
        }
    });

    // --- Firebase Initialization and Authentication State Listener ---
    window.addEventListener('firebaseServicesReady', async () => {
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        currentAppId = window.getFirebaseAppId();

        // Firebase Auth state observer with persistence
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                displayUserNameSpan.textContent = user.email || user.displayName || 'Anonymous User';

                // Main title logic based on user email
                if (user.email && user.email.toLowerCase() === KANGA_EMAIL) {
                    mainTitle.textContent = "Kangas ASX Share Watchlist";
                } else {
                    mainTitle.textContent = "My ASX Share Watchlist";
                }
                console.log("User signed in:", user.uid);
                updateAuthButtons(true);
                updateMainButtonsState(true);
                if (loadingIndicator) loadingIndicator.style.display = 'none';
                await loadShares();
            } else {
                currentUserId = null;
                displayUserNameSpan.textContent = 'Not Signed In';
                mainTitle.textContent = "My ASX Share Watchlist"; // Default for not signed in
                console.log("User signed out.");
                updateAuthButtons(false);
                updateMainButtonsState(false);
                clearShareList();
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            }
        });

        // Attempt anonymous sign-in only if no user is currently signed in
        if (!auth.currentUser) {
            try {
                await window.authFunctions.signInAnonymously(auth);
                console.log("Attempted anonymous sign-in.");
            } catch (error) {
                console.error("Anonymous sign-in failed:", error);
            }
        }
    });

    // --- Authentication Functions ---
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                const provider = window.authFunctions.GoogleAuthProviderInstance;
                if (!provider) {
                    console.error("GoogleAuthProvider instance not found.");
                    alert("Authentication service not ready. Please try again.");
                    return;
                }

                if (auth.currentUser && auth.currentUser.isAnonymous) {
                    try {
                        const result = await auth.currentUser.linkWithPopup(provider);
                        console.log("Anonymous account linked with Google:", result.user);
                    } catch (error) {
                        if (error.code === 'auth/credential-already-in-use') {
                            console.warn("Credential already in use, signing in with Google account instead.");
                            await window.authFunctions.signInWithPopup(auth, provider);
                        } else {
                            console.error("Error linking anonymous account with Google:", error);
                            alert("Failed to link account: " + error.message);
                        }
                    }
                } else {
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("Google Sign-In successful.");
                }
            }
            catch (error) {
                console.error("Google Sign-In/Link failed:", error.message);
                alert("Google Sign-In/Link failed: " + error.message);
            }
        });
    }

    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                await window.authFunctions.signOut(auth);
                console.log("User signed out from Google.");
            } catch (error) {
                console.error("Google Sign-Out failed:", error);
                alert("Google Sign-Out failed: " + error.message);
            }
        });
    }

    // --- Utility Functions for UI State Management ---
    function updateAuthButtons(isSignedIn) {
        if (googleSignInBtn) googleSignInBtn.style.display = isSignedIn ? 'none' : 'block';
        if (googleSignOutBtn) googleSignOutBtn.style.display = isSignedIn ? 'block' : 'none';
    }

    function updateMainButtonsState(enable) {
        if (newShareBtn) newShareBtn.disabled = !enable;
        if (viewDetailsBtn) viewDetailsBtn.disabled = !enable;
        if (standardCalcBtn) standardCalcBtn.disabled = !enable;
        if (dividendCalcBtn) dividendCalcBtn.disabled = !enable;
    }

    function showModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'flex';
            modalElement.scrollTop = 0;
        }
    }

    function hideModal(modalElement) {
        if (modalElement) {
            modalElement.style.display = 'none';
        }
    }

    // --- Date Formatting Helper Functions (Australian Style) ---
    function formatDate(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    }

    function formatDateTime(dateString) {
        if (!dateString) return 'N/A';
        const date = new Date(dateString);
        return date.toLocaleDateString('en-AU', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false // 24-hour format
        });
    }

    // --- Share Data Management Functions ---
    async function loadShares() {
        if (!db || !currentUserId) {
            console.warn("Firestore DB or User ID not available for loading shares.");
            clearShareList();
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'block';
        allSharesData = []; // Clear previous data from the array

        try {
            const sharesCol = window.firestore.collection(db, 'shares');
            const q = window.firestore.query(sharesCol, window.firestore.where("userId", "==", currentUserId));
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                const share = { id: doc.id, ...doc.data() };
                allSharesData.push(share);
            });
            console.log("Shares loaded successfully.");

            sortShares(); // This will also call renderWatchlist()
            renderAsxCodeButtons(); // Render ASX Code buttons
        } catch (error) {
            console.error("Error loading shares:", error);
            console.error("If you see 'Missing or insufficient permissions' here, check your Firestore Security Rules and your data's 'userId' field for consistency.");
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        }
    }

    // Function to re-render the watchlist (table and cards) after sorting or other changes
    function renderWatchlist() {
        clearShareListUI();
        allSharesData.forEach((share) => {
            addShareToTable(share);
            addShareToMobileCards(share);
        });
        if (selectedShareDocId) {
             selectShare(selectedShareDocId);
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
        selectedShareDocId = null;
        if (viewDetailsBtn) viewDetailsBtn.disabled = true;
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
            if (field === 'lastFetchedPrice' || field === 'dividendAmount' || field === 'currentPrice') {
                valA = (valA === null || valA === undefined) ? (order === 'asc' ? Infinity : -Infinity) : valA;
                valB = (valB === null || valB === undefined) ? (order === 'asc' ? Infinity : -Infinity) : valB;
            } else if (field === 'shareName') { // String comparison
                 valA = valA || ''; // Treat null/undefined as empty string
                 valB = valB || '';
                 return order === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
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

        row.insertCell().textContent = share.shareName;

        const priceCell = row.insertCell();
        const priceDisplayDiv = document.createElement('div');
        priceDisplayDiv.className = 'current-price-display';

        const priceValueSpan = document.createElement('span');
        priceValueSpan.className = 'price';
        // Use lastFetchedPrice and previousFetchedPrice if available for color coding
        priceValueSpan.textContent = share.lastFetchedPrice ? `$${share.lastFetchedPrice.toFixed(2)}` : 'N/A';

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

        // Date display for current price
        const dateSpan = document.createElement('span');
        dateSpan.className = 'date';
        dateSpan.textContent = `(${formatDate(share.lastPriceUpdateTime)})`;
        priceDisplayDiv.appendChild(dateSpan);
        priceCell.appendChild(priceDisplayDiv);


        row.insertCell().textContent = share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : 'N/A';

        const dividendCell = row.insertCell();
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.lastFetchedPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.lastFetchedPrice, share.frankingCredits);
        dividendCell.innerHTML = `Div: $${share.dividendAmount ? share.dividendAmount.toFixed(2) : 'N/A'}<br>
                                  Unyield: ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A'}<br>
                                  FrYield: ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A'}`;

        const commentsCell = row.insertCell();
        // Display only the first comment section's text, truncated for watchlist
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsCell.textContent = share.comments[0].text;
            // Truncation CSS handled by style.css for comments column
        } else {
            commentsCell.textContent = 'No comments';
        }

        // Add event listeners for row selection (click)
        row.addEventListener('dblclick', function() {
            const docId = this.dataset.docId;
            selectShare(docId, this);
            showShareDetails();
        });

        row.addEventListener('click', function(event) {
            const docId = this.dataset.docId;
            selectShare(docId, this);
        });
    }

    function addShareToMobileCards(share) {
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

        let commentsSummary = 'No comments';
        if (share.comments && Array.isArray(share.comments) && share.comments.length > 0 && share.comments[0].text) {
            commentsSummary = share.comments[0].text;
        }

        card.innerHTML = `
            <h3>${share.shareName}</h3>
            <p><strong>Entered:</strong> ${formatDate(share.entryDate)}</p>
            <p><strong>Current:</strong> <span class="${priceClass}">$${share.lastFetchedPrice ? share.lastFetchedPrice.toFixed(2) : 'N/A'}</span> (${formatDate(share.lastPriceUpdateTime)})</p>
            <p><strong>Target:</strong> ${share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : 'N/A'}</p>
            <p><strong>Dividend:</strong> $${share.dividendAmount ? share.dividendAmount.toFixed(2) : 'N/A'}</p>
            <p><strong>Franking:</strong> ${share.frankingCredits ? share.frankingCredits + '%' : 'N/A'}</p>
            <p><strong>Unfranked Yield:</strong> ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A'}</p>
            <p><strong>Franked Yield:</strong> ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A'}</p>
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
        if (viewDetailsBtn) viewDetailsBtn.disabled = false;
    }


    // --- Form Modal Functions (Add/Edit Share) ---
    function showShareForm(isEdit = false) {
        if (!shareFormSection) return;
        clearForm();
        deleteShareFromFormBtn.disabled = !isEdit;
        formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share';
        showModal(shareFormSection);

        if (!isEdit) {
            addCommentSection();
        }
    }

    function clearForm() {
        selectedShareDocId = null;
        formInputs.forEach(input => {
            if (input) input.value = '';
        });
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = '';
        // Clear all dynamically added comment input groups
        commentsFormContainer.querySelectorAll('.comment-input-group').forEach(group => group.remove());
    }

    function populateForm(share) {
        if (!share) return;
        shareNameInput.value = share.shareName || '';
        currentPriceInput.value = share.currentPrice || '';
        targetPriceInput.value = share.targetPrice || '';
        dividendAmountInput.value = share.dividendAmount || '';
        frankingCreditsInput.value = share.frankingCredits || '';
        document.getElementById('editDocId').value = share.id || '';

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
    }

    function handleCancelForm() {
        clearForm();
        hideModal(shareFormSection);
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
        if (!db || !currentUserId) {
            alert("User not signed in. Please sign in to save shares.");
            return;
        }

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
            alert("Share Name (ASX Code) is required.");
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
            lastPriceUpdateTime: now // Timestamp of this manual update
        };

        try {
            if (docId) {
                const shareDocRef = window.firestore.doc(db, 'shares', docId);
                await window.firestore.updateDoc(shareDocRef, shareData);
                console.log("Share updated:", docId);
                alert("Share updated successfully!");
            } else {
                const sharesColRef = window.firestore.collection(db, 'shares');
                await window.firestore.addDoc(sharesColRef, shareData);
                console.log("Share added.");
                alert("Share added successfully!");
            }
            hideModal(shareFormSection);
            await loadShares();
        } catch (error) {
            console.error("Error saving share:", error);
            alert("Error saving share: " + error.message);
        }
    }

    async function deleteShare() {
        if (!selectedShareDocId || !db || !currentUserId) {
            alert("No share selected for deletion or user not signed in.");
            return;
        }

        if (!confirm("Are you sure you want to delete this share?")) {
            return;
        }

        try {
            const shareDocRef = window.firestore.doc(db, 'shares', selectedShareDocId);
            await window.firestore.deleteDoc(shareDocRef);
            console.log("Share deleted:", selectedShareDocId);
            alert("Share deleted successfully!");
            hideModal(shareFormSection);
            await loadShares();
        } catch (error) {
            console.error("Error deleting share:", error);
            alert("Error deleting share: " + error.message);
        }
    }

    // --- Display Share Detail Modal ---
    function showShareDetails() {
        if (!selectedShareDocId) {
            alert("Please select a share to view details.");
            return;
        }

        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);

        if (selectedShare) {
            modalShareName.textContent = selectedShare.shareName || 'N/A';
            modalEntryDate.textContent = formatDate(selectedShare.entryDate);

            const currentPriceVal = selectedShare.lastFetchedPrice;
            const prevPriceVal = selectedShare.previousFetchedPrice;
            let priceText = currentPriceVal ? `$${currentPriceVal.toFixed(2)}` : 'N/A';
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
                changeText = '(No previous price for comparison)';
                changeClass = 'price-no-change';
            }

            modalCurrentPriceDetailed.innerHTML = `
                <span class="price-value ${changeClass}">${priceText}</span>
                <span class="price-change ${changeClass}">${changeText}</span><br>
                <span class="last-updated-date">Last Updated: ${formatDateTime(selectedShare.lastPriceUpdateTime)}</span>
            `;


            modalTargetPrice.textContent = selectedShare.targetPrice ? `$${selectedShare.targetPrice.toFixed(2)}` : 'N/A';
            modalDividendAmount.textContent = selectedShare.dividendAmount ? `$${selectedShare.dividendAmount.toFixed(2)}` : 'N/A';
            modalFrankingCredits.textContent = selectedShare.frankingCredits ? `${selectedShare.frankingCredits}%` : 'N/A';

            const unfrankedYield = calculateUnfrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice);
            const frankedYield = calculateFrankedYield(selectedShare.dividendAmount, selectedShare.lastFetchedPrice, selectedShare.frankingCredits);

            modalUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A';
            modalFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A';

            // Render structured comments in the modal (full text)
            renderModalComments(selectedShare.comments);

            showModal(shareDetailModal);
        } else {
            alert("Selected share data not found.");
        }
    }

    // Renders structured comments in the detail modal (full text)
    function renderModalComments(commentsArray) {
        modalCommentsContainer.innerHTML = '<h3>Detailed Comments</h3>'; // Reset container and add title

        if (commentsArray && Array.isArray(commentsArray) && commentsArray.length > 0) {
            commentsArray.forEach(commentSection => {
                const sectionDiv = document.createElement('div');
                sectionDiv.className = 'comment-section';

                const sectionTitle = document.createElement('h4');
                sectionTitle.textContent = commentSection.title || 'Untitled Section';

                const sectionText = document.createElement('p');
                sectionText.textContent = commentSection.text || 'No content for this section.';
                // Use white-space: pre-wrap for multiline comments from CSS

                sectionDiv.appendChild(sectionTitle);
                sectionDiv.appendChild(sectionText);
                modalCommentsContainer.appendChild(sectionDiv);
            });
        } else {
            const noComments = document.createElement('p');
            noComments.textContent = 'No detailed comments available.';
            noComments.style.fontStyle = 'italic';
            noComments.style.color = '#777';
            modalCommentsContainer.appendChild(noComments);
        }
    }

    function showEditFormForSelectedShare() {
        if (!selectedShareDocId) {
            alert("Please select a share to edit.");
            return;
        }

        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        if (selectedShare) {
            populateForm(selectedShare);
            showShareForm(true);
        } else {
            alert("Selected share data not found for editing.");
        }
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

        calcUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A';
        calcFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A';
        calcEstimatedDividend.textContent = estimatedDividend !== null ? `$${estimatedDividend.toFixed(2)}` : 'N/A';
    }

    if (calcDividendAmountInput) calcDividendAmountInput.addEventListener('input', updateDividendCalculations);
    if (calcCurrentPriceInput) calcCurrentPriceInput.addEventListener('input', updateDividendCalculations);
    if (calcFrankingCreditsInput) calcFrankingCreditsInput.addEventListener('input', updateDividendCalculations);
    if (investmentValueSelect) investmentValueSelect.addEventListener('change', updateDividendCalculations);

    // --- Main Application Button Event Listeners ---
    if (newShareBtn) {
        newShareBtn.addEventListener('click', () => showShareForm(false));
    }

    if (viewDetailsBtn) {
        viewDetailsBtn.addEventListener('click', showShareDetails);
    }

    if (saveShareBtn) {
        saveShareBtn.addEventListener('click', saveShare);
    }

    if (deleteShareFromFormBtn) {
        deleteShareFromFormBtn.addEventListener('click', deleteShare);
    }

    if (standardCalcBtn) {
        standardCalcBtn.addEventListener('click', () => {
            // Attempt to open native calculator app using a common URL scheme.
            // Note: Support for these schemes varies across browsers and operating systems.
            // On some platforms (like desktop browsers), this might do nothing or trigger a browser warning.
            // For Android, 'calc://' or 'calculator://' are common but not guaranteed to work on all devices/browsers.
            window.open('calc://');
        });
    }

    if (dividendCalcBtn) {
        dividendCalcBtn.addEventListener('click', () => {
            if (calcDividendAmountInput) calcDividendAmountInput.value = '';
            if (calcCurrentPriceInput) calcCurrentPriceInput.value = '';
            if (calcFrankingCreditsInput) calcFrankingCreditsInput.value = '';
            if (investmentValueSelect) investmentValueSelect.value = '10000';
            updateDividendCalculations();
            showModal(dividendCalculatorModal);
        });
    }

    // --- Function to Populate and Update the ASX Code Buttons (above watchlist) ---
    function renderAsxCodeButtons() {
        if (!asxCodeButtonsContainer) return;
        asxCodeButtonsContainer.innerHTML = ''; // Clear any existing buttons

        if (allSharesData.length === 0) {
            const noSharesMsg = document.createElement('div');
            noSharesMsg.textContent = 'Add your first share to the watchlist!';
            noSharesMsg.style.padding = '5px 15px';
            noSharesMsg.style.textAlign = 'center';
            noSharesMsg.style.color = '#555';
            noSharesMsg.style.fontSize = '0.9em';
            asxCodeButtonsContainer.appendChild(noSharesMsg);
            return;
        }

        // Sort shares by ASX code for the buttons
        const sortedShares = [...allSharesData].sort((a, b) => {
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

    // --- Collapsible Auth Buttons Logic (Mobile Only) ---
    if (authToggleTab && authCollapsibleContainer) {
        authToggleTab.addEventListener('click', () => {
            // Check if it's a mobile viewport (based on your CSS media query breakpoint)
            // A simple check could be window.innerWidth <= 768 or check for the CSS class 'mobile-share-cards'
            // For a robust solution, consider matching the CSS breakpoint in JS or using matchMedia.
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            if (isMobile) {
                authCollapsibleContainer.classList.toggle('expanded');
                authCollapsibleContainer.classList.toggle('collapsed');
            }
        });

        // Set initial state based on mobile detection
        const setInitialAuthPanelState = () => {
            const isMobile = window.matchMedia("(max-width: 768px)").matches;
            if (isMobile) {
                authCollapsibleContainer.classList.add('collapsed');
                authCollapsibleContainer.classList.remove('expanded');
                authToggleTab.style.display = 'block'; // Ensure tab is visible on mobile
            } else {
                authCollapsibleContainer.classList.remove('collapsed');
                authCollapsibleContainer.classList.add('expanded'); // Always expanded on desktop
                authToggleTab.style.display = 'none'; // Hide tab on desktop
            }
        };

        setInitialAuthPanelState(); // Set state on load
        window.addEventListener('resize', setInitialAuthPanelState); // Adjust on resize
    }
});
