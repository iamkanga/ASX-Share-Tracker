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
    const modalComments = document.getElementById('modalComments');

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

    // ---- Initial UI State ----
    addShareBtn.disabled = true;
    formInputs.forEach(input => input.disabled = true);
    shareDetailModal.style.display = 'none';
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block'; // Show loading indicator initially
        console.log("Loading indicator shown (initial state).");
    }


    // Capitalize share name input as user types
    shareNameInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Add 'keydown' event listener to each form input for 'Enter' key navigation
    formInputs.forEach((input, index) => {
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault();
                if (index === formInputs.length - 1) {
                    addShareBtn.click();
                } else {
                    formInputs[index + 1].focus();
                }
            }
        });
    });

    // Event listeners for modal
    closeButton.addEventListener('click', () => {
        shareDetailModal.style.display = 'none';
    });

    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal) {
            shareDetailModal.style.display = 'none';
        }
    });

    // --- Core Authentication State Management ---
    // This function ensures Firebase objects are available and sets up auth listeners.
    const setupAuthAndLoadData = async () => { // Marked as async because of await inside for getRedirectResult
        if (!window.firebaseAuth || !window.firestoreDb) {
            console.warn("Firebase Auth or Firestore not yet available, retrying setup in 100ms...");
            setTimeout(setupAuthAndLoadData, 100); // Retry until global Firebase objects are ready
            return;
        }

        auth = window.firebaseAuth;
        db = window.firestoreDb;
        currentAppId = window.getFirebaseAppId();

        console.log("Firebase Auth and Firestore objects now available in script.js.");

        // Set up the primary onAuthStateChanged listener IMMEDIATELY after auth is available.
        // This listener will handle all UI updates based on auth state.
        auth.onAuthStateChanged(async (user) => { // Marked as async because of await inside (loadShares, signInAnonymously)
            if (user) {
                currentUserId = user.uid;
                if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId;
                if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email || (user.isAnonymous ? 'Anonymous' : 'Guest');
                
                // Show/hide sign-in/out buttons based on user type
                if (user.isAnonymous) {
                    if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                    addShareBtn.disabled = true; // Anonymous users cannot save permanently
                    formInputs.forEach(input => input.disabled = true);
                } else {
                    if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                    addShareBtn.disabled = false; // Persistent users can save
                    formInputs.forEach(input => input.disabled = false);
                }
                
                console.log("User authenticated via onAuthStateChanged. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");
                await loadShares(); // LINE 176 - Now within an async context

            } else {
                // No user signed in (initial state or after sign-out)
                currentUserId = null;
                shareTableBody.innerHTML = ''; // Clear table when no user

                if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in";
                if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                addShareBtn.disabled = true; // Disable inputs/button if no user
                formInputs.forEach(input => input.disabled = true);

                // Attempt anonymous sign-in to get a temporary ID
                try {
                    const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                    currentUserId = anonUserCredential.user.uid;
                    if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                    console.log("Signed in anonymously for temporary session. User ID:", currentUserId);
                    
                    // Keep inputs disabled for anonymous user (until they sign in with Google)
                    addShareBtn.disabled = true;
                    formInputs.forEach(input => input.disabled = true);
                    
                    await loadShares(); // Load shares for this new anonymous ID
                } catch (anonError) {
                    console.error("Anonymous sign-in failed:", anonError);
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                    addShareBtn.disabled = true;
                    formInputs.forEach(input => input.disabled = true);
                }
            }
            if (loadingIndicator) {
                loadingIndicator.style.display = 'none'; // Hide loading after auth attempt and data load
                console.log("Loading indicator hidden (onAuthStateChanged completed).");
            }
        });

        // After the onAuthStateChanged listener is set, process any pending redirect result.
        // This is crucial because onAuthStateChanged will then pick up the persistent user.
        try {
            const redirectResult = await window.authFunctions.getRedirectResult(auth);
            if (redirectResult) {
                console.log("Redirect sign-in result detected *after* onAuthStateChanged setup. User:", redirectResult.user.uid);
                // The onAuthStateChanged listener will have already fired or will fire again shortly with this new persistent user.
            }
        } catch (error) {
            console.error("Error processing redirect result (initial load):", error.code, error.message);
            if (error.code === 'auth/account-exists-with-different-credential') {
                // If this specific error occurs, explicitly sign out the current user (likely anonymous)
                // and then prompt the user to try signing in with Google again from a clean state.
                await window.authFunctions.signOut(auth);
                alert("This email is already associated with another sign-in method in Firebase. You have been signed out. Please click 'Sign in with Google' again to connect your account.");
            } else {
                alert("Google Sign-in failed after redirect. Please try again. Check browser console for details.");
            }
        }
    };

    // Call the authentication setup function once the DOM is ready.
    setupAuthAndLoadData();


    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // ---- Google Sign-in/Sign-out Logic ----
    googleSignInBtn.addEventListener('click', async () => {
        try {
            if (!auth) {
                console.error("Firebase Auth not available. Cannot initiate Google Sign-in.");
                alert("App not fully loaded. Please wait and try again.");
                return;
            }
            const provider = new window.authFunctions.GoogleAuthProvider();
            console.log("Attempting to sign in with Google via redirect...");
            // signInWithRedirect will cause a full page redirect. The result is handled by getRedirectResult on load.
            await window.authFunctions.signInWithRedirect(auth, provider);
            // This code after signInWithRedirect will not execute as the page redirects.
        } catch (error) {
            console.error("Google Sign-in initial call failed (script.js):", error.code, error.message);
            alert("Failed to initiate Google Sign-in. Please try again. Check browser console for details.");
        }
    });

    googleSignOutBtn.addEventListener('click', async () => {
        try {
            if (!auth) {
                console.error("Firebase Auth not available. Cannot sign out.");
                alert("App not fully loaded. Please wait and try again.");
                return;
            }
            await window.authFunctions.signOut(auth);
            console.log("Signed out.");
            clearForm(); // Clear the form after sign out
            // The onAuthStateChanged listener will now detect the signed-out state and re-authenticate anonymously.
        } catch (error) {
            console.error("Sign-out failed:", error);
            alert("Failed to sign out. Please try again.");
        }
    });
    // ---- End Google Sign-in/Sign-out Logic ----


    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        // Crucially, check if the *current* user is anonymous. If so, prevent saving.
        if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing. Data added anonymously will not sync across devices.");
             console.error("Cannot add share: Not signed in with a persistent user (anonymous session active).");
             return;
         }

        if (!currentUserId || !db || !window.firestore) { // Secondary check for Firebase readiness
            console.error("Firebase (DB/Firestore functions) not fully ready. Cannot add share.");
            alert("App is still initializing. Please wait a moment and try again.");
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
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
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
        if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
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
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, editDocId);
            await window.firestore.updateDoc(docRef, shareData);
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
        if (!db || !currentUserId || !window.firestore || !auth) {
            console.log("Firestore or Auth not fully initialized or userId not available. Skipping loadShares.");
            return;
        }

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
            if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.deleteDoc(docRef);
                await loadShares();
            }
            catch (e) {
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
