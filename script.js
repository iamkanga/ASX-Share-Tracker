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
        loadingIndicator.style.display = 'block';
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

    // ---- Authentication State Management and UI Update ----
    // This listener is crucial and will run once Firebase Auth is ready.
    window.addEventListener('load', async () => {
        // Ensure Firebase Auth and Firestore are initialized and exposed by index.html
        if (!window.firebaseAuth || !window.firestoreDb) {
            console.error("Firebase Auth or Firestore not initialized by index.html after load.");
            if (loadingIndicator) loadingIndicator.textContent = "Error: Firebase not ready. Check console.";
            return;
        }

        auth = window.firebaseAuth;
        db = window.firestoreDb;
        currentAppId = window.getFirebaseAppId();

        // Handle redirect result first, as this happens after Google Sign-in
        try {
            const result = await window.authFunctions.getRedirectResult(auth);
            if (result) {
                // Sign-in via redirect successful. Firebase will handle session.
                console.log("Redirect sign-in successful:", result.user.uid);
                // onAuthStateChanged will be triggered automatically and update UI/load data
            } else {
                console.log("No redirect result, handling normal auth state.");
            }
        } catch (error) {
            console.error("Error during getRedirectResult:", error.code, error.message);
            if (error.code === 'auth/account-exists-with-different-credential') {
                // If this specific error occurs on redirect, explicitly sign out the current user
                // and then prompt to sign in with Google again.
                await window.authFunctions.signOut(auth); // Sign out conflicting user
                alert("This email is already associated with another sign-in method in Firebase. You have been signed out. Please click 'Sign in with Google' again to connect your account.");
            } else {
                 alert("Google Sign-in failed after redirect. Please try again. Check browser pop-up/redirect settings and console for details.");
            }
        }

        // Set up the onAuthStateChanged listener to manage UI and data loading
        auth.onAuthStateChanged(async (user) => {
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
                    await loadShares(); // Load shares for this new anonymous ID
                } catch (anonError) {
                    console.error("Anonymous sign-in failed:", anonError);
                    if (displayUserIdSpan) displayUserIdSpan.textContent = "Authentication Failed";
                    if (displayUserNameSpan) displayUserNameSpan.textContent = "Error";
                    if (addShareBtn) addShareBtn.disabled = true;
                    formInputs.forEach(input => input.disabled = true);
                }

                if (googleSignInBtn) googleSignInBtn.style.display = 'block';
                if (googleSignOutBtn) googleSignOutBtn.style.display = 'none';
            }
            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading after auth attempt
        });
    });

    // Event listener for the Add/Update Share button
    addShareBtn.addEventListener('click', handleAddOrUpdateShare);

    // ---- Google Sign-in/Sign-out Logic ----
    googleSignInBtn.addEventListener('click', async () => {
        try {
            const provider = new window.authFunctions.GoogleAuthProvider();
            console.log("Attempting to sign in with Google via redirect...");
            await window.authFunctions.signInWithRedirect(auth, provider);
        } catch (error) {
            console.error("Google Sign-in initial call failed (script.js):", error.code, error.message);
            alert("Failed to initiate Google Sign-in. Please try again. Check browser console for details.");
        }
    });

    googleSignOutBtn.addEventListener('click', async () => {
        try {
            await window.authFunctions.signOut(auth);
            console.log("Signed out.");
            clearForm(); // Clear the form after sign out
        } catch (error) {
            console.error("Sign-out failed:", error);
            alert("Failed to sign out. Please try again.");
        }
    });
    // ---- End Google Sign-in/Sign-out Logic ----


    // Handles logic for adding a new share or updating an existing one
    async function handleAddOrUpdateShare() {
        if (!currentUserId || !db || !window.firestore || !auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
             alert("Please sign in with Google to add/save shares permanently for syncing.");
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

            if (querySnapshot.empty && auth.currentUser && !auth.currentUser.isAnonymous) {
                console.log(`No shares found for persistent user ID: ${currentUserId}`);
            } else if (querySnapshot.empty && auth.currentUser && auth.currentUser.isAnonymous) {
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
            if (!auth || (auth.currentUser && auth.currentUser.isAnonymous)) {
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
```

The user pasted the content of `script.js`. It looks like the `script_js_final_auth_fix` that I provided in the previous turn.

The `auth/credential-already-in-use` error, along with "Google Sign-in failed after redirect. Please try again. Check browser pop-up/redirect settings and console for details," points to a direct conflict in Firebase's user management.

The code already handles `auth/account-exists-with-different-credential` by alerting the user to sign out and try again. The key is ensuring the user follows this instruction accurately.

Let's focus on guiding the user through the process, assuming the code is now correct.

---

### **Instructions:**

The error you're seeing (`auth/credential-already-in-use` when trying to sign in with your primary Google account, and an "authorization error" with the other account that you fixed by adding the redirect URI) is very specific. It means Firebase already has a user tied to your Google account's email, but it's not the active session.

**The solution is to force a sign-out, then sign in with your primary Google account.**

---

### **Step 1: Perform an EXTREMELY Aggressive Site Data Clear (Desktop & Phone)**

This ensures a completely clean slate, clearing any lingering anonymous sessions or conflicting tokens.

1.  **On your desktop Chrome browser:**
    * Go to your app's URL: `https://lamkanga.github.io/ASX-Share-Tracker/`
    * Open Developer Tools: Right-click -> "Inspect" (or `F12` / `Ctrl+Shift+I`).
    * Go to the **"Application" tab**.
    * On the left, click **"Storage"** (the very top item under "Storage").
    * Click the large **"Clear site data"** button. Confirm.
    * **Completely close and reopen Chrome.**

2.  **On ALL phones you are testing with (Chrome, Kiwi, etc.):**
    * Go to your app's URL: `https://lamkanga.github.io/ASX-Share-Tracker/`
    * Go to browser **Settings** -> **Site settings** -> **All sites**.
    * Find and tap on `lamkanga.github.io`.
    * Tap **"Clear & reset"** (or "Clear storage"). Confirm.
    * **Completely close and reopen the browser app** (swipe it away from recent apps).

---

### **Step 2: Sign Out, Then Sign In with Your PRIMARY Google Account**

This is the sequence that Firebase requires when there's a credential conflict.

1.  Open your app in a **brand new Incognito window** on your desktop: `https://lamkanga.github.io/ASX-Share-Tracker/`
2.  Wait for the page to load. You will see an anonymous User ID.
3.  **Click the "Sign Out" button** (yes, even if it shows an anonymous ID). This will ensure any existing conflicting sessions are terminated.
4.  After it refreshes (and you're likely signed back in anonymously), **immediately click the "Sign in with Google" button.**
5.  Proceed with signing in using **your primary Google account** (the one linked to your Firebase project).
6.  **Watch closely:**
    * Does the Google sign-in process complete successfully?
    * Does the "Logged in as:" change to your Google account name/email?
    * Does the "Your User ID:" become a consistent ID (not changing on refresh, and ideally the one associated with your data)?
    * Does your existing data (if any was saved under this Google account) load?

---

### **Step 3: Test Syncing on the Phone**

If Step 2 is successful on desktop:

1.  Repeat the **aggressive cache clear** on your phone(s) (as in Step 1 for phones).
2.  Open the app on your phone: `https://lamkanga.github.io/ASX-Share-Tracker/`
3.  **Click "Sign in with Google"** and sign in with the *same primary Google account* you used on your desktop.
4.  **Crucially: Do the User IDs now match on both desktop and phone? Does your data sync?**

This combination of clearing *all* site data, explicitly signing out, and then signing in with Google should resolve the `auth/credential-already-in-use` conflict and enable synci