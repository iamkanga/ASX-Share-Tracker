// This script interacts with Firebase Firestore for data storage.
// It now *reacts* to authentication state changes managed by index.html.

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

    // References for the Google Sign-in/Sign-out buttons (listeners set here)
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
    const modalComments = document.getElementById('modalComments'); // Corrected ID reference for modal

    // Array of all form input elements for 'Enter' key navigation
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

    // Firebase instances (will be populated from window. properties after index.html loads)
    let db;
    let auth;
    let currentUserId;
    let currentAppId;

    // --- Initial UI State (Mostly managed by index.html) ---
    // Ensure modal is hidden on load
    if (shareDetailModal) shareDetailModal.style.display = 'none';

    // Capitalize share name input
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    // Enter key navigation for form inputs
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

    // --- Listen for Firebase Auth Ready event (Dispatched by index.html) ---
    // This event signals that Firebase services are ready and a user (anonymous or persistent) is set.
    window.addEventListener('firebaseAuthReady', async (event) => {
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        currentUserId = event.detail.userId;
        currentAppId = window.getFirebaseAppId();

        // Load shares only after auth is confirmed ready
        if (db && currentUserId && window.firestore) {
            await loadShares();
        } else {
            console.warn("Firestore not ready or userId not available after firebaseAuthReady. Cannot load shares.");
        }
    });

    // Event listener for the Add/Update Share button
    // Its enabled/disabled state is managed by onAuthStateChanged in index.html.
    if (addShareBtn) {
        addShareBtn.addEventListener('click', handleAddOrUpdateShare);
    }

    // ---- Google Sign-in/Sign-out Logic ----
    // These listeners use the global auth object and authFunctions exposed by index.html.
    // They don't need to be wrapped in firebaseAuthReady as 'auth' itself is checked internally.
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                if (!auth || !window.authFunctions) {
                    alert("App not fully loaded. Please wait.");
                    return;
                }
                const provider = new window.authFunctions.GoogleAuthProvider();
                console.log("Initiating Google Sign-in redirect...");
                await window.authFunctions.signInWithRedirect(auth, provider);
                // Page will redirect, so no code here will execute. Result handled by index.html on next load.
            } catch (error) {
                console.error("Google Sign-in initial call failed:", error.code, error.message);
                alert("Failed to initiate Google Sign-in. Please try again. Check browser pop-up settings.");
            }
        });
    }

    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                if (!auth || !window.authFunctions) {
                    alert("App not fully loaded. Please wait.");
                    return;
                }
                await window.authFunctions.signOut(auth);
                console.log("Signed out. UI update handled by index.html's onAuthStateChanged.");
                clearForm(); // Clear form fields
                if (shareTableBody) shareTableBody.innerHTML = ''; // Clear displayed shares
                // index.html's onAuthStateChanged will handle anonymous re-authentication and UI update
            } catch (error) {
                console.error("Sign-out failed:", error);
                alert("Failed to sign out. Please try again.");
            }
        });
    }

    // --- Data Management Functions ---
    async function handleAddOrUpdateShare() {
        // Double-check auth state before performing data operations
        if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
             alert("Please sign in with Google to add/save shares permanently for syncing. Data added anonymously will not sync across devices.");
             console.error("Cannot add/update share: Not signed in with a persistent user.");
             return;
         }
        if (!currentUserId || !db || !window.firestore) {
            console.error("Firebase not fully ready for data operations.");
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
        // Re-check persistent user status before update
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
        if (!db || !currentUserId || !window.firestore || !auth) {
            console.log("Firestore/Auth not ready. Skipping loadShares.");
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
            if (querySnapshot.empty) {
                console.log(`No shares found for user ID: ${currentUserId}`);
            }
            querySnapshot.forEach((doc) => displayShare(doc.data(), doc.id));
            clearForm();
        } catch (e) { console.error("Error loading documents: ", e); alert("Failed to load shares. Check console."); }
    }

    async function deleteShare(docId, shareName) {
        if (confirm(`Are you sure you want to delete ${shareName}?`)) {
            // Re-check persistent user status before delete
            if (!auth || !auth.currentUser || auth.currentUser.isAnonymous) {
                alert("Please sign in with Google to delete shares permanently.");
                return;
            }
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
        if (modalEntryDate) modalEntryName.textContent = share.entryDate; // Corrected typo here
        if (modalCurrentPrice) modalCurrentPrice.textContent = share.currentPrice ? `$${share.currentPrice}` : 'N/A';
        if (modalTargetPrice) modalTargetPrice.textContent = share.targetPrice ? `$${share.targetPrice}` : 'N/A';
        if (modalDividendAmount) modalDividendAmount.textContent = share.dividendAmount ? `$${share.dividendAmount}` : 'N/A';
        if (modalFrankingCredits) modalFrankingCredits.textContent = (share.frankingCredits || share.frankingCredits === 0) ? `${parseFloat(share.frankingCredits) * 100}%` : 'N/A';
        if (modalComments) modalComments.textContent = share.comments || 'No comments.';
        if (shareDetailModal) shareDetailModal.style.display = 'flex';
    }
});
