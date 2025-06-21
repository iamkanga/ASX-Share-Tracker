// This script now interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseUserId(), etc.,
// from the <script type="module"> block in index.html.
// Crucially, window.firestore now holds direct references to Firestore SDK functions.

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
    const loadingIndicator = document.getElementById('loadingIndicator'); // Reference to loading div

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
    let currentUserId; // User's unique ID
    let currentAppId; // Application's unique ID

    // ---- Initial UI State ----
    addShareBtn.disabled = true; // Disable button until Firebase is ready
    formInputs.forEach(input => input.disabled = true); // Disable inputs too


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
                    // Otherwise, move focus to the next input
                    formInputs[index + 1].focus();
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
        currentUserId = event.detail.userId; // Get the user ID
        currentAppId = window.getFirebaseAppId(); // Get the app ID
        displayUserIdSpan.textContent = currentUserId; // Display the user ID

        // Enable UI elements now that Firebase is ready
        addShareBtn.disabled = false;
        formInputs.forEach(input => input.disabled = false);
        loadingIndicator.style.display = 'none'; // Hide loading message

        await loadShares(); // Load shares now that Firebase and user ID are ready
    });

    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        if (!currentUserId || !db) {
            console.error("Firebase not initialized or user not authenticated yet.");
            alert("App is still loading or failed to connect. Please wait a moment or refresh.");
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
            return ''; // Return empty string if input is not a valid number
        }
        return value > 1 ? value / 100 : value; // Convert to decimal if > 1 (assuming percentage)
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
            frankingCredits: frankingCredits, // Stored as decimal
            entryDate: entryDate,
            comments: comments,
            userId: currentUserId, // Important for security rules and user-specific data
            appId: currentAppId // Important for multi-app environments
        };

        try {
            // Use window.firestore to call the imported Firestore functions
            const sharesCollectionRef = window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`);
            await window.firestore.addDoc(sharesCollectionRef, shareData);
            await loadShares(); // Reload shares after adding to update table
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

        const shareData = {
            name: shareNameInput.value.trim(),
            currentPrice: currentPriceInput.value,
            targetPrice: targetPriceInput.value,
            dividendAmount: dividendAmountInput.value,
            frankingCredits: processFrankingCreditsInput(frankingCreditsInput.value),
            comments: commentsInput.value.trim(),
            entryDate: new Date().toLocaleDateString('en-AU') // Update entry date to reflect last modification
        };

        try {
            // Use window.firestore to call the imported Firestore functions
            const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, editDocId);
            await window.firestore.updateDoc(docRef, shareData);
            await loadShares(); // Reload shares after updating
            clearForm(); // Clear form fields and reset to add mode
        } catch (e) {
            console.error("Error updating document: ", e);
            alert("Failed to update share. Please try again.");
        }
    }

    // Displays a single share in the table
    function displayShare(share, docId) { // docId is now passed from loadShares for edit/delete
        const row = shareTableBody.insertRow();

        // Column order in index.html: Entry Date, Share Name, Current Price, Target Price, Dividend Amount, Franking Credits, Comments, Actions
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
            editShare(docId, share); // Pass Firestore document ID and share data for editing
        };
        actionsCell.appendChild(editButton);

        // Delete Button
        const deleteButton = document.createElement('button');
        deleteButton.textContent = 'Delete';
        deleteButton.classList.add('delete-btn');
        deleteButton.onclick = function() {
            deleteShare(docId, share.name); // Pass Firestore document ID and share name for confirmation
        };
        actionsCell.appendChild(deleteButton);
    }

    // Loads all shares from Firestore and displays them in the table
    async function loadShares() {
        if (!db || !currentUserId) {
            return; // Exit if Firebase isn't ready. This will be called again by firebaseAuthReady.
        }

        shareTableBody.innerHTML = ''; // Clear existing table rows

        try {
            // Use window.firestore to call the imported Firestore functions
            const q = window.firestore.query(
                window.firestore.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestore.where("userId", "==", currentUserId),
                window.firestore.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestore.getDocs(q);

            querySnapshot.forEach((doc) => {
                displayShare(doc.data(), doc.id); // Pass document data and its unique Firestore ID
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
            try {
                // Use window.firestore to call the imported Firestore functions
                const docRef = window.firestore.doc(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`, docId);
                await window.firestore.deleteDoc(docRef); // Delete the document
                await loadShares(); // Reload shares after deletion
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
        editDocId = docId; // Store the document ID for the update operation
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
