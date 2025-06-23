// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseUserId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    const mainTitle = document.getElementById('mainTitle'); // Added for dynamic title change
    const newShareBtn = document.getElementById('newShareBtn');
    const editShareBtn = document.getElementById('editShareBtn');
    const deleteShareBtn = document.getElementById('deleteShareBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const standardCalcBtn = document.getElementById('standardCalcBtn');
    const dividendCalcBtn = document.getElementById('dividendCalcBtn');
    const quickViewSharesBtn = document.getElementById('quickViewSharesBtn');
    const quickViewDropdown = document.getElementById('quickViewDropdown');
    const dropdownSharesList = document.querySelector('.dropdown-shares-list');

    const shareFormSection = document.getElementById('shareFormSection');
    const formTitle = document.getElementById('formTitle');
    const saveShareBtn = document.getElementById('saveShareBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');

    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsInput = document.getElementById('comments');
    const shareTableBody = document.querySelector('#shareTable tbody');
    const mobileShareCardsContainer = document.getElementById('mobileShareCards');
    const displayUserIdSpan = document.getElementById('displayUserId');
    const displayUserNameSpan = document.getElementById('displayUserName');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const closeButton = document.querySelector('.close-button'); // For share detail modal
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPrice = document.getElementById('modalCurrentPrice');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalComments = document.getElementById('modalComments');
    const modalUnfrankedYieldSpan = document.getElementById('modalUnfrankedYield');
    const modalFrankedYieldSpan = document.getElementById('modalFrankedYield');

    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal');
    const calcCloseButton = document.querySelector('.calc-close-button');
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYieldSpan = document.getElementById('calcUnfrankedYield');
    const calcFrankedYieldSpan = document.getElementById('calcFrankedYield');

    const standardCalculatorModal = document.getElementById('standardCalculatorModal');
    const standardCalcCloseButton = document.querySelector('.standard-calc-close-button');
    const standardCalcDisplay = document.getElementById('standardCalcDisplay');
    const standardCalcButtons = document.querySelectorAll('#standardCalculatorModal .calc-btn, #standardCalculatorModal .op, #standardCalculatorModal .eq');


    // Array of all form input elements for easy iteration
    const formInputs = [
        shareNameInput, currentPriceInput, targetPriceInput,
        dividendAmountInput, frankingCreditsInput, commentsInput
    ];

    // --- State Variables ---
    let db;
    let auth;
    let currentUserId;
    let currentAppId;
    let selectedShareDocId = null;
    let allSharesData = [];
    let longPressTimer;
    const LONG_PRESS_THRESHOLD = 500; // milliseconds for mobile long-press
    const KANGA_EMAIL = 'iamkanga@gmail.com'; // Specific email for "Kangas" title

    // --- Android Touch Detection Variables ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TOUCH_MOVE_THRESHOLD = 10; // Pixels to distinguish tap from scroll

    // --- Standard Calculator State ---
    let currentInput = '0';
    let operator = null;
    let previousInput = '';
    let resetDisplay = false;


    // --- Initial UI Setup ---
    shareFormSection.classList.add('hidden');
    quickViewDropdown.classList.add('hidden');
    standardCalculatorModal.style.display = 'none';
    dividendCalculatorModal.style.display = 'none';
    updateMainButtonsState(false);
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // --- Event Listeners ---
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
                        if (saveShareBtn) saveShareBtn.click();
                    } else {
                        if (formInputs[index + 1]) formInputs[index + 1].focus();
                    }
                }
            });
        }
    });

    // Close buttons for modals
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (shareDetailModal) shareDetailModal.style.display = 'none';
        });
    }
    if (calcCloseButton) {
        calcCloseButton.addEventListener('click', () => {
            if (dividendCalculatorModal) dividendCalculatorModal.style.display = 'none';
        });
    }
    if (standardCalcCloseButton) {
        standardCalcCloseButton.addEventListener('click', () => {
            if (standardCalculatorModal) standardCalculatorModal.style.display = 'none';
        });
    }

    // Close modals/dropdown if user clicks outside
    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal && shareDetailModal) {
            shareDetailModal.style.display = 'none';
        }
        if (event.target === dividendCalculatorModal && dividendCalculatorModal) {
            dividendCalculatorModal.style.display = 'none';
        }
        if (event.target === standardCalculatorModal && standardCalculatorModal) {
            standardCalculatorModal.style.display = 'none';
        }
        // Close Quick View dropdown if clicked outside
        if (quickViewDropdown && !quickViewSharesBtn.contains(event.target) && !quickViewDropdown.contains(event.target)) {
            quickViewDropdown.classList.add('hidden');
        }
    });

    // Main action buttons
    if (newShareBtn) newShareBtn.addEventListener('click', handleAddNewShare);
    if (editShareBtn) editShareBtn.addEventListener('click', handleEditSelectedShare);
    if (deleteShareBtn) deleteShareBtn.addEventListener('click', handleDeleteSelectedShare);
    if (viewDetailsBtn) viewDetailsBtn.addEventListener('click', handleViewSelectedShare);

    // New Calculator & Quick View Shares buttons in header
    if (standardCalcBtn) standardCalcBtn.addEventListener('click', openStandardCalculatorModal);
    if (dividendCalcBtn) dividendCalcBtn.addEventListener('click', openDividendCalculatorModal);
    if (quickViewSharesBtn) {
        quickViewSharesBtn.addEventListener('click', function(event) {
            event.stopPropagation(); // Prevent document click from closing it immediately
            quickViewDropdown.classList.toggle('hidden');
            if (!quickViewDropdown.classList.contains('hidden')) {
                populateSharesDropdown(); // Populate dropdown when opening
            }
        });
    }

    // Form action buttons
    if (saveShareBtn) saveShareBtn.addEventListener('click', handleSaveShare);
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', handleCancelForm);

    // Dividend Calculator input changes for live calculation
    if (calcDividendAmountInput) calcDividendAmountInput.addEventListener('input', calculateAndDisplayCalcYields);
    if (calcCurrentPriceInput) calcCurrentPriceInput.addEventListener('input', calculateAndDisplayCalcYields);
    if (calcFrankingCreditsInput) calcFrankingCreditsInput.addEventListener('input', calculateAndDisplayCalcYields);

    // Standard Calculator button clicks
    standardCalcButtons.forEach(button => {
        button.addEventListener('click', (e) => handleStandardCalcButtonClick(e.target.dataset.value));
    });


    // Google Sign-in/Sign-out buttons (now in fixed footer)
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                const provider = new window.authFunctions.GoogleAuthProvider();
                const currentUser = window.firebaseAuth.currentUser;

                provider.setCustomParameters({'redirect_uri': 'https://iamkanga.github.io/ASX-Share-Tracker/__/auth/handler'});

                if (currentUser && currentUser.isAnonymous) {
                    await window.authFunctions.linkWithPopup(currentUser, provider);
                    console.log("Anonymous account linked with Google.");
                } else {
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("Signed in with Google.");
                }
            } catch (error) {
                console.error("Google Sign-in failed:", error.code, error.message);
                if (error.code === 'auth/popup-closed-by-user') {
                    alert("Sign-in pop-up was closed. Please try again.");
                } else if (error.code === 'auth/cancelled-popup-request') {
                    alert("Sign-in already in progress or pop-up blocked. Please try again.");
                } else if (error.code === 'auth/account-exists-with-different-credential') {
                     alert("This email is already associated with another sign-in method. Please use that method or link accounts.");
                } else {
                    alert("Failed to sign in with Google. Please check your browser's pop-up settings and try again.");
                }
            }
        });
    }

    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                if (!auth) { console.error("Firebase Auth not initialized."); return; }
                await window.authFunctions.signOut(auth);
                console.log("Signed out.");
                clearForm();
            } catch (error) {
                console.error("Sign-out failed:", error);
                alert("Failed to sign out. Please try again.");
            }
        });
    }


    // Listen for Firebase Services to be ready from index.html
    window.addEventListener('firebaseServicesReady', () => {
        auth = window.firebaseAuth;
        db = window.firestoreDb;
        currentAppId = window.getFirebaseAppId();

        if (!auth) {
            console.error("Firebase Auth not available after services ready.");
            return;
        }

        // Main Authentication State Change Listener
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId;
                if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email || 'Anonymous';
                
                if (googleSignInBtn) googleSignInBtn.style.visibility = 'hidden';
                if (googleSignOutBtn) googleSignOutBtn.style.visibility = 'visible';
                
                if (newShareBtn) newShareBtn.disabled = false;
                formInputs.forEach(input => { if(input) input.disabled = false; });
                
                console.log("User authenticated. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");
                
                // Dynamic title change
                if (mainTitle) {
                    mainTitle.textContent = (user.email === KANGA_EMAIL) ? 'Kangas ASX Share Watchlist' : 'ASX Share Watchlist';
                }

                await loadShares();

            } else {
                if (!auth.currentUser) {
                    currentUserId = null;
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in.";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                    
                    if (googleSignInBtn) googleSignInBtn.style.visibility = 'visible';
                    if (googleSignOutBtn) googleSignOutBtn.style.visibility = 'hidden';

                    if (newShareBtn) newShareBtn.disabled = true;
                    updateMainButtonsState(false);
                    formInputs.forEach(input => { if(input) input.disabled = true; });
                    if (shareTableBody) shareTableBody.innerHTML = '';
                    if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
                    if (dropdownSharesList) dropdownSharesList.innerHTML = ''; // Clear dropdown shares list

                    // Dynamic title change when signed out
                    if (mainTitle) {
                        mainTitle.textContent = 'ASX Share Watchlist';
                    }

                    try {
                        const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                        currentUserId = anonUserCredential.user.uid;
                        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                        if (newShareBtn) newShareBtn.disabled = false;
                        console.log("Signed in anonymously for temporary session. User ID:", currentUserId);
                        await loadShares();
                    } catch (anonError) {
                        console.error("Anonymous sign-in failed:", anonError);
                        if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                    }
                } else {
                    console.log("onAuthStateChanged: User is null, but auth.currentUser exists. Likely transition state.");
                }
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        });
    });


    function showForm(isEdit = false, shareData = {}) {
        if (shareFormSection) shareFormSection.classList.remove('hidden');
        if (formTitle) formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share';
        
        clearForm(true); // Pass true to ensure complete clear for new/edit form

        if (isEdit) {
            shareNameInput.value = shareData.name;
            currentPriceInput.value = shareData.currentPrice;
            targetPriceInput.value = shareData.targetPrice;
            dividendAmountInput.value = shareData.dividendAmount;
            frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ?
                                            parseFloat(shareData.frankingCredits) * 100 : '';
            commentsInput.value = shareData.comments;
            document.getElementById('editDocId').value = selectedShareDocId;
        } else {
            document.getElementById('editDocId').value = '';
        }
        if (shareNameInput) shareNameInput.focus();
    }

    function hideForm() {
        if (shareFormSection) shareFormSection.classList.add('hidden');
        clearForm();
    }

    function updateMainButtonsState(enable) {
        if (editShareBtn) editShareBtn.disabled = !enable;
        if (deleteShareBtn) deleteShareBtn.disabled = !enable;
        if (viewDetailsBtn) viewDetailsBtn.disabled = !enable;
    }

    // Function to handle row/card selection
    function handleSelection(element, docId) {
        const currentSelected = document.querySelector('tr.selected, .share-card.selected');
        if (currentSelected && currentSelected !== element) {
            currentSelected.classList.remove('selected');
        }
        
        element.classList.toggle('selected');

        if (element.classList.contains('selected')) {
            selectedShareDocId = docId;
            updateMainButtonsState(true);
        } else {
            selectedShareDocId = null;
            updateMainButtonsState(false);
        }
    }

    // --- Desktop Table Interactions ---
    if (shareTableBody) {
        shareTableBody.addEventListener('click', function(event) {
            if (touchMoved) return; // Ignore if touch was a scroll
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                handleSelection(row, row.dataset.docId);
            }
        });

        shareTableBody.addEventListener('dblclick', function(event) {
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                selectedShareDocId = row.dataset.docId;
                handleEditSelectedShare();
            }
        });
    }

    // --- Mobile Card Interactions (Refined to distinguish scroll from tap/long-press) ---
    if (mobileShareCardsContainer) {
        mobileShareCardsContainer.addEventListener('touchstart', function(event) {
            if (event.touches.length === 1) {
                touchStartX = event.touches[0].clientX;
                touchStartY = event.touches[0].clientY;
                touchMoved = false; // Reset for new interaction

                clearTimeout(longPressTimer);
                longPressTimer = setTimeout(() => {
                    let card = event.target.closest('.share-card');
                    if (card) {
                        selectedShareDocId = card.dataset.docId;
                        handleEditSelectedShare();
                    }
                    touchMoved = true; // Mark as handled by long-press, prevents tap/click
                }, LONG_PRESS_THRESHOLD);
            }
        }, { passive: true }); // Use passive: true to not block scrolling initially

        mobileShareCardsContainer.addEventListener('touchmove', function(event) {
            if (event.touches.length === 1) {
                const currentX = event.touches[0].clientX;
                const currentY = event.touches[0].clientY;
                const deltaX = Math.abs(currentX - touchStartX);
                const deltaY = Math.abs(currentY - touchStartY);

                if (deltaX > TOUCH_MOVE_THRESHOLD || deltaY > TOUCH_MOVE_THRESHOLD) {
                    touchMoved = true; // Significant movement, likely a scroll
                    clearTimeout(longPressTimer); // Cancel long-press timer
                }
            }
        }, { passive: true }); // Use passive: true

        mobileShareCardsContainer.addEventListener('touchend', function(event) {
            clearTimeout(longPressTimer); // Always clear timer on touchend

            if (!touchMoved) { // If it was not a scroll (within threshold)
                let card = event.target.closest('.share-card');
                if (card && mobileShareCardsContainer.contains(card)) {
                    // This is a tap
                    handleSelection(card, card.dataset.docId);
                }
            }
            // Reset state for next touch event
            touchMoved = false;
        });

        mobileShareCardsContainer.addEventListener('touchcancel', function(event) {
            clearTimeout(longPressTimer);
            touchMoved = false;
        });
    }
    
    async function handleAddNewShare() {
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
            alert("Please sign in with Google to add shares permanently for syncing.");
            return;
        }
        selectedShareDocId = null;
        const currentSelectedRow = shareTableBody.querySelector('tr.selected');
        if (currentSelectedRow) currentSelectedRow.classList.remove('selected');
        const currentSelectedCard = mobileShareCardsContainer.querySelector('.share-card.selected');
        if (currentSelectedCard) currentSelectedCard.classList.remove('selected');

        updateMainButtonsState(false);
        showForm(false);
        quickViewDropdown.classList.add('hidden'); // Dismiss dropdown
    }

    async function handleEditSelectedShare() {
        if (!selectedShareDocId) {
            alert("Please select a share from the watchlist to edit.");
            return;
        }
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
            alert("Please sign in with Google to edit shares permanently for syncing.");
            return;
        }
        const shareToEdit = allSharesData.find(share => share.id === selectedShareDocId);
        if (shareToEdit) {
            showForm(true, shareToEdit.data);
            quickViewDropdown.classList.add('hidden');
        } else {
            alert("Selected share not found. Please refresh and try again.");
            console.error("Edit error: shareToEdit not found for docId:", selectedShareDocId);
        }
    }

    async function handleDeleteSelectedShare() {
        if (!selectedShareDocId) {
            alert("Please select a share from the watchlist to delete.");
            return;
        }
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
            alert("Please sign in with Google to delete shares permanently.");
            return;
        }
        const shareToDelete = allSharesData.find(share => share.id === selectedShareDocId);
        if (shareToDelete && confirm(`Are you sure you want to delete ${shareToDelete.data.name}?`)) {
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, selectedShareDocId);
                await window.firestore.deleteDoc(docRef);
                console.log("Share deleted:", selectedShareDocId);
                selectedShareDocId = null;
                await loadShares();
                quickViewDropdown.classList.add('hidden');
            }
            catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again. Check console for details.");
            }
        } else if (!shareToDelete) {
             alert("Selected share not found. Please refresh and try again.");
             console.error("Delete error: shareToDelete not found for docId:", selectedShareDocId);
        }
    }

    async function handleViewSelectedShare() {
        if (!selectedShareDocId) {
            alert("Please select a share from the watchlist to view details.");
            return;
        }
        const shareToView = allSharesData.find(share => share.id === selectedShareDocId);
        if (shareToView) {
            viewShareDetails(shareToView.data);
            quickViewDropdown.classList.add('hidden');
        } else {
            alert("Selected share not found. Please refresh and try again.");
            console.error("View error: shareToView not found for docId:", selectedShareDocId);
        }
    }

    async function handleSaveShare() {
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
             return;
         }

        const editDocIdValue = document.getElementById('editDocId').value;
        if (editDocIdValue) {
            await updateShare(editDocIdValue);
        } else {
            await addShare();
        }
        hideForm();
        updateMainButtonsState(false);
        selectedShareDocId = null;
    }

    function handleCancelForm() {
        hideForm();
        updateMainButtonsState(false);
        selectedShareDocId = null;
        const currentSelectedRow = shareTableBody.querySelector('tr.selected');
        if (currentSelectedRow) currentSelectedRow.classList.remove('selected');
        const currentSelectedCard = mobileShareCardsContainer.querySelector('.share-card.selected');
        if (currentSelectedCard) currentSelectedCard.classList.remove('selected');
    }

    // --- Data Management Functions (Firebase) ---

    function processFrankingCreditsInput(inputValue) {
        let value = parseFloat(inputValue);
        if (isNaN(value)) { return ''; }
        return value > 1 ? value / 100 : value;
    }

    async function addShare() {
        const shareName = shareNameInput.value.trim();
        if (!shareName) { alert('Please enter a Share Name.'); return; }

        const shareData = {
            name: shareName,
            currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value,
            dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(),
            entryDate: new Date().toLocaleDateString('en-AU'),
            userId: currentUserId,
            appId: currentAppId
        };

        try {
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
            await loadShares();
            clearForm();
            console.log("Share added successfully.");
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add share. Please try again. Check console for details.");
        }
    }

    async function updateShare(docId) {
        if (!docId) { alert("No share selected for update."); return; }

        const shareData = {
            name: shareNameInput.value.trim(),
            currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value,
            dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(),
            entryDate: new Date().toLocaleDateString('en-AU')
        };

        try {
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
            await window.firestore.updateDoc(docRef, shareData);
            await loadShares();
            clearForm();
            console.log("Share updated successfully.");
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Please try again. Check console for details.");
        }
    }

    function calculateUnfrankedDividendYield(dividendAmount, currentPrice) {
        const div = parseFloat(dividendAmount);
        const price = parseFloat(currentPrice);
        if (isNaN(div) || isNaN(price) || price === 0) {
            return 'N/A';
        }
        return ((div / price) * 100).toFixed(2) + '%';
    }

    function calculateFrankedDividendYield(dividendAmount, currentPrice, frankingCredits) {
        const div = parseFloat(dividendAmount);
        const price = parseFloat(currentPrice);
        const franking = parseFloat(frankingCredits);
        const COMPANY_TAX_RATE = 0.30;

        if (isNaN(div) || isNaN(price) || price === 0 || isNaN(franking)) {
            return 'N/A';
        }

        const grossUpFactor = 1 + (franking * COMPANY_TAX_RATE / (1 - COMPANY_TAX_RATE));
        const grossedUpDividend = div * grossUpFactor;
        
        return ((grossedUpDividend / price) * 100).toFixed(2) + '%';
    }

    // --- Dividend Calculator Modal Logic ---
    function openDividendCalculatorModal() {
        if (dividendCalculatorModal) {
            dividendCalculatorModal.style.display = 'flex';
            if (calcDividendAmountInput) calcDividendAmountInput.value = '';
            if (calcCurrentPriceInput) calcCurrentPriceInput.value = '';
            if (calcFrankingCreditsInput) calcFrankingCreditsInput.value = '';
            if (calcUnfrankedYieldSpan) calcUnfrankedYieldSpan.textContent = 'N/A';
            if (calcFrankedYieldSpan) calcFrankedYieldSpan.textContent = 'N/A';
            if (calcDividendAmountInput) calcDividendAmountInput.focus();
        }
        quickViewDropdown.classList.add('hidden');
    }

    function calculateAndDisplayCalcYields() {
        const divAmount = calcDividendAmountInput ? calcDividendAmountInput.value : '';
        const currentPrice = calcCurrentPriceInput ? calcCurrentPriceInput.value : '';
        const frankingCredits = calcFrankingCreditsInput ? processFrankingCreditsInput(calcFrankingCreditsInput.value) : '';

        if (calcUnfrankedYieldSpan) {
            calcUnfrankedYieldSpan.textContent = calculateUnfrankedDividendYield(divAmount, currentPrice);
        }
        if (calcFrankedYieldSpan) {
            calcFrankedYieldSpan.textContent = calculateFrankedDividendYield(divAmount, currentPrice, frankingCredits);
        }
    }

    // --- Standard Calculator Modal Logic ---
    function openStandardCalculatorModal() {
        if (standardCalculatorModal) {
            standardCalculatorModal.style.display = 'flex';
            currentInput = '0';
            operator = null;
            previousInput = '';
            resetDisplay = false;
            standardCalcDisplay.value = currentInput;
        }
        quickViewDropdown.classList.add('hidden');
    }

    function handleStandardCalcButtonClick(value) {
        if (!standardCalcDisplay) return;

        if (value >= '0' && value <= '9' || value === '.') {
            if (standardCalcDisplay.value === '0' || resetDisplay) {
                standardCalcDisplay.value = value;
                resetDisplay = false;
            } else {
                // Prevent multiple decimals
                if (value === '.' && standardCalcDisplay.value.includes('.')) return;
                standardCalcDisplay.value += value;
            }
            currentInput = standardCalcDisplay.value;
        } else if (value === 'C') {
            currentInput = '0';
            operator = null;
            previousInput = '';
            standardCalcDisplay.value = '0';
            resetDisplay = false;
        } else if (value === '=') {
            if (operator && previousInput !== '') {
                try {
                    let result;
                    // Handle percentage if it's the last operation
                    if (operator === '%') {
                         result = parseFloat(previousInput) * (parseFloat(currentInput) / 100);
                    } else {
                        result = eval(previousInput + operator + currentInput); // Using eval for simplicity, note security risks in real production
                    }
                    standardCalcDisplay.value = result;
                    currentInput = result.toString();
                    previousInput = '';
                    operator = null;
                    resetDisplay = true;
                } catch (e) {
                    standardCalcDisplay.value = 'Error';
                    currentInput = '0';
                    previousInput = '';
                    operator = null;
                    resetDisplay = true;
                }
            }
        } else if (['+', '-', '*', '/'].includes(value)) { // Basic operators for chaining
            if (operator && previousInput !== '') {
                try {
                    let result = eval(previousInput + operator + currentInput);
                    previousInput = result.toString();
                    standardCalcDisplay.value = result;
                } catch (e) {
                    standardCalcDisplay.value = 'Error';
                    currentInput = '0';
                    previousInput = '';
                    operator = null;
                    resetDisplay = true;
                    return;
                }
            } else {
                previousInput = currentInput;
            }
            operator = value;
            resetDisplay = true;
        } else if (value === '%') { // Immediate percentage operation on current number
            try {
                const num = parseFloat(currentInput);
                if (!isNaN(num)) {
                    currentInput = (num / 100).toString();
                    standardCalcDisplay.value = currentInput;
                    resetDisplay = true;
                }
            } catch (e) {
                standardCalcDisplay.value = 'Error';
                resetDisplay = true;
            }
        } else if (['(', ')'].includes(value)) {
            // Simple handling for parentheses, append to current display
            if (resetDisplay) {
                standardCalcDisplay.value = value;
                resetDisplay = false;
            } else if (standardCalcDisplay.value === '0' && value === '(') { // Allow starting with (
                standardCalcDisplay.value = value;
            }
            else {
                standardCalcDisplay.value += value;
            }
            currentInput = standardCalcDisplay.value;
        }
    }


    function displayShare(share, docId) {
        // --- Table Row (Desktop View) ---
        const row = shareTableBody.insertRow();
        row.setAttribute('data-doc-id', docId);

        let cellIndex = 0;
        row.insertCell(cellIndex++).textContent = share.name;
        row.insertCell(cellIndex++).textContent = share.currentPrice ? `$${share.currentPrice}` : '';
        row.insertCell(cellIndex++).textContent = share.targetPrice ? `$${share.targetPrice}` : '';

        const combinedDivYieldsCell = row.insertCell(cellIndex++);
        const dividendAmountText = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        const frankingCreditsText = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        const unfrankedYieldText = calculateUnfrankedDividendYield(share.dividendAmount, share.currentPrice);
        const frankedYieldText = calculateFrankedDividendYield(share.dividendAmount, share.currentPrice, share.frankingCredits);
        
        combinedDivYieldsCell.innerHTML = `Div: ${dividendAmountText}<br>Frk: ${frankingCreditsText}<br>Unfrk Yld: ${unfrankedYieldText}<br>Frk Yld: ${frankedYieldText}`;

        const commentsCell = row.insertCell(cellIndex++);
        const maxCommentLength = 50;
        commentsCell.textContent = share.comments.length > maxCommentLength ?
                                   share.comments.substring(0, maxCommentLength) + '...' :
                                   share.comments;

        // --- Mobile Card View ---
        const card = document.createElement('div');
        card.classList.add('share-card');
        card.setAttribute('data-doc-id', docId);

        card.innerHTML = `
            <p><strong>ASX Code:</strong> ${share.name}</p>
            <p><strong>Current Price:</strong> ${share.currentPrice ? `$${share.currentPrice}` : 'N/A'}</p>
            <p><strong>Target Price:</strong> ${share.targetPrice ? `$${share.targetPrice}` : 'N/A'}</p>
            <p><strong>Dividend Amount:</strong> ${dividendAmountText}</p>
            <p><strong>Franking Credits:</strong> ${frankingCreditsText}</p>
            <p><strong>Unfranked Yield:</strong> ${unfrankedYieldText}</p>
            <p><strong>Franked Yield:</strong> ${frankedYieldText}</p>
            <p class="card-comments"><strong>Comments:</strong> ${commentsCell.textContent}</p>
        `;
        mobileShareCardsContainer.appendChild(card);
    }

    async function loadShares() {
        if (!db || !currentUserId || !window.firestore || !auth) {
            console.log("Firestore or Auth not fully initialized or userId not available. Skipping loadShares.");
            return;
        }

        if (shareTableBody) shareTableBody.innerHTML = '';
        if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
        if (dropdownSharesList) dropdownSharesList.innerHTML = '';
        allSharesData = [];

        try {
            const q = window.firestore.query(
                window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestore.where("userId", "==", currentUserId),
                window.firestore.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestore.getDocs(q);

            if (querySnapshot.empty && !auth.currentUser.isAnonymous && currentUserId) {
                console.log(`No shares found for persistent user ID: ${currentUserId}`);
            } else if (querySnapshot.empty && auth.currentUser.isAnonymous) {
                console.log(`No shares found for anonymous user ID: ${currentUserId}`);
            }

            querySnapshot.forEach((doc) => {
                const shareData = doc.data();
                displayShare(shareData, doc.id);
                allSharesData.push({ id: doc.id, data: shareData });
            });
            clearForm();
            updateMainButtonsState(false);
            selectedShareDocId = null;
            console.log("Shares loaded successfully.");

        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. Please check your internet connection and Firebase rules. Details in console.");
        }
    }

    // Populates the "Quick View Shares" dropdown with share names
    function populateSharesDropdown() {
        if (dropdownSharesList) {
            dropdownSharesList.innerHTML = '';

            const sortedShares = [...allSharesData].sort((a, b) => a.data.name.localeCompare(b.data.name));

            if (sortedShares.length === 0) {
                const noSharesMessage = document.createElement('p');
                noSharesMessage.textContent = 'No shares added yet.';
                noSharesMessage.style.padding = '10px 15px';
                noSharesMessage.style.textAlign = 'center';
                noSharesMessage.style.color = '#777';
                dropdownSharesList.appendChild(noSharesMessage);
            } else {
                sortedShares.forEach(share => {
                    const shareButton = document.createElement('button');
                    shareButton.textContent = share.data.name;
                    shareButton.setAttribute('data-doc-id', share.id);
                    shareButton.addEventListener('click', function() {
                        selectedShareDocId = share.id;
                        handleViewSelectedShare();
                        quickViewDropdown.classList.add('hidden'); // Close dropdown
                    });
                    dropdownSharesList.appendChild(shareButton);
                });
            }
        }
    }

    function viewShareDetails(share) {
        if (modalShareName) modalShareName.textContent = share.name;
        if (modalEntryDate) modalEntryDate.textContent = share.entryDate;
        if (modalCurrentPrice) modalCurrentPrice.textContent = share.currentPrice ? `$${share.currentPrice}` : 'N/A';
        if (modalTargetPrice) modalTargetPrice.textContent = share.targetPrice ? `$${share.targetPrice}` : 'N/A';
        
        if (modalDividendAmount) modalDividendAmount.textContent = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        if (modalFrankingCredits) modalFrankingCredits.textContent = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        
        if (modalUnfrankedYieldSpan) modalUnfrankedYieldSpan.textContent = calculateUnfrankedDividendYield(share.dividendAmount, share.currentPrice);
        if (modalFrankedYieldSpan) modalFrankedYieldSpan.textContent = calculateFrankedDividendYield(share.dividendAmount, share.currentPrice, share.frankingCredits);

        if (modalComments) modalComments.textContent = share.comments || 'No comments.';

        if (shareDetailModal) shareDetailModal.style.display = 'flex';
    }

    // Clears all input fields in the share form.
    // The `fullClear` parameter is used to decide if all fields should be cleared,
    // or if some (like editDocId) should be preserved if not explicitly for a new form.
    function clearForm(fullClear = false) {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';
        if (fullClear && document.getElementById('editDocId')) {
            document.getElementById('editDocId').value = '';
        }
    }
});
