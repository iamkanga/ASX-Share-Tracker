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

    // ---- Initial UI State ----
    addShareBtn.disabled = true; // Disable button until Firebase is ready
    formInputs.forEach(input => input.disabled = true); // Disable inputs too
    shareDetailModal.style.display = 'none'; // Ensure modal is hidden on load
    if (loadingIndicator) {
        loadingIndicator.style.display = 'block'; // Show loading indicator initially
    }


    // Capitalize share name input as user types
    shareNameInput.addEventListener('input', function() {
        this.value = this.value.toUpperCase();
    });

    // Add 'keydown' event listener to each form input for 'Enter' key navigation
    formInputs.forEach((input, index) => {
        input.addEventListener('keydown', function(event) {
            if (event.key === 'Enter') {
                event.preventDefault(); // Prevent default form submission

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

    // ---- Authentication State Management and UI Update ----
    // Listen for the Firebase Auth instance to become available, then set up onAuthStateChanged
    window.addEventListener('load', () => { // Ensure window.firebaseAuth is available
        if (window.firebaseAuth) {
            auth = window.firebaseAuth; // Get the Auth instance
            db = window.firestoreDb; // Get Firestore instance
            currentAppId = window.getFirebaseAppId(); // Get app ID

            window.authFunctions.onAuthStateChanged(auth, async (user) => {
                if (user) {
                    currentUserId = user.uid;
                    if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId;
                    if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email || 'Anonymous';
                    if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                    if (addShareBtn) addShareBtn.disabled = false;
                    formInputs.forEach(input => input.disabled = false);
                    console.log("User authenticated. ID:", currentUserId, "Type:", user.isAnonymous ? "Anonymous" : "Persistent");

                    await loadShares(); // Load shares for the current user

                } else {
                    // User is signed out, or no persistent session.
                    currentUserId = null;
                    shareTableBody.innerHTML = ''; // Clear table when no user

                    // Attempt anonymous sign-in to get a temporary ID and allow basic functionality
                    try {
                        const anonUserCredential = await window.authFunctions.signInAnonymously(auth);
                        currentUserId = anonUserCredential.user.uid;
                        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId + " (Anonymous)";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                        console.log("Signed in anonymously for temporary session. User ID:", currentUserId);
                        await loadShares(); // Load shares for this new anonymous ID (will be empty unless data was previously saved anonymously under this specific ID)
                    } catch (anonError) {
                        console.error("Anonymous sign-in failed:", anonError);
                        if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                        if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                        // If anonymous sign-in itself fails, ensure UI is still disabled
                        if (addShareBtn) addShareBtn.disabled = true;
                        formInputs.forEach(input => input.disabled = true);
                    }

                    if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                    if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                }
                if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading after auth attempt
            });
        } else {
            console.error("Firebase Auth not initialized by index.html after load.");
            if (loadingIndicator) loadingIndicator.textContent = "Error: Firebase not ready. Check console.";
        }
    });

    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // ---- Google Sign-in/Sign-out Logic ----
    googleSignInBtn.addEventListener('click', async () => {
        try {
            const provider = new window.authFunctions.GoogleAuthProvider();
            const currentUser = window.firebaseAuth.currentUser; // Get current user from global auth instance

            if (currentUser && currentUser.isAnonymous) {
                // If currently anonymous, link the Google account to the anonymous one
                console.log("Attempting to link anonymous account with Google...");
                await window.authFunctions.linkWithPopup(currentUser, provider);
                console.log("Anonymous account linked with Google successfully.");
            } else {
                // Otherwise, just sign in with Google directly
                console.log("Attempting to sign in with Google directly...");
                await window.authFunctions.signInWithPopup(auth, provider);
                console.log("Signed in with Google successfully.");
            }
            // onAuthStateChanged listener will handle UI update and data load
        } catch (error) {
            console.error("Google Sign-in failed (script.js):", error.code, error.message);
            if (error.code === 'auth/popup-closed-by-user') {
                alert("Sign-in pop-up was closed. Please try again.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                alert("Sign-in already in progress or pop-up blocked. Please try again.");
            } else if (error.code === 'auth/account-exists-with-different-credential') {
                 alert("This email is already associated with another sign-in method. Please use that method or link accounts.");
            } else if (error.code === 'auth/network-request-failed') {
                alert("Network error during sign-in. Check your internet connection.");
            }
            else {
                alert("Failed to sign in with Google. Please check your browser's pop-up settings and console for details.");
            }
        }
    });

    googleSignOutBtn.addEventListener('click', async () => {
        try {
            await window.authFunctions.signOut(auth);
            console.log("Signed out.");
            // onAuthStateChanged listener will handle UI update and data load (which will trigger anonymous sign-in)
            clearForm(); // Clear the form after sign out
        } catch (error) {
            console.error("Sign-out failed:", error);
            alert("Failed to sign out. Please try again.");
        }
    });
    // ---- End Google Sign-in/Sign-out Logic ----


    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        // Ensure Firebase is initialized and user is authenticated with a *persistent* ID for saving
        if (!currentUserId || !db || !window.firestore) {
            console.error("Firebase not initialized or user not authenticated yet.");
            alert("App is still loading or failed to connect. Please wait a moment or refresh.");
            return;
        }
        // Only allow add/update if user is NOT anonymous (i.e., they have a persistent account)
        if (window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
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
            userId: currentUserId, // Store the user ID with the share
            appId: currentAppId // Store the app ID with the share
        };

        try {
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
            await loadShares(); // Reload shares after adding
            clearForm(); // Clear input fields
        } catch (e) {
            console.error("Error adding document: ", e);
            alert("Failed to add share. Please try again.");
        }
    }

    // Updates an existing share in Firestore
    async function updateShare() {
        if (!editDocId) {
            alert("No share selected for update.");
            return;
        }
        if (window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.isAnonymous) {
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
            alert("Failed to update share. Please try again.");
        }
    }

    // Displays a single share in the table
    function displayShare(share, docId) {
        const row = shareTableBody.insertRow();

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

        // View Button
        const viewButton = document.createElement('button');
        viewButton.textContent = 'View';
        viewButton.classList.add('view-btn');
        viewButton.onclick = function() {
            viewShareDetails(share);
        };
        actionsCell.appendChild(viewButton);

        // Edit Button
        const editButton = document.createElement('button');
        editButton.textContent = 'Edit';
        editButton.classList.add('edit-btn');
        editButton.onclick = function() {
            editShare(docId, share);
        };
        actionsCell.appendChild(editButton);

        // Delete Button
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
        if (!db || !currentUserId || !window.firestore) {
            console.log("Firestore not initialized or user not authenticated yet. Skipping loadShares.");
            return;
        }

        shareTableBody.innerHTML = ''; // Clear existing table rows

        try {
            const q = window.firestore.query(
                window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestore.where("userId", "==", currentUserId),
                window.firestore.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                displayShare(doc.data(), doc.id);
            });
            clearForm();
        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. Please check your internet connection and Firebase rules.");
        }
    }

    // Deletes a share from Firestore
    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            if (window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.deleteDoc(docRef);
                await loadShares();
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again.");
            }
        }
    }

    // Populates the form fields with data of the share being edited
    function editShare(docId, shareData) {
        shareNameInput.value = shareData.name;
        currentPriceInput.value = shareData.currentPrice;
        targetPriceInput.value = shareData.targetPrice;
        dividendAmountInput.value = shareData.dividendAmount;
        frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ?
                                        parseFloat(shareData.frankingCredits) * 100 : '';
        commentsInput.value = shareData.comments;

        addShareBtn.textContent = 'Update Share';
        isEditing = true;
        editDocId = docId;
        shareNameInput.focus();
    }

    // Clears all input fields and resets the button state
    function clearForm() {
        shareNameInput.value = '';
        currentPriceInput.value = '';
        targetPriceInput.value = '';
        dividendAmountInput.value = '';
        frankingCreditsInput.value = '';
        commentsInput.value = '';

        addShareBtn.textContent = 'Add Share';
        isEditing = false;
        editDocId = null;
    }

    // Populates and displays the modal with detailed share info
    function viewShareDetails(share) {
        modalShareName.textContent = share.name;
        modalEntryDate.textContent = share.entryDate;
        modalCurrentPrice.textContent = share.currentPrice ? `$${share.currentPrice}` : 'N/A';
        modalTargetPrice.textContent = share.targetPrice ? `$${share.targetPrice}` : 'N/A';
        modalDividendAmount.textContent = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        modalFrankingCredits.textContent = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        modalComments.textContent = share.comments || 'No comments.';

        shareDetailModal.style.display = 'flex';
    }
});
