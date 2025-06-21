// This script will now interact with Firebase Firestore for data storage.
// The Firebase app, db, auth instances, and userId are made globally available
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
    let db;
    let currentUserId;
    let currentAppId; // New variable to store the app ID

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
                    addShareBtn.click(); // If last input, click the button
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
        db = window.firestoreDb;
        currentUserId = event.detail.userId;
        currentAppId = window.getFirebaseAppId(); // Get the app ID
        displayUserIdSpan.textContent = currentUserId; // Display the user ID
        await loadShares(); // Load shares now that Firebase and user ID are ready
    });

    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        if (!currentUserId) {
            console.error("User not authenticated. Cannot add/update share.");
            alert("App is still authenticating. Please wait a moment and try again.");
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
        const entryDate = new Date().toLocaleDateString('en-AU'); // Get current date

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
            // Add a new document to the user's private collection
            // Path: /artifacts/{appId}/users/{userId}/shares
            await firestore.addDoc(firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`), shareData);
            await loadShares(); // Reload shares after adding
            clearForm(); // Clear form fields
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

        const shareData = {
            name: shareNameInput.value.trim(),
            currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value,
            dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(),
            entryDate: new Date().toLocaleDateString('en-AU') // Update entry date on edit
        };

        try {
            // Update the document in Firestore
            // Path: /artifacts/{appId}/users/{userId}/shares/{docId}
            const docRef = firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, editDocId);
            await firestore.updateDoc(docRef, shareData);
            await loadShares(); // Reload shares after updating
            clearForm(); // Clear form fields and reset to add mode
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Please try again.");
        }
    }

    // Displays a single share in the table
    function displayShare(share, docId, index) { // Added docId and index for consistency
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
            editShare(docId, share); // Pass docId and share data to edit
        };
        actionsCell.appendChild(editButton);

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = function() {
            deleteShare(docId, share.name); // Pass docId and share name to delete
        };
        actionsCell.appendChild(deleteButton);
    }

    // Loads all shares from Firestore and displays them in the table
    async function loadShares() {
        if (!db || !currentUserId) {
            console.log("Firestore not initialized or user not authenticated yet. Skipping loadShares.");
            return; // Exit if Firebase isn't ready
        }

        shareTableBody.innerHTML = ''; // Clear existing table rows

        try {
            // Create a query to get shares for the current user and app
            // Path: /artifacts/{appId}/users/{userId}/shares
            const q = firestore.query(
                firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                firestore.where("userId", "==", currentUserId), // Ensure data belongs to current user
                firestore.where("appId", "==", currentAppId) // Ensure data belongs to current app
            );
            const querySnapshot = await firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                displayShare(doc.data(), doc.id); // Pass document data and ID
            });
            clearForm(); // Clear form fields after loading
        } catch (e) {
            console.error("Error loading documents: ", e);
            alert("Failed to load shares. Please check your internet connection.");
        }
    }

    // Deletes a share from Firestore
    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            try {
                // Delete the document from Firestore
                // Path: /artifacts/{appId}/users/{userId}/shares/{docId}
                const docRef = firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await firestore.deleteDoc(docRef);
                await loadShares(); // Reload shares after deletion
            } catch (e) {
                console.error("Error deleting document: ", e);
                alert("Failed to delete share. Please try again.");
            }
        }
    }

    // Populates the form fields with data of the share being edited
    function editShare(docId, shareData) { // Now accepts docId and shareData
        shareNameInput.value = shareData.name;
        currentPriceInput.value = shareData.currentPrice;
        targetPriceInput.value = shareData.targetPrice;
        dividendAmountInput.value = shareData.dividendAmount;
        frankingCreditsInput.value = (shareData.frankingCredits || shareData.frankingCredits === 0) ?
                                        parseFloat(shareData.frankingCredits) * 100 : '';
        commentsInput.value = shareData.comments;

        addShareBtn.textContent = 'Update Share';
        isEditing = true;
        editDocId = docId; // Store the document ID for update operation
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
        editDocId = null; // Clear the stored document ID
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

// Import the 'firebase/firestore' module as 'firestore'
// This is necessary because the main script is not a module, but firebase itself is.
// window.firestore is defined by the script type="module" in index.html for convenient access.
const firestore = {
    initializeApp: window.firebaseApp,
    getFirestore: window.firestoreDb,
    collection: (db, path) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.collection(db, path) : null,
    addDoc: (collectionRef, data) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.addDoc(collectionRef, data) : null,
    getDocs: (queryRef) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.getDocs(queryRef) : null,
    doc: (db, path, docId) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.doc(db, path, docId) : null,
    updateDoc: (docRef, data) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.updateDoc(docRef, data) : null,
    deleteDoc: (docRef) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.deleteDoc(docRef) : null,
    query: (collectionRef, ...queryConstraints) => window.firebaseAuth.currentUser ? window.firebaseAuth.firestore.query(collectionRef, ...queryConstraints) : null,
    where: window.firestore.where // Using the where function from the global firestore object
};
