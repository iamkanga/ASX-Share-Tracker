// This script interacts with Firebase Firestore for data storage,
// including Google Sign-in/Sign-out.
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
                    // If it's the last input (comments), try to add/update share
                    addShareBtn.click();
                } else {
                    formInputs[index + 1].focus(); // Otherwise, move focus to next input
                }
            }
        });
    });

    // Event listeners for modal
    closeButton.addEventListener('click', () => {
        shareDetailModal.style.display = 'none'; // Hide modal when close button is clicked
    });

    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal) {
            shareDetailModal.style.display = 'none'; // Hide modal if user clicks outside of it
        }
    });

    // Listen for the custom event fired when Firebase authentication is ready
    window.addEventListener('firebaseAuthReady', async (event) => {
        db = window.firestoreDb; // Get the Firestore instance from global scope
        auth = window.firebaseAuth; // Get the Auth instance from global scope
        currentUserId = event.detail.userId; // Get the user ID
        currentAppId = window.getFirebaseAppId(); // Get the app ID

        // Update UI based on user authentication status
        const user = event.detail.user;
        if (user) {
            userId = user.uid;
            if (displayUserIdSpan) displayUserIdSpan.textContent = userId;

            if (user.isAnonymous) {
                // User is anonymous, show Sign In button, disable input/save
                if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                formInputs.forEach(element => element.disabled = true);
                if (addShareBtn) addShareBtn.disabled = true; // Disable Add/Update button
                console.log("Authenticated User ID:", userId, "(Anonymous)");
            } else {
                // User is a persistent user (e.g., Google), enable input/save
                if (displayUserNameSpan) displayUserNameSpan.textContent = user.displayName || user.email;
                if (googleSignInBtn) googleSignInBtn.style.display = 'none';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'block';
                formInputs.forEach(element => element.disabled = false);
                if (addShareBtn) addShareBtn.disabled = false; // Enable Add/Update button
                console.log("Authenticated User ID:", userId, "(Persistent)");
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none';
            window.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { userId: userId, user: user } }));

        } else {
            // No user signed in at all (or signed out)
            userId = null;
            if (displayUserIdSpan) displayUserIdSpan.textContent = "Not logged in";
            if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest";
            if (googleSignInBtn) googleSignInBtn.style.display = 'block';
            if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
            formInputs.forEach(element => element.disabled = true); // Ensure disabled
            if (addShareBtn) addShareBtn.disabled = true;
            if (loadingIndicator) loadingIndicator.style.display = 'block'; // Show loading while trying anonymous

            // Attempt anonymous sign-in for initial functionality, if no user is present.
            // This is crucial for initial page load when no persistent user is found.
            signInAnonymously(window.firebaseAuth).then(anonUserCredential => { // Use window.firebaseAuth here
                userId = anonUserCredential.user.uid;
                if (displayUserIdSpan) displayUserIdSpan.textContent = userId + " (Anonymous)";
                if (displayUserNameSpan) displayUserNameSpan.textContent = "Guest (Anonymous)";
                // Keep Sign In button visible, Sign Out hidden. Inputs disabled.
                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
                formInputs.forEach(element => element.disabled = true);
                if (addShareBtn) addShareBtn.disabled = true;
                window.dispatchEvent(new CustomEvent('firebaseAuthReady', { detail: { userId: userId, user: anonUserCredential.user } }));
                console.log("Signed in anonymously (no persistent session). User ID:", userId);
            }).catch(anonError => {
                console.error("Anonymous sign-in failed:", anonError);
                if (loadingIndicator) loadingIndicator.textContent = "Failed to load app. Authentication error.";
            }).finally(() => {
                if (loadingIndicator) loadingIndicator.style.display = 'none';
            });
        }
        await loadShares(); // Load shares based on current user status
    });

    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // ---- Google Sign-in/Sign-out Logic ----
    googleSignInBtn.addEventListener('click', async () => {
        try {
            const provider = new window.authFunctions.GoogleAuthProvider();
            // Check if currently anonymous and link, otherwise sign in directly
            if (window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.isAnonymous) {
                await window.authFunctions.signInWithPopup(window.firebaseAuth.currentUser, provider);
                console.log("Anonymous account linked with Google.");
            } else {
                await window.authFunctions.signInWithPopup(window.firebaseAuth, provider); // Use window.firebaseAuth here
                console.log("Signed in with Google.");
            }
            // onAuthStateChanged listener in index.html will handle UI update and data load
        } catch (error) {
            console.error("Google Sign-in failed:", error.code, error.message);
            if (error.code === 'auth/popup-closed-by-user') {
                alert("Sign-in pop-up was closed. Please try again.");
            } else if (error.code === 'auth/cancelled-popup-request') {
                alert("Sign-in already in progress or pop-up blocked. Please try again.");
            } else {
                alert("Failed to sign in with Google. Please try again.");
            }
        }
    });

    googleSignOutBtn.addEventListener('click', async () => {
        try {
            // IMPORTANT: Use window.firebaseAuth directly to ensure access to the initialized auth object
            await window.authFunctions.signOut(window.firebaseAuth);
            console.log("Signed out.");

            // Reset UI state to reflect signed-out status (will trigger onAuthStateChanged to anonymous)
            clearForm(); // Clear the form after sign out
            shareTableBody.innerHTML = ''; // Clear table
            displayUserIdSpan.textContent = "Not logged in";
            displayUserNameSpan.textContent = "Guest";
            googleSignInBtn.style.display = 'block';
            googleSignOutBtn.style.display = 'none';
            addShareBtn.disabled = true; // Disable inputs after sign out
            formInputs.forEach(element => element.disabled = true);

        } catch (error) {
            console.error("Sign-out failed:", error);
            alert("Failed to sign out. Please try again.");
        }
    });
    // ---- End Google Sign-in/Sign-out Logic ----

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
        // Ensure Firebase is initialized and user is authenticated with a *persistent* ID for saving
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser || window.firebaseAuth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
             console.error("Cannot add share: Not signed in with a persistent user.");
             return;
         }

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
            frankingCredits: frankingCredits, // Stored as decimal
            entryDate: entryDate,
            comments: comments,
            userId: window.firebaseAuth.currentUser.uid, // Use current persistent user's UID
            appId: currentAppId // Store the app ID with the share
        };

        try {
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${window.firebaseAuth.currentUser.uid}/shares`);
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
        // Ensure signed in with a persistent user for updating
        if (!window.firebaseAuth || !window.firebaseAuth.currentUser || window.firebaseAuth.currentUser.isAnonymous) {
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
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${window.firebaseAuth.currentUser.uid}/shares`, editDocId);
            await window.firestore.updateDoc(docRef, shareData);
            await loadShares(); // Reload shares after updating
            clearForm(); // Clear form fields and reset to add mode
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
        // Ensure Firebase is initialized and user is authenticated (can be anonymous for viewing existing data)
        if (!window.firestoreDb || !window.firebaseAuth || !window.firebaseAuth.currentUser || !window.firestore) {
            console.log("Firestore not initialized or user not authenticated yet. Skipping loadShares.");
            return;
        }

        shareTableBody.innerHTML = ''; // Clear existing table rows

        try {
            // Get data for the *currently authenticated user* (whether anonymous or Google)
            const currentUserUID = window.firebaseAuth.currentUser.uid;
            const q = window.firestore.query(
                window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserUID}/shares`),
                window.firestore.where("userId", "==", currentUserUID), // Ensure data matches current UID
                window.firestore.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                displayShare(doc.data(), doc.id);
            });
            clearForm(); // Clear form fields after loading
        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. Please check your internet connection and Firebase rules.");
        }
    }

    // Deletes a share from Firestore
    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            // Ensure signed in with a persistent user for deleting
            if (!window.firebaseAuth.currentUser || window.firebaseAuth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
            try {
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${window.firebaseAuth.currentUser.uid}/shares`, docId);
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

        shareDetailModal.style.display = 'flex'; // Show the modal
    }
});
