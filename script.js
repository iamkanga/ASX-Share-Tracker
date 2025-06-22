console.log("SCRIPT.JS: Script file started. DOMContentLoaded event listener setup.");

document.addEventListener('DOMContentLoaded', function() {
    console.log("SCRIPT.JS: DOMContentLoaded fired.");

    // Get references to all input elements and buttons
    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsInput = document.getElementById('comments');
    const addShareBtn = document.getElementById('addShareBtn');
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

    const formInputs = [
        shareNameInput,
        currentPriceInput,
        targetPriceInput,
        dividendAmountInput,
        frankingCreditsInput,
        commentsInput
    ];

    let db;
    let auth;
    let currentUserId;
    let currentAppId;

    // Initial UI state - most of this is now managed by index.html after auth state changes
    if (shareDetailModal) shareDetailModal.style.display = 'none';


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
                        if (addShareBtn) addShareBtn.click();
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

    // --- Firebase Authentication State Listener and Button Setup ---
    // These objects are now guaranteed to be available by the time DOMContentLoaded fires
    // because they are initialized directly in index.html's module script.
    auth = window.firebaseAuth;
    db = window.firestoreDb;
    currentAppId = window.getFirebaseAppId();

    console.log("SCRIPT.JS: Firebase objects assigned. Setting up onAuthStateChanged.");

    // This listener will react to all authentication state changes (login, logout, initial load)
    window.authFunctions.onAuthStateChanged(auth, async (user) => {
        console.log("SCRIPT.JS: onAuthStateChanged callback fired. User:", user ? user.uid : "null");

        if (user) {
            currentUserId = user.uid;
            // UI updates for displayUserIdSpan and displayUserNameSpan are now handled by index.html
            // as part of the primary onAuthStateChanged there.
            // Similarly for googleSignInBtn, googleSignOutBtn, and formInputs disabled/enabled state.

            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Ensure hidden once auth state is set

            // Load shares after auth state is determined
            await loadShares();

        } else {
            // This 'else' block will primarily be hit if a user logs out,
            // or if initial anonymous sign-in fails (though index.html handles most anonymous attempts).
            currentUserId = null;
            // UI updates are handled by index.html's onAuthStateChanged
            if (shareTableBody) shareTableBody.innerHTML = ''; // Clear table on sign out
            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading
            console.log("SCRIPT.JS: No user (signed out or auth failed), clearing data and awaiting new state from index.html.");
        }
    });


    // ---- Google Sign-in/Sign-out Logic (Attached directly now that auth is guaranteed ready) ----
    // Attach these event listeners only once after DOMContentLoaded to prevent multiple attachments
    if (googleSignInBtn && !googleSignInBtn.dataset.listenerAttached) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                if (!auth) { console.error("SCRIPT.JS: Auth not initialized when button clicked."); alert("App is still loading. Please wait."); return; }
                console.log("SCRIPT.JS: Google Sign-in button clicked. Attempting signInWithPopup.");
                const provider = new window.authFunctions.GoogleAuthProvider();
                const currentUser = auth.currentUser;

                if (currentUser && currentUser.isAnonymous) {
                    await window.authFunctions.linkWithPopup(currentUser, provider);
                    console.log("SCRIPT.JS: Anonymous account linked with Google.");
                } else {
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("SCRIPT.JS: Signed in with Google directly.");
                }
            } catch (error) {
                console.error("SCRIPT.JS: Google Sign-in failed:", error.code, error.message, error);
                if (error.code === 'auth/popup-closed-by-user') {
                    alert("Sign-in pop-up was closed. Please try again.");
                } else if (error.code === 'auth/cancelled-popup-request') {
                    alert("Sign-in already in progress or pop-up blocked. Please try again.");
                } else if (error.code === 'auth/account-exists-with-different-credential') {
                     alert("This email is already associated with another sign-in method. Please use that method or link accounts.");
                }
                else {
                    alert("Failed to sign in with Google. Please try again. Check browser pop-up settings and console for details.");
                }
            }
        });
        googleSignInBtn.dataset.listenerAttached = 'true'; // Mark as attached
    }

    if (googleSignOutBtn && !googleSignOutBtn.dataset.listenerAttached) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                if (!auth) { console.error("SCRIPT.JS: Auth not initialized when button clicked."); alert("App is still loading. Please wait."); return; }
                console.log("SCRIPT.JS: Google Sign-out button clicked. Attempting signOut.");
                await window.authFunctions.signOut(auth);
                console.log("SCRIPT.JS: Signed out.");
                clearForm(); // Clears input form
                if (shareTableBody) shareTableBody.innerHTML = ''; // Clears the table
                // UI updates for displayUserIdSpan, displayUserNameSpan, buttons, inputs are handled by index.html's onAuthStateChanged
            } catch (error) {
                console.error("SCRIPT.JS: Sign-out failed:", error);
                alert("Failed to sign out. Please try again.");
            }
        });
        googleSignOutBtn.dataset.listenerAttached = 'true'; // Mark as attached
    }


    if (addShareBtn) {
        addShareBtn.addEventListener('click', handleAddOrUpdateShare);
    }

    async function handleAddOrUpdateShare() {
        // Now rely on UI being disabled/enabled by index.html based on persistent login status.
        // This check acts as a final safeguard.
        if (!auth || auth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing. Data added anonymously will not sync across devices.");
             console.error("Cannot add share: User is anonymous or Firebase not ready.");
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
        if (isNaN(value)) { return ''; }
        return value > 1 ? value / 100 : value;
    }

    async function addShare() {
        const shareName = shareNameInput.value.trim();
        const currentPrice = currentPriceInput.value;
        const targetPrice = targetPriceInput.value;
        const dividendAmount = dividendAmountInput.value;
        const frankingCredits = processFrankingCreditsInput(frankingCreditsInput.value);
        const comments = commentsInput.value.trim();
        const entryDate = new Date().toLocaleDateString('en-AU');

        if (!shareName) {
            alert('Please enter a Share Name.');
            return;
        }

        const shareData = {
            name: shareName, currentPrice: currentPrice, targetPrice: targetPrice, dividendAmount: dividendAmount,
            frankingCredits: frankingCredits, entryDate: entryDate, comments: comments,
            userId: auth.currentUser.uid, // Use current authenticated user's UID
            appId: currentAppId
        };

        try {
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${auth.currentUser.uid}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add share. Please try again. Check console for details.");
        }
    }

    async function updateShare() {
        if (!editDocId) { alert("No share selected for update."); return; }
        if (!auth || auth.currentUser.isAnonymous) { // Safeguard
            alert("Please sign in with Google to update shares permanently.");
            return;
        }

        const shareData = {
            name: shareNameInput.value.trim(), currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value, dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(), entryDate: new Date().toLocaleDateString('en-AU')
        };

        try {
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${auth.currentUser.uid}/shares`, editDocId);
            await window.firestore.updateDoc(docRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Please try again. Check console for details.");
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

        const frankingCreditsDisplay = (share.frankingCredits || share.frankingCredits === 0) ?
                                        `${parseFloat(share.frankingCredits) * 100}%` : '';
        row.insertCell(5).textContent = frankingCreditsDisplay;

        row.insertCell(6).textContent = share.comments;

        const actionsCell = row.insertCell(7);

        const viewButton = document.createElement('button');
        viewButton.textContent = 'View'; viewButton.classList.add('view-btn');
        viewButton.onclick = function() { viewShareDetails(share); };
        actionsCell.appendChild(viewButton);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit'; editButton.classList.add('edit-btn');
        editButton.onclick = function() { editShare(docId, share); };
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete'; deleteButton.classList.add('delete-btn');
        deleteButton.onclick = function() { deleteShare(docId, share.name); };
        actionsCell.appendChild(deleteButton);
    }

    async function loadShares() {
        if (!db || !auth || !auth.currentUser || !window.firestore) { // Use auth.currentUser for active user check
            console.log("Firestore or Auth not fully initialized or no active user. Skipping loadShares.");
            return;
        }
        currentUserId = auth.currentUser.uid; // Ensure currentUserId is always up-to-date from auth object

        if (shareTableBody) shareTableBody.innerHTML = '';

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

            querySnapshot.forEach((doc) => { displayShare(doc.data(), doc.id); });
            clearForm();
        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. This often means: 1. You are not signed in persistently. 2. Firebase Rules are blocking access. 3. Internet connection issue. Please check console for details.");
        }
    }

    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            if (!auth || auth.currentUser.isAnonymous) { alert("Please sign in with Google to delete shares permanently."); return; }
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.deleteDoc(docRef);
                await loadShares();
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again. Check console for details.");
            }
        }
    }

    function editShare(docId, shareData) {
        if (shareNameInput) shareNameInput.value = shareData.name;
        if (currentPriceInput) currentPriceInput.value = shareData.currentPrice;
        if (targetPriceInput) targetPriceInput.value = shareData.targetPrice;
        if (dividendAmountInput) dividendAmountInput.value = shareData.dividendAmount;
        if (frankingCreditsInput) frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ?
                                        parseFloat(shareData.frankingCredits) * 100 : '';
        if (commentsInput) commentsInput.value = shareData.comments;

        if (addShareBtn) addShareBtn.textContent = 'Update Share';
        isEditing = true;
        editDocId = docId;
        if (shareNameInput) shareNameInput.focus();
    }

    function clearForm() {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = ''; // Corrected: targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';

        if (addShareBtn) addShareBtn.textContent = 'Add Share';
        isEditing = false;
        editDocId = null;
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
