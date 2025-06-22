// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseUserId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    // Get references to all input elements and buttons
    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsInput = document.getElementById('comments');
    const addShareBtn = document.getElementById('addShareBtn');
    const shareTableBody = document.querySelector('#shareTable tbody');
    const displayUserIdSpan = document.getElementById('displayUserId'); // To display user ID
    const displayUserNameSpan = document.getElementById('displayUserName'); // To display user name/email
    const loadingIndicator = document.getElementById('loadingIndicator'); // Reference to loading div

    // References for the Google Sign-in/Sign-out buttons
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

    // References for the modal
    const shareDetailModal = document.getElementById('shareDetailModal');
    const closeButton = document.querySelector('.close-button');
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPrice = document.getElementById('modalCurrentPrice');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalComments = document.getElementById('comments'); // Corrected ID

    // Array of all form input elements to enable 'Enter' key navigation
    const formInputs = [
        shareNameInput,
        currentPriceInput,
        targetPriceInput,
        dividendAmountInput,
        frankingCreditsInput,
        commentsInput
    ];

    // Variables to manage edit mode
    let isEditing = false;
    let editDocId = null;

    // Firebase instances (will be available after Firebase init in index.html)
    let db;
    let auth;
    let currentUserId;
    let currentAppId;

    // --- Initial UI State & Setup ---
    // Show loading initially, then hide after auth is determined
    if (loadingIndicator) loadingIndicator.style.display = 'block';
    if (addShareBtn) addShareBtn.disabled = true;
    formInputs.forEach(input => { if (input) input.disabled = true; }); // Check input exists
    if (shareDetailModal) shareDetailModal.style.display = 'none';

    // Capitalize share name input
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    // Enter key navigation for form inputs
    formInputs.forEach((input, index) => {
        if (input) { // Check if input element exists
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    if (index === formInputs.length - 1) {
                        if (addShareBtn) addShareBtn.click();
                    } else {
                        if (formInputs[index + 1]) formInputs[index + 1].focus();
                    }
                }
            });
        }
    });

    // Modal event listeners
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

    // --- Core Authentication State Management & UI Update ---
    // This runs once Firebase Auth object is globally available from index.html
    const setupAuthListeners = async () => {
        if (!window.firebaseAuth || !window.firestoreDb) {
            // Firebase not ready yet, retry.
            setTimeout(setupAuthListeners, 100);
            return;
        }

        auth = window.firebaseAuth;
        db = window.firestoreDb;
        currentAppId = window.getFirebaseAppId();

        // This listener fires on initial load AND after any sign-in/out
        auth.onAuthStateChanged(async (user) => {
            currentUserId = user ? user.uid : null; // Update currentUserId from current Firebase user

            if (user) {
                // User is signed in
                if (displayUserIdSpan) displayUserIdSpan.textContent = user.uid;
                if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email || 'Guest';

                if (user.isAnonymous) {
                    if (displayUserNameSpan) displayUserNameSpan.textContent += " (Anonymous)";
                    if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                    if (addShareBtn) addShareBtn.disabled = true;
                    formInputs.forEach(input => { if (input) input.disabled = true; }); // Disable for anonymous
                    console.log("Auth State: Anonymous User. ID:", user.uid);
                } else {
                    // User is persistent (Google-signed in)
                    if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                    if (addShareBtn) addShareBtn.disabled = false;
                    formInputs.forEach(input => { if (input) input.disabled = false; }); // Enable for persistent
                    console.log("Auth State: Persistent User. ID:", user.uid, "Email:", user.email);
                }
                await loadShares(); // Load data for the determined user

            } else {
                // No user (initial state or after sign out). Attempt anonymous sign-in.
                currentUserId = null;
                if (shareTableBody) shareTableBody.innerHTML = ''; // Clear table

                if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in";
                if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                if (addShareBtn) addShareBtn.disabled = true;
                formInputs.forEach(input => { if (input) input.disabled = true; }); // Disable initially

                try {
                    const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                    currentUserId = anonUserCredential.user.uid;
                    if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                    console.log("Signed in anonymously. User ID:", currentUserId);
                    await loadShares(); // Load shares for new anonymous session
                } catch (anonError) {
                    console.error("Anonymous sign-in failed:", anonError);
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Auth Error";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                }
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading once auth state is set
        });

        // Handle redirect result immediately after onAuthStateChanged is set up
        try {
            const redirectResult = await window.authFunctions.getRedirectResult(auth);
            if (redirectResult) {
                console.log("Google redirect result processed. User:", redirectResult.user.uid);
                // onAuthStateChanged will now fire with the correct user if it hasn't already.
            }
        } catch (error) {
            console.error("Error during Google redirect result:", error.code, error.message);
            if (error.code === 'auth/account-exists-with-different-credential') {
                await window.authFunctions.signOut(auth); // Sign out the conflicting user
                alert("This email is already associated with another sign-in method in Firebase. You have been signed out. Please click 'Sign in with Google' again.");
            } else {
                alert("Google Sign-in failed. Please try again. Check console for details.");
            }
        }
    };

    // Initiate authentication setup once the DOM is ready
    setupAuthListeners();

    // Event listener for the Add/Update Share button
    if (addShareBtn) {
        addShareBtn.addEventListener('click', handleAddOrUpdateShare);
    }

    // --- Google Sign-in/Sign-out Logic ---
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                if (!auth) {
                    alert("App not fully loaded. Please wait.");
                    return;
                }
                const provider = new window.authFunctions.GoogleAuthProvider();
                console.log("Initiating Google Sign-in redirect...");
                await window.authFunctions.signInWithRedirect(auth, provider);
            } catch (error) {
                console.error("Google Sign-in initial call failed:", error.code, error.message);
                alert("Failed to initiate Google Sign-in. Please try again.");
            }
        });
    }

    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                if (!auth) {
                    alert("App not fully loaded. Please wait.");
                    return;
                }
                await window.authFunctions.signOut(auth);
                console.log("Signed out.");
                clearForm();
                if (shareTableBody) shareTableBody.innerHTML = ''; // Clear displayed shares
                // onAuthStateChanged will handle anonymous re-authentication and UI update
            } catch (error) {
                console.error("Sign-out failed:", error);
                alert("Failed to sign out. Please try again.");
            }
        });
    }

    // --- Data Management Functions ---
    async function handleAddOrUpdateShare() {
        if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
             console.error("Cannot add share: Not signed in with a persistent user.");
             return;
         }
        if (!currentUserId || !db || !window.firestore) {
            console.error("Firebase not fully ready.");
            alert("App is still initializing. Please wait and try again.");
            return;
        }

        if (isEditing) {
            await updateShare();
        } else {
            await addShare();
        }
    }

    function processFrankingCreditsInput(inputValue) {
        let value = parseFloat(inputValue);
        if (isNaN(value)) return '';
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
            entryDate: new Date().toLocaleDateString('en-AU'),
            comments: commentsInput.value.trim(),
            userId: currentUserId,
            appId: currentAppId
        };
        try {
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add share. Check console for details.");
        }
    }

    async function updateShare() {
        if (!editDocId) { alert("No share selected for update."); return; }
        if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) { alert("Please sign in with Google to update shares permanently."); return; }

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
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, editDocId);
            await window.firestore.updateDoc(docRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Check console for details.");
        }
    }

    function displayShare(share, docId) {
        const row = shareTableBody.insertRow();
        row.setAttribute('data-doc-id', docId);

        row.insertCell(0).textContent = share.entryDate;
        row.insertCell(1).textContent = share.name;
        row.insertCell(2).textContent = share.currentPrice ? `$${share.currentPrice}` : '';
        row.insertCell(3).textContent = share.targetPrice ? `$${share.targetPrice}` : '';
        row.insertCell(4).textContent = share.dividendAmount ? `$${share.dividendAmount}` : '';
        const frankingCreditsDisplay = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : '';
        row.insertCell(5).textContent = frankingCreditsDisplay;
        row.insertCell(6).textContent = share.comments;

        const actionsCell = row.insertCell(7);
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View'; viewButton.classList.add('view-btn');
        viewButton.onclick = () => viewShareDetails(share);
        actionsCell.appendChild(viewButton);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit'; editButton.classList.add('edit-btn');
        editButton.onclick = () => editShare(docId, share);
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete'; deleteButton.classList.add('delete-btn');
        deleteButton.onclick = () => deleteShare(docId, share.name);
        actionsCell.appendChild(deleteButton);
    }

    async function loadShares() {
        if (!db || !currentUserId || !window.firestore || !auth) { console.log("Firestore/Auth not ready. Skipping loadShares."); return; }
        if (shareTableBody) shareTableBody.innerHTML = '';
        try {
            const q = window.firestore.query(
                window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestore.where("userId", "==", currentUserId),
                window.firestore.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestore.getDocs(q);
            if (querySnapshot.empty) { console.log(`No shares found for user ID: ${currentUserId}`); }
            querySnapshot.forEach((doc) => displayShare(doc.data(), doc.id));
            clearForm();
        } catch (e) { console.error("Error loading documents: ", e); alert("Failed to load shares. Check console."); }
    }

    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) { alert("Please sign in with Google to delete shares permanently."); return; }
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.deleteDoc(docRef);
                await loadShares();
            } catch (e) { console.error("Error deleting document: ", e); alert("Failed to delete share. Check console."); }
        }
    }

    function editShare(docId, shareData) {
        if (shareNameInput) shareNameInput.value = shareData.name;
        if (currentPriceInput) currentPriceInput.value = shareData.currentPrice;
        if (targetPriceInput) targetPriceInput.value = shareData.targetPrice;
        if (dividendAmountInput) dividendAmountInput.value = shareData.dividendAmount;
        if (frankingCreditsInput) frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ? parseFloat(shareData.frankingCredits) * 100 : '';
        if (commentsInput) commentsInput.value = shareData.comments;
        if (addShareBtn) addShareBtn.textContent = 'Update Share';
        isEditing = true; editDocId = docId;
        if (shareNameInput) shareNameInput.focus();
    }

    function clearForm() {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';
        if (addShareBtn) addShareBtn.textContent = 'Add Share';
        isEditing = false; editDocId = null;
    }

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
});
