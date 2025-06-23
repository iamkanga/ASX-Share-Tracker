// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseUserId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    const newShareBtn = document.getElementById('newShareBtn');
    const editShareBtn = document.getElementById('editShareBtn');
    const deleteShareBtn = document.getElementById('deleteShareBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
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
    const displayUserIdSpan = document.getElementById('displayUserId');
    const displayUserNameSpan = document.getElementById('displayUserName');
    const loadingIndicator = document.getElementById('loadingIndicator');

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

    const shareDetailModal = document.getElementById('shareDetailModal');
    const closeButton = document.querySelector('.close-button');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPrice = document.getElementById('modalCurrentPrice');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalComments = document.getElementById('modalComments');

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
    let selectedShareDocId = null; // Stores the Firestore doc ID of the currently selected share
    let allSharesData = []; // Cache all loaded shares, keyed by doc.id, for quick access
    let longPressTimer;
    const LONG_PRESS_THRESHOLD = 500; // milliseconds for long-press detection
    let isLongPress = false; // Flag to differentiate tap from long-press

    // --- Initial UI Setup ---
    shareFormSection.classList.add('hidden'); // Hide the form on load
    updateMainButtonsState(false); // Disable edit/delete/view buttons initially
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (shareDetailModal) shareDetailModal.style.display = 'none'; // Ensure modal is hidden on load

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

    if (closeButton) {
        closeButton.addEventListener('click', () => {
            if (shareDetailModal) shareDetailModal.style.display = 'none';
        });
    }

    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal && shareDetailModal) {
            shareDetailModal.style.display = 'none';
        }
    });

    // Main action buttons
    if (newShareBtn) newShareBtn.addEventListener('click', handleAddNewShare);
    if (editShareBtn) editShareBtn.addEventListener('click', handleEditSelectedShare);
    if (deleteShareBtn) deleteShareBtn.addEventListener('click', handleDeleteSelectedShare);
    if (viewDetailsBtn) viewDetailsBtn.addEventListener('click', handleViewSelectedShare);

    // Form action buttons
    if (saveShareBtn) saveShareBtn.addEventListener('click', handleSaveShare);
    if (cancelFormBtn) cancelFormBtn.addEventListener('click', handleCancelForm);

    // Google Sign-in/Sign-out buttons
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
                if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                
                if (newShareBtn) newShareBtn.disabled = false;
                formInputs.forEach(input => { if(input) input.disabled = false; });
                
                console.log("User authenticated. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");
                await loadShares();

            } else {
                if (!auth.currentUser) {
                    currentUserId = null;
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in.";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                    if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                    if (newShareBtn) newShareBtn.disabled = true;
                    updateMainButtonsState(false);
                    formInputs.forEach(input => { if(input) input.disabled = true; });
                    if (shareTableBody) shareTableBody.innerHTML = '';

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


    // --- UI Logic Functions ---

    function showForm(isEdit = false, shareData = {}) {
        if (shareFormSection) shareFormSection.classList.remove('hidden');
        if (formTitle) formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share';
        
        clearForm(); 

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

    if (shareTableBody) {
        // Single-click (desktop) / Tap (mobile) to select row
        shareTableBody.addEventListener('click', function(event) {
            // Prevent click from firing if a long-press just completed
            if (window.isLongPressHandled) {
                window.isLongPressHandled = false; // Reset flag
                return;
            }
            
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                const currentSelected = shareTableBody.querySelector('tr.selected');
                if (currentSelected && currentSelected !== row) {
                    currentSelected.classList.remove('selected');
                }
                
                row.classList.toggle('selected');

                if (row.classList.contains('selected')) {
                    selectedShareDocId = row.dataset.docId;
                    updateMainButtonsState(true);
                } else {
                    selectedShareDocId = null;
                    updateMainButtonsState(false);
                }
            }
        });

        // Double-click (desktop) to edit
        shareTableBody.addEventListener('dblclick', function(event) {
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                selectedShareDocId = row.dataset.docId; // Ensure it's selected for edit
                handleEditSelectedShare();
            }
        });

        // Long-press (mobile) to edit
        shareTableBody.addEventListener('touchstart', function(event) {
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                // Prevent default touch behavior (like scrolling) for a short duration
                // event.preventDefault(); // Might interfere with proper scrolling
                isLongPress = false; // Reset flag for new touch
                clearTimeout(longPressTimer); // Clear any existing timer
                longPressTimer = setTimeout(() => {
                    isLongPress = true; // Mark as long press
                    selectedShareDocId = row.dataset.docId;
                    // Visually select the row if not already selected
                    const currentSelected = shareTableBody.querySelector('tr.selected');
                    if (currentSelected && currentSelected !== row) {
                        currentSelected.classList.remove('selected');
                    }
                    if (!row.classList.contains('selected')) {
                        row.classList.add('selected');
                    }
                    updateMainButtonsState(true); // Enable buttons
                    handleEditSelectedShare(); // Trigger edit
                    window.isLongPressHandled = true; // Set flag to prevent subsequent click
                }, LONG_PRESS_THRESHOLD);
            }
        });

        shareTableBody.addEventListener('touchend', function(event) {
            clearTimeout(longPressTimer);
            // The click listener will handle short taps if isLongPress is false
        });

        shareTableBody.addEventListener('touchcancel', function(event) {
            clearTimeout(longPressTimer);
            isLongPress = false;
        });
    }
    
    async function handleAddNewShare() {
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
            alert("Please sign in with Google to add shares permanently for syncing.");
            return;
        }
        selectedShareDocId = null;
        const currentSelected = shareTableBody.querySelector('tr.selected');
        if (currentSelected) currentSelected.classList.remove('selected');
        updateMainButtonsState(false);
        showForm(false);
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
            } catch (e) {
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
        const currentSelected = shareTableBody.querySelector('tr.selected');
        if (currentSelected) currentSelected.classList.remove('selected');
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

    // Calculates dividend yield as a percentage
    function calculateDividendYield(dividendAmount, currentPrice) {
        const div = parseFloat(dividendAmount);
        const price = parseFloat(currentPrice);
        if (isNaN(div) || isNaN(price) || price === 0) {
            return 'N/A';
        }
        return ((div / price) * 100).toFixed(2) + '%';
    }

    // Displays a single share in the table row
    function displayShare(share, docId) {
        const row = shareTableBody.insertRow();
        row.setAttribute('data-doc-id', docId);

        let cellIndex = 0;
        row.insertCell(cellIndex++).textContent = share.name;
        row.insertCell(cellIndex++).textContent = share.entryDate || 'N/A'; // Entry Date column
        row.insertCell(cellIndex++).textContent = share.currentPrice ? `$${share.currentPrice}` : '';
        row.insertCell(cellIndex++).textContent = share.targetPrice ? `$${share.targetPrice}` : '';

        // Dividend Yield column
        const dividendYieldCell = row.insertCell(cellIndex++);
        dividendYieldCell.textContent = calculateDividendYield(share.dividendAmount, share.currentPrice);

        // Truncate comments for main display
        const commentsCell = row.insertCell(cellIndex++);
        const maxCommentLength = 50; // Max characters before truncation
        commentsCell.textContent = share.comments.length > maxCommentLength ?
                                   share.comments.substring(0, maxCommentLength) + '...' :
                                   share.comments;
    }

    async function loadShares() {
        if (!db || !currentUserId || !window.firestore || !auth) {
            console.log("Firestore or Auth not fully initialized or userId not available. Skipping loadShares.");
            return;
        }

        if (shareTableBody) shareTableBody.innerHTML = '';
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

    function viewShareDetails(share) {
        if (modalShareName) modalShareName.textContent = share.name;
        if (modalEntryDate) modalEntryDate.textContent = share.entryDate;
        if (modalCurrentPrice) modalCurrentPrice.textContent = share.currentPrice ? `$${share.currentPrice}` : 'N/A';
        if (modalTargetPrice) modalTargetPrice.textContent = share.targetPrice ? `$${share.targetPrice}` : 'N/A';
        if (modalDividendAmount) modalDividendAmount.textContent = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        if (modalFrankingCredits) modalFrankingCredits.textContent = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        
        // Add Dividend Yield to modal details
        const yieldText = calculateDividendYield(share.dividendAmount, share.currentPrice);
        let modalYieldParagraph = document.getElementById('modalDividendYield');
        if (!modalYieldParagraph) {
            modalYieldParagraph = document.createElement('p');
            modalYieldParagraph.id = 'modalDividendYield';
            if (modalFrankingCredits && modalFrankingCredits.parentElement) {
                modalFrankingCredits.parentElement.after(modalYieldParagraph);
            } else {
                shareDetailModal.querySelector('.modal-content').appendChild(modalYieldParagraph);
            }
        }
        modalYieldParagraph.innerHTML = `<strong>Dividend Yield:</strong> ${yieldText}`;

        if (modalComments) modalComments.textContent = share.comments || 'No comments.';

        if (shareDetailModal) shareDetailModal.style.display = 'flex';
    }

    function clearForm() {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = '';
    }
});
