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


    // --- Initial UI Setup ---
    shareFormSection.classList.add('hidden'); // Hide the form on load
    updateMainButtonsState(false); // Disable edit/delete/view buttons initially
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

    // Google Sign-in/Sign-out buttons (now in fixed footer)
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                const provider = new window.authFunctions.GoogleAuthProvider();
                const currentUser = window.firebaseAuth.currentUser;

                // Ensure redirect_uri is set on this provider instance
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
                // Specific error handling as before
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
                // After sign out, the onAuthStateChanged listener will handle re-authenticating anonymously
                // and updating the UI accordingly.
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
                
                // Enable newShareBtn (always), and other buttons if a share is selected (handled by selection logic)
                if (newShareBtn) newShareBtn.disabled = false;
                formInputs.forEach(input => { if(input) input.disabled = false; }); // Enable inputs
                
                console.log("User authenticated. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");
                await loadShares(); // Load shares for the current user

            } else {
                // User is signed out, or no persistent session found.
                // IMPORTANT: Only sign in anonymously if there is no current user at all.
                // This prevents re-signing anonymously if a Google sign-in is in progress or about to complete.
                if (!auth.currentUser) {
                    currentUserId = null; // Clear ID before anonymous sign-in attempt
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in.";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                    if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                    if (newShareBtn) newShareBtn.disabled = true; // Disable add button until auth fully resolved
                    updateMainButtonsState(false); // Disable all action buttons
                    formInputs.forEach(input => { if(input) input.disabled = true; }); // Disable inputs
                    if (shareTableBody) shareTableBody.innerHTML = ''; // Clear table when no user

                    try {
                        const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                        currentUserId = anonUserCredential.user.uid;
                        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                        if (newShareBtn) newShareBtn.disabled = false; // Enable add button once anonymous
                        console.log("Signed in anonymously for temporary session. User ID:", currentUserId);
                        await loadShares();
                    } catch (anonError) {
                        console.error("Anonymous sign-in failed:", anonError);
                        if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                    }
                } else {
                    // This else branch means onAuthStateChanged fired, but 'user' is null.
                    // This can happen during logout transitions. Keep UI as-is, don't re-sign-in anonymously.
                    console.log("onAuthStateChanged: User is null, but auth.currentUser exists. Likely transition state.");
                }
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
        });
    });


    // --- UI Logic Functions ---

    // Handles displaying/hiding the form for adding/editing
    function showForm(isEdit = false, shareData = {}) {
        if (shareFormSection) shareFormSection.classList.remove('hidden');
        if (formTitle) formTitle.textContent = isEdit ? 'Edit Share' : 'Add New Share';
        
        // Clear form first
        clearForm(); 

        if (isEdit) {
            shareNameInput.value = shareData.name;
            currentPriceInput.value = shareData.currentPrice;
            targetPriceInput.value = shareData.targetPrice;
            dividendAmountInput.value = shareData.dividendAmount;
            frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ?
                                            parseFloat(shareData.frankingCredits) * 100 : '';
            commentsInput.value = shareData.comments;
            document.getElementById('editDocId').value = selectedShareDocId; // Store doc ID for update
        } else {
            document.getElementById('editDocId').value = ''; // Clear doc ID for new share
        }
        if (shareNameInput) shareNameInput.focus();
    }

    function hideForm() {
        if (shareFormSection) shareFormSection.classList.add('hidden');
        clearForm();
    }

    // Controls the state of the main action buttons (Edit, Delete, View)
    function updateMainButtonsState(enable) {
        if (editShareBtn) editShareBtn.disabled = !enable;
        if (deleteShareBtn) deleteShareBtn.disabled = !enable;
        if (viewDetailsBtn) viewDetailsBtn.disabled = !enable;
    }

    // Handles clicks on table rows for selection
    if (shareTableBody) {
        shareTableBody.addEventListener('click', function(event) {
            let row = event.target.closest('tr');
            if (row && this.contains(row)) {
                // Deselect any previously selected row
                const currentSelected = shareTableBody.querySelector('tr.selected');
                if (currentSelected && currentSelected !== row) {
                    currentSelected.classList.remove('selected');
                }
                // Toggle selection for the clicked row
                row.classList.toggle('selected');

                if (row.classList.contains('selected')) {
                    selectedShareDocId = row.dataset.docId;
                    updateMainButtonsState(true); // Enable buttons if a row is selected
                } else {
                    selectedShareDocId = null;
                    updateMainButtonsState(false); // Disable buttons if no row is selected
                }
            }
        });
    }
    
    // --- Button Handlers ---
    async function handleAddNewShare() {
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
            alert("Please sign in with Google to add shares permanently for syncing.");
            return;
        }
        selectedShareDocId = null; // Clear any existing selection
        const currentSelected = shareTableBody.querySelector('tr.selected');
        if (currentSelected) currentSelected.classList.remove('selected');
        updateMainButtonsState(false); // Disable edit/delete/view
        showForm(false); // Show empty form for new share
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
        if (confirm(`Are you sure you want to delete ${shareToDelete.data.name}?`)) {
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, selectedShareDocId);
                await window.firestore.deleteDoc(docRef);
                console.log("Share deleted:", selectedShareDocId);
                selectedShareDocId = null; // Clear selection after delete
                await loadShares(); // Reload shares and update UI
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again. Check console for details.");
            }
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
        }
    }

    async function handleSaveShare() {
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
             return;
         }

        if (document.getElementById('editDocId').value) {
            // It's an update operation
            await updateShare(document.getElementById('editDocId').value);
        } else {
            // It's an add operation
            await addShare();
        }
        hideForm(); // Hide form after saving
        updateMainButtonsState(false); // Reset buttons
        selectedShareDocId = null; // Clear selection
    }

    function handleCancelForm() {
        hideForm();
        updateMainButtonsState(false); // Reset buttons
        selectedShareDocId = null; // Clear selection
        const currentSelected = shareTableBody.querySelector('tr.selected');
        if (currentSelected) currentSelected.classList.remove('selected');
    }

    // --- Data Management Functions (Firebase) ---

    // Processes the franking credits input
    function processFrankingCreditsInput(inputValue) {
        let value = parseFloat(inputValue);
        if (isNaN(value)) { return ''; }
        return value > 1 ? value / 100 : value;
    }

    // Adds a new share to Firestore
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

    // Updates an existing share in Firestore
    async function updateShare(docId) {
        if (!docId) { alert("No share selected for update."); return; }

        const shareData = {
            name: shareNameInput.value.trim(),
            currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value,
            dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(),
            entryDate: new Date().toLocaleDateString('en-AU') // Update date on edit
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

    // Displays a single share in the table row
    function displayShare(share, docId) {
        const row = shareTableBody.insertRow();
        row.setAttribute('data-doc-id', docId); // Store Firestore document ID on the row

        row.insertCell(0).textContent = share.name;
        row.insertCell(1).textContent = share.currentPrice ? `$${share.currentPrice}` : '';
        row.insertCell(2).textContent = share.targetPrice ? `$${share.targetPrice}` : '';

        // Combine Dividends and Franking Credits
        const dividendsFrankingCell = row.insertCell(3);
        const dividendText = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        const frankingText = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        dividendsFrankingCell.innerHTML = `Dividends: ${dividendText}<br>Franking: ${frankingText}`;

        // Empty Actions cell - actions are now handled by main buttons
        row.insertCell(4).textContent = '';
    }

    // Loads all shares from Firestore and displays them in the table
    async function loadShares() {
        if (!db || !currentUserId || !window.firestore || !auth) {
            console.log("Firestore or Auth not fully initialized or userId not available. Skipping loadShares.");
            return;
        }

        if (shareTableBody) shareTableBody.innerHTML = '';
        allSharesData = []; // Clear cache before loading new data

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
                allSharesData.push({ id: doc.id, data: shareData }); // Cache for view/edit/delete
            });
            clearForm(); // Clear form after loading
            updateMainButtonsState(false); // Disable action buttons after load (nothing selected yet)
            selectedShareDocId = null; // Ensure no selection is carried over
            console.log("Shares loaded successfully.");

        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. Please check your internet connection and Firebase rules. Details in console.");
        }
    }

    // Populates and displays the modal with detailed share info
    function viewShareDetails(share) {
        if (modalShareName) modalShareName.textContent = share.name;
        if (modalEntryDate) modalEntryDate.textContent = share.entryDate;
        if (modalCurrentPrice) modalCurrentPrice.textContent = share.currentPrice ? `$${share.currentPrice}` : 'N/A';
        if (modalTargetPrice) modalTargetPrice.textContent = share.targetPrice ? `$${share.targetPrice}` : 'N/A';
        if (modalDividendAmount) modalDividendAmount.textContent = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        if (modalFrankingCredits) modalFrankingCredits.textContent = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        if (modalComments) modalComments.textContent = share.comments || 'No comments.';

        if (shareDetailModal) shareDetailModal.style.display = 'flex';
    }

    // Clears all input fields and resets the button state
    function clearForm() {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = ''; // Clear hidden ID field
    }
});
