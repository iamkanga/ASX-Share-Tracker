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
    let editDocId = null; // Stores the Firestore document ID when in edit mode

    // Firebase instances (will be available after Firebase init in index.html)
    let db; // Firestore database instance
    let auth; // Firebase Auth instance
    let currentUserId; // User's unique ID
    let currentAppId; // Application's unique ID

    // Flag to ensure anonymous sign-in only happens once if no persistent user is found initially
    let hasAttemptedAnonymousSignIn = false;


    // ---- Initial UI State ----
    if (addShareBtn) addShareBtn.disabled = true;
    formInputs.forEach(input => { if(input) input.disabled = true; });
    if (shareDetailModal) shareDetailModal.style.display = 'none';
    if (loadingIndicator) loadingIndicator.style.display = 'block';


    // Capitalize share name input as user types
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    // Add 'keydown' event listener to each form input for 'Enter' key navigation
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

    // Event listeners for modal
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

    // ---- Google Sign-in/Sign-out Logic and Auth State Handling ----
    // This listener waits for Firebase services to be initialized before setting up auth listeners
    window.addEventListener('firebaseServicesReady', () => {
        auth = window.firebaseAuth; // Get the Auth instance from global scope
        db = window.firestoreDb; // Get Firestore instance
        currentAppId = window.getFirebaseAppId(); // Get app ID

        if (!auth) {
            console.error("Firebase Auth not available after services ready. Cannot set up auth state listener.");
            return;
        }

        // The main onAuthStateChanged listener to handle all auth state changes
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                currentUserId = user.uid;
                if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId;
                if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email || 'Anonymous';
                if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                if (addShareBtn) addShareBtn.disabled = false;
                formInputs.forEach(input => { if(input) input.disabled = false; });
                console.log("User authenticated. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");

                await loadShares(); // Load shares for the current user

            } else {
                // User is signed out, or no persistent session.
                currentUserId = null;
                if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in.";
                if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                if (addShareBtn) addShareBtn.disabled = true;
                formInputs.forEach(input => { if(input) input.disabled = true; });
                if (shareTableBody) shareTableBody.innerHTML = ''; // Clear table when no user

                // IMPORTANT: Only attempt anonymous sign-in ONCE if no persistent user is found.
                // This prevents the infinite loop if signOut is called or if no persistent user.
                if (!hasAttemptedAnonymousSignIn) {
                    hasAttemptedAnonymousSignIn = true; // Set flag to prevent re-attempt
                    try {
                        const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                        currentUserId = anonUserCredential.user.uid;
                        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                        console.log("Signed in anonymously for temporary session. User ID:", currentUserId);
                        await loadShares(); // Load shares for this new anonymous ID
                    } catch (anonError) {
                        console.error("Anonymous sign-in failed:", anonError);
                        if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                    }
                } else {
                    console.log("Already attempted anonymous sign-in or a user was previously logged out. Waiting for user action.");
                }
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading after auth attempt
        });
    });


    // Event listener for the Add/Update Share button
    if (addShareBtn) {
        addShareBtn.addEventListener('click', handleAddOrUpdateShare);
    }

    // Google Sign-in/Sign-out button event listeners
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                // Use the pre-configured GoogleAuthProviderInstance from index.html
                const provider = window.authFunctions.GoogleAuthProviderInstance;
                const currentUser = window.firebaseAuth.currentUser;

                if (!auth || !provider) {
                    console.error("Firebase Auth or GoogleAuthProvider not ready.");
                    alert("Google Sign-in is not ready. Please refresh the page.");
                    return;
                }

                if (currentUser && currentUser.isAnonymous) {
                    // Link the anonymous account to the Google account
                    await window.authFunctions.linkWithPopup(currentUser, provider);
                    console.log("Anonymous account linked with Google.");
                } else {
                    // Sign in with Google directly
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("Signed in with Google.");
                }
                // onAuthStateChanged listener will handle UI update and data load
            } catch (error) {
                console.error("Google Sign-in failed:", error.code, error.message);
                if (error.code === 'auth/popup-closed-by-user') {
                    alert("Sign-in pop-up was closed. Please try again.");
                } else if (error.code === 'auth/cancelled-popup-request') {
                    alert("Sign-in already in progress or pop-up blocked. Please try again.");
                } else if (error.code === 'auth/account-exists-with-different-credential') {
                     alert("This email is already associated with another sign-in method. Please use that method or link accounts.");
                }
                else {
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
                hasAttemptedAnonymousSignIn = false; // Reset flag so next load can try anonymous again
            } catch (error) {
                console.error("Sign-out failed:", error);
                alert("Failed to sign out. Please try again.");
            }
        });
    }
    // ---- End Google Sign-in/Sign-out Logic ----


    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        if (!currentUserId || !db || !window.firestore || !auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
             alert("Please sign in with Google to add/save shares permanently for syncing. Data added anonymously will not sync across devices.");
             console.error("Cannot add share: Not signed in with a persistent user, or Firebase not ready.");
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
        if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
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
            // This alert is for user debugging, not for typical UX
            alert("Failed to load shares. This often means: 1. You are not signed in persistently. 2. Firebase Rules are blocking access. 3. Internet connection issue. Please check console for details.");
        }
    }

    // Deletes a share from Firestore
    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            if (!auth || auth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
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
