// This script interacts with Firebase Firestore for data storage.
// It now directly accesses Firebase instances and functions exposed globally on the 'window' object
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    console.log("script.js: DOMContentLoaded event fired. Script execution starting."); // Diagnostic log

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
    const modalComments = document.getElementById('modalComments');

    // Array of all form input elements for 'Enter' key navigation and disabling
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

    // Firebase instances (will be available from window object after index.html initializes them)
    let db;
    let auth;
    let currentUserId;
    let currentAppId; // App ID will also be globally available

    // --- Initial UI State (ensuring elements exist before accessing) ---
    if (addShareBtn) addShareBtn.disabled = true;
    formInputs.forEach(input => { if(input) input.disabled = true; });
    if (shareDetailModal) shareDetailModal.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'block';


    // Capitalize share name input
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    // 'Enter' key navigation for form inputs
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

    // --- Event listener for firebaseAuthReady custom event ---
    // This ensures Firebase is fully initialized and global variables are set.
    window.addEventListener('firebaseAuthReady', async (event) => {
        db = window.myFirestoreDb;          // Access directly from window
        auth = window.myFirebaseAuth;       // Access directly from window
        currentUserId = event.detail.userId;
        currentAppId = window.getAppId();   // Access getAppId from window

        // Update UI elements (main logic for visibility handled in index.html, but ensure script.js reflects)
        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + (event.detail.user && event.detail.user.isAnonymous ? " (Anonymous)" : "");
        if (displayUserNameSpan) displayUserNameSpan.textContent = event.detail.user ? (event.detail.user.displayName || event.detail.user.email || 'Guest') : 'Guest';
        if (loadingIndicator) loadingIndicator.style.display = 'none';


        // --- Attach Google Sign-in/Sign-out Event Listeners (ONLY once, AFTER Firebase is ready) ---
        // Use a flag to prevent multiple attachments on repeated firebaseAuthReady events
        if (googleSignInBtn && !googleSignInBtn.dataset.listenerAttached) {
            googleSignInBtn.addEventListener('click', async () => {
                try {
                    // Check if Firebase Auth and Provider instances are truly available
                    if (!window.myFirebaseAuth || !window.myGoogleAuthProvider) {
                        console.error("Firebase Auth or Google Provider not initialized for sign-in.");
                        alert("Authentication services are not ready. Please try again or refresh.");
                        return;
                    }
                    console.log("Attempting Google Sign-in...");

                    const currentUser = window.myFirebaseAuth.currentUser;
                    const provider = window.myGoogleAuthProvider;

                    if (currentUser && currentUser.isAnonymous) {
                        await window.mySignInWithPopup(currentUser, provider); // Use direct global function
                        console.log("Anonymous account linked with Google.");
                    } else {
                        await window.mySignInWithPopup(window.myFirebaseAuth, provider); // Use direct global function
                        console.log("Signed in with Google.");
                    }
                } catch (error) {
                    console.error("Google Sign-in failed:", error.code, error.message);
                    if (error.code === 'auth/popup-closed-by-user') {
                        alert("Sign-in pop-up was closed. Please try again.");
                    } else if (error.code === 'auth/cancelled-popup-request') {
                        alert("Sign-in already in progress or pop-up blocked. Please try again.");
                    } else {
                        alert(`Failed to sign in with Google: ${error.message}. Please check browser pop-up settings.`);
                    }
                }
            });
            googleSignInBtn.dataset.listenerAttached = 'true'; // Mark as attached
        }

        if (googleSignOutBtn && !googleSignOutBtn.dataset.listenerAttached) {
            googleSignOutBtn.addEventListener('click', async () => {
                try {
                    if (!window.myFirebaseAuth) { console.error("Firebase Auth not initialized for sign-out."); return; }
                    await window.mySignOut(window.myFirebaseAuth); // Use direct global function
                    console.log("Signed out.");
                    clearForm();
                    if (shareTableBody) shareTableBody.innerHTML = ''; // Clear table on sign out
                } catch (error) {
                    console.error("Sign-out failed:", error);
                    alert("Failed to sign out. Please try again.");
                }
            });
            googleSignOutBtn.dataset.listenerAttached = 'true'; // Mark as attached
        }

        // Load shares once authentication is ready and userId is available
        if (db && currentUserId) {
            await loadShares();
        } else {
            console.warn("Firestore or User ID not fully available. Cannot load shares yet.");
        }
    });

    // Event listener for the Add/Update Share button (attached once DOMContentLoaded)
    if (addShareBtn) {
        addShareBtn.addEventListener('click', handleAddOrUpdateShare);
    }

    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        // Use window.myFirebaseAuth to get the current user status
        if (!currentUserId || !db || !window.firestoreUtils || !window.myFirebaseAuth || window.myFirebaseAuth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing. Data added anonymously will not sync across devices.");
             console.error("Cannot add/update share: Not signed in with a persistent user, or Firebase not ready.");
             return;
         }
        if (isEditing) {
            await updateShare();
        } else {
            await addShare();
        }
    }

    // Processes the franking credits input: converts user-entered percentage (e.g., 70)
    // into a decimal (e.g., 0.7) for consistent storage and calculation.
    function processFrankingCreditsInput(inputValue) {
        let value = parseFloat(inputValue);
        if (isNaN(value)) {
            return '';
        }
        return value > 1 ? value / 100 : value;
    }

    // Adds a new share to the watchlist in Firestore
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
            name: shareName,
            currentPrice: currentPrice,
            targetPrice: targetPrice,
            dividendAmount: dividendAmount,
            frankingCredits: frankingCredits,
            entryDate: entryDate,
            comments: comments,
            userId: currentUserId,
            appId: currentAppId
        };

        try {
            const sharesCollectionRef = window.firestoreUtils.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestoreUtils.addDoc(sharesCollectionRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add share. Please try again. Check console for details.");
        }
    }

    // Updates an existing share in Firestore
    async function updateShare() {
        if (!editDocId) {
            alert("No share selected for update.");
            return;
        }
        if (!window.myFirebaseAuth || window.myFirebaseAuth.currentUser.isAnonymous) {
            alert("Please sign in with Google to update shares permanently for syncing.");
            return;
        }

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
            const docRef = window.firestoreUtils.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, editDocId);
            await window.firestoreUtils.updateDoc(docRef, shareData);
            await loadShares();
            clearForm();
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Please try again. Check console for details.");
        }
    }

    // Displays a single share in the table
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
        viewButton.textContent = 'View';
        viewButton.classList.add('view-btn');
        viewButton.onclick = function() {
            viewShareDetails(share);
        };
        actionsCell.appendChild(viewButton);

        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.onclick = function() {
            editShare(docId, share);
        };
        actionsCell.appendChild(editButton);

        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = function() {
            deleteShare(docId, share.name);
        };
        actionsCell.appendChild(deleteButton);
    }

    // Loads all shares from Firestore and displays them in the table
    async function loadShares() {
        if (!db || !currentUserId || !window.firestoreUtils || !window.myFirebaseAuth) {
            console.log("Firestore, Auth, or User ID not fully available. Skipping loadShares.");
            return;
        }

        if (shareTableBody) shareTableBody.innerHTML = '';

        try {
            const q = window.firestoreUtils.query(
                window.firestoreUtils.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestoreUtils.where("userId", "==", currentUserId),
                window.firestoreUtils.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestoreUtils.getDocs(q);

            if (querySnapshot.empty && !window.myFirebaseAuth.currentUser.isAnonymous && currentUserId) {
                console.log(`No shares found for persistent user ID: ${currentUserId}`);
            } else if (querySnapshot.empty && window.myFirebaseAuth.currentUser.isAnonymous) {
                console.log(`No shares found for anonymous user ID: ${currentUserId}`);
            }

            querySnapshot.forEach((doc) => {
                displayShare(doc.data(), doc.id);
            });
            clearForm();
        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. This often means: 1. You are not signed in persistently. 2. Firebase Rules are blocking access. 3. Internet connection issue. Please check console for details.");
        }
    }

    // Deletes a share from Firestore
    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            if (!window.myFirebaseAuth || window.myFirebaseAuth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
            try {
                const docRef = window.firestoreUtils.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestoreUtils.deleteDoc(docRef);
                await loadShares();
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again. Check console for details.");
            }
        }
    }

    // Populates the form fields with data of the share being edited
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

    // Clears all input fields and resets the button state
    function clearForm() {
        if (shareNameInput) shareNameInput.value = '';
        if (currentPriceInput) currentPriceInput.value = '';
        if (targetPriceInput) targetPriceInput.value = '';
        if (dividendAmountInput) dividendAmountInput.value = '';
        if (frankingCreditsInput) frankingCreditsInput.value = '';
        if (commentsInput) commentsInput.value = '';

        if (addShareBtn) addShareBtn.textContent = 'Add Share';
        isEditing = false;
        editDocId = null;
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
});
```

Thank you for selecting the code and letting me know. I've re-examined the code within the selection tags and confirm that the "Unexpected identifier 'index'" error is not present in that specific code. The `index` variable is correctly used within the `forEach` loop.

This suggests that the issue might be outside of the provided code block, or a subtle environment problem.

To help diagnose further, I have added a `console.log` statement at the very beginning of the `DOMContentLoaded` function in the `script.js` Canvas.

Here's how to proceed:

1.  **Update your `script.js`:** Please **replace the *entire content* of your local `script.js` file with the code provided in the `script_js_final_v11` Canvas above.** (This is the same code you selected, but now re-presented cleanly for you to copy).
2.  **Ensure `index.html` is up-to-date:** Make sure your local `index.html` file is identical to the one in the `index_html_final_v9` Canvas (which you confirmed was correct previously).
3.  **Upload Both Files to GitHub:** Commit and push both `index.html` and `script.js` to your GitHub repository.
4.  **Aggressively Clear Browser Cache:** This is crucial.
    * **Desktop Chrome:** Open Developer Tools (`F12`), go to the "Application" tab, click "Storage" on the left, then "Clear site data." Close *all* Chrome windows completely, then reopen.
    * **Mobile Browsers:** Go into the browser's settings, find "Site settings" or "Privacy and security," locate your `lamkanga.github.io` domain, and clear all stored data/cache for that site. Completely close and reopen the browser app.
5.  **Test and Report Console Output:**
    * Open your app URL (`https://lamkanga.github.io/ASX-Share-Tracker/`) in your browser.
    * Open the Developer Tools (`F12`) and navigate to the **Console** tab.
    * **Crucially:** Please copy *all* messages (including the `console.log` I added and any new errors) that appear in the console. The exact order and content of these messages are very important for diagnosis.

The `console.log` at the start of `script.js` will tell us if the browser is even *starting* to process that file before it hits an error. Your detailed console output is the next key to unlocking this probl