// This script interacts with Firebase Firestore for data storage.
// Firebase app, db, auth instances, and userId are made globally available
// via window.firestoreDb, window.firebaseAuth, window.getFirebaseUserId(), etc.,
// from the <script type="module"> block in index.html.

document.addEventListener('DOMContentLoaded', function() {
    // --- UI Element References ---
    // Get references to all necessary HTML elements by their IDs
    const mainTitle = document.getElementById('mainTitle'); // Reference to the main title
    const newShareBtn = document.getElementById('newShareBtn');
    const viewDetailsBtn = document.getElementById('viewDetailsBtn');
    const standardCalcBtn = document.getElementById('standardCalcBtn');
    const dividendCalcBtn = document.getElementById('dividendCalcBtn');
    const quickViewSharesBtn = document.getElementById('quickViewSharesBtn');
    const quickViewDropdown = document.getElementById('quickViewDropdown');
    const dropdownSharesList = document.querySelector('.dropdown-shares-list'); // Container for quick view share buttons

    const shareFormSection = document.getElementById('shareFormSection'); // The modal for adding/editing shares
    const formCloseButton = document.querySelector('.form-close-button'); // The 'X' button specifically for the form modal
    const formTitle = document.getElementById('formTitle'); // Title inside the form modal
    const saveShareBtn = document.getElementById('saveShareBtn');
    const cancelFormBtn = document.getElementById('cancelFormBtn');
    const deleteShareFromFormBtn = document.getElementById('deleteShareFromFormBtn');

    const shareNameInput = document.getElementById('shareName');
    const currentPriceInput = document.getElementById('currentPrice');
    const targetPriceInput = document.getElementById('targetPrice');
    const dividendAmountInput = document.getElementById('dividendAmount');
    const frankingCreditsInput = document.getElementById('frankingCredits');
    const commentsInput = document.getElementById('comments');
    const shareTableBody = document.querySelector('#shareTable tbody'); // Table body for desktop view
    const mobileShareCardsContainer = document.getElementById('mobileShareCards'); // Container for mobile card view
    const displayUserIdSpan = document.getElementById('displayUserId'); // Span to display user ID in footer
    const displayUserNameSpan = document.getElementById('displayUserName'); // Span to display user name/email in footer
    const loadingIndicator = document.getElementById('loadingIndicator'); // Loading message

    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

    const shareDetailModal = document.getElementById('shareDetailModal'); // Modal for viewing share details
    // Note: The general '.close-button' selector will handle this modal's close button
    const modalShareName = document.getElementById('modalShareName');
    const modalEntryDate = document.getElementById('modalEntryDate');
    const modalCurrentPrice = document.getElementById('modalCurrentPrice');
    const modalTargetPrice = document.getElementById('modalTargetPrice');
    const modalDividendAmount = document.getElementById('modalDividendAmount');
    const modalFrankingCredits = document.getElementById('modalFrankingCredits');
    const modalComments = document.getElementById('modalComments');
    const modalUnfrankedYieldSpan = document.getElementById('modalUnfrankedYield');
    const modalFrankedYieldSpan = document.getElementById('modalFrankedYield');

    const dividendCalculatorModal = document.getElementById('dividendCalculatorModal'); // Dividend calculator modal
    const calcCloseButton = document.querySelector('.calc-close-button'); // Close button for dividend calculator
    const calcDividendAmountInput = document.getElementById('calcDividendAmount');
    const calcCurrentPriceInput = document.getElementById('calcCurrentPrice');
    const calcFrankingCreditsInput = document.getElementById('calcFrankingCredits');
    const calcUnfrankedYieldSpan = document.getElementById('calcUnfrankedYield');
    const calcFrankedYieldSpan = document.getElementById('calcFrankedYield');

    const standardCalculatorModal = document.getElementById('standardCalculatorModal'); // Standard calculator modal
    const standardCalcCloseButton = document.querySelector('.standard-calc-close-button'); // Close button for standard calculator
    const standardCalcDisplay = document.getElementById('standardCalcDisplay');
    const standardCalcButtons = document.querySelectorAll('#standardCalculatorModal .calc-btn, #standardCalculatorModal .op, #standardCalculatorModal .eq');


    // Array of all form input elements for easy iteration and form clearing
    const formInputs = [
        shareNameInput, currentPriceInput, targetPriceInput,
        dividendAmountInput, frankingCreditsInput, commentsInput
    ];

    // --- State Variables ---
    let db; // Firestore database instance
    let auth; // Firebase Auth instance
    let currentUserId = null; // Stores the current authenticated user's ID
    let currentAppId; // Stores the Firebase project ID (or Canvas app ID)
    let selectedShareDocId = null; // Stores the document ID of the currently selected share
    let allSharesData = []; // Array to hold all loaded share data
    let longPressTimer; // Timer for mobile long press detection
    const LONG_PRESS_THRESHOLD = 500; // Milliseconds for long press
    const KANGA_EMAIL = 'iamkanga@gmail.com'; // Example email, potentially for specific features

    // --- Android Touch Detection Variables (for long press) ---
    let touchStartX = 0;
    let touchStartY = 0;
    let touchMoved = false;
    const TOUCH_MOVE_THRESHOLD = 10; // Pixels to detect significant movement

    // --- Standard Calculator State ---
    let currentInput = '0'; // What's currently shown on the calculator display
    let operator = null; // The current operator (+, -, *, /)
    let previousInput = ''; // The number before the operator was pressed
    let resetDisplay = false; // Flag to indicate if the display should be reset on next digit input


    // --- Initial UI Setup ---
    // Hide modals and dropdown initially
    shareFormSection.style.display = 'none';
    quickViewDropdown.classList.add('hidden');
    standardCalculatorModal.style.display = 'none';
    dividendCalculatorModal.style.display = 'none';
    updateMainButtonsState(false); // Disable main buttons until authenticated
    if (loadingIndicator) loadingIndicator.style.display = 'block'; // Show loading indicator

    // --- Event Listeners for Input Fields ---
    // Convert share name input to uppercase automatically
    if (shareNameInput) {
        shareNameInput.addEventListener('input', function() {
            this.value = this.value.toUpperCase();
        });
    }

    // Allow 'Enter' key to navigate between form inputs or submit form
    formInputs.forEach((input, index) => {
        if (input) {
            input.addEventListener('keydown', function(event) {
                if (event.key === 'Enter') {
                    event.preventDefault(); // Prevent default Enter behavior (e.g., submitting form if it was a <form> tag)
                    if (index === formInputs.length - 1) {
                        // If it's the last input, trigger save button click
                        if (saveShareBtn) saveShareBtn.click();
                    } else {
                        // Otherwise, move focus to the next input
                        if (formInputs[index + 1]) formInputs[index + 1].focus();
                    }
                }
            });
        }
    });

    // --- Centralized Modal Closing Function ---
    // This function hides all elements with the 'modal' class.
    function closeModals() {
        document.querySelectorAll('.modal').forEach(modal => {
            modal.style.display = 'none';
        });
        // Also ensure the quick view dropdown is hidden when any modal is closed
        if (quickViewDropdown) {
            quickViewDropdown.classList.add('hidden');
        }
    }

    // --- Event Listeners for Modal Close Buttons ---
    // Attach the closeModals function to all 'X' buttons (elements with class 'close-button')
    document.querySelectorAll('.close-button').forEach(button => {
        button.addEventListener('click', closeModals);
    });

    // Specific event listener for the form's cancel button
    if (cancelFormBtn) {
        cancelFormBtn.addEventListener('click', handleCancelForm);
    }

    // --- Event Listener for Clicking Outside Modals/Dropdown ---
    // This listener closes modals/dropdowns if the click occurs on the backdrop (outside the content)
    window.addEventListener('click', (event) => {
        if (event.target === shareDetailModal && shareDetailModal) {
            shareDetailModal.style.display = 'none';
        }
        if (event.target === dividendCalculatorModal && dividendCalculatorModal) {
            dividendCalculatorModal.style.display = 'none';
        }
        if (event.target === standardCalculatorModal && standardCalculatorModal) {
            standardCalculatorModal.style.display = 'none';
        }
        if (event.target === shareFormSection && shareFormSection) {
            shareFormSection.style.display = 'none';
        }
        // Close quick view dropdown if click is outside it and not on the quick view button itself
        if (quickViewDropdown && !quickViewDropdown.contains(event.target) && event.target !== quickViewSharesBtn) {
            quickViewDropdown.classList.add('hidden');
        }
    });

    // --- Firebase Initialization and Authentication State Listener ---
    // Listen for the 'firebaseServicesReady' custom event, dispatched from the <script type="module"> block
    window.addEventListener('firebaseServicesReady', async () => {
        // Assign global Firebase instances to local variables
        db = window.firestoreDb;
        auth = window.firebaseAuth;
        currentAppId = window.getFirebaseAppId();

        // Set up the Firebase Authentication state observer
        // This function is called whenever the user's sign-in state changes
        window.authFunctions.onAuthStateChanged(auth, async (user) => {
            if (user) {
                // User is signed in
                currentUserId = user.uid;
                displayUserIdSpan.textContent = user.uid;
                displayUserNameSpan.textContent = user.email || user.displayName || 'Anonymous'; // Display email, display name, or 'Anonymous'
                mainTitle.textContent = "My ASX Share Watchlist"; // Change title when logged in
                console.log("User signed in:", user.uid);
                updateAuthButtons(true); // Show sign-out, hide sign-in
                updateMainButtonsState(true); // Enable main action buttons
                if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading indicator
                await loadShares(); // Load shares for the newly signed-in user
            } else {
                // User is signed out
                currentUserId = null;
                displayUserIdSpan.textContent = 'N/A';
                displayUserNameSpan.textContent = 'Not Signed In';
                mainTitle.textContent = "Kangas ASX Share Watchlist"; // Revert title when logged out
                console.log("User signed out.");
                updateAuthButtons(false); // Show sign-in, hide sign-out
                updateMainButtonsState(false); // Disable main action buttons
                clearShareList(); // Clear shares from UI
                if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading indicator
            }
        });

        // Initial sign-in attempt for Canvas environment or anonymous users
        // This ensures a user is always available for Firestore rules (even if anonymous)
        if (!auth.currentUser) {
            try {
                const userCredential = await window.authFunctions.signInAnonymously(auth);
                console.log("Signed in anonymously:", userCredential.user.uid);
            } catch (error) {
                console.error("Anonymous sign-in failed:", error);
                // In case of failure, app might remain in a disabled state,
                // or specific error message can be shown to the user.
            }
        }
    });

    // --- Authentication Functions ---
    // Google Sign-In button click handler
    if (googleSignInBtn) {
        googleSignInBtn.addEventListener('click', async () => {
            try {
                if (!window.authFunctions.GoogleAuthProviderInstance) {
                    console.error("GoogleAuthProvider instance not found.");
                    alert("Authentication service not ready. Please try again.");
                    return;
                }
                const provider = window.authFunctions.GoogleAuthProviderInstance;

                // If currently signed in anonymously, attempt to link the account
                if (auth.currentUser && auth.currentUser.isAnonymous) {
                    try {
                        const result = await auth.currentUser.linkWithPopup(provider);
                        console.log("Anonymous account linked with Google:", result.user);
                    } catch (error) {
                        if (error.code === 'auth/credential-already-in-use') {
                            // If the Google account is already linked to another Firebase user,
                            // sign in with that Google account instead.
                            console.warn("Credential already in use, signing in with Google account instead.");
                            await window.authFunctions.signInWithPopup(auth, provider);
                        } else {
                            console.error("Error linking anonymous account with Google:", error);
                            alert("Failed to link account: " + error.message);
                        }
                    }
                } else {
                    // Regular Google Sign-In flow for non-anonymous or already signed-out users
                    await window.authFunctions.signInWithPopup(auth, provider);
                    console.log("Google Sign-In successful.");
                }
            } catch (error) {
                console.error("Google Sign-In failed:", error.message);
                alert("Google Sign-In failed: " + error.message);
            }
        });
    }

    // Google Sign-Out button click handler
    if (googleSignOutBtn) {
        googleSignOutBtn.addEventListener('click', async () => {
            try {
                await window.authFunctions.signOut(auth);
                console.log("User signed out from Google.");
                // The onAuthStateChanged listener will handle subsequent UI updates
            } catch (error) {
                console.error("Google Sign-Out failed:", error);
                alert("Google Sign-Out failed: " + error.message);
            }
        });
    }

    // --- Utility Functions for UI State Management ---
    // Toggles visibility of Sign-in/Sign-out buttons
    function updateAuthButtons(isSignedIn) {
        if (googleSignInBtn) googleSignInBtn.style.display = isSignedIn ? 'none' : 'block';
        if (googleSignOutBtn) googleSignOutBtn.style.display = isSignedIn ? 'block' : 'none';
    }

    // Enables/Disables main action buttons
    function updateMainButtonsState(enable) {
        if (newShareBtn) newShareBtn.disabled = !enable;
        if (viewDetailsBtn) viewDetailsBtn.disabled = !enable;
        if (standardCalcBtn) standardCalcBtn.disabled = !enable;
        if (dividendCalcBtn) dividendCalcBtn.disabled = !enable;
        if (quickViewSharesBtn) quickViewSharesBtn.disabled = !enable;
    }

    // --- Modal Display Helper Functions ---
    // Shows a given modal element by setting its display to 'flex' (for centering)
    function showModal(modalElement) {
        modalElement.style.display = 'flex';
        modalElement.scrollTop = 0; // Reset scroll position to top when opening
    }

    // Hides a given modal element
    function hideModal(modalElement) {
        modalElement.style.display = 'none';
    }

    // --- Share Data Management Functions ---
    // Loads shares from Firestore for the current user
    async function loadShares() {
        // Ensure DB and user ID are available before attempting to load
        if (!db || !currentUserId) {
            console.warn("Firestore DB or User ID not available for loading shares.");
            clearShareList(); // Clear UI if no user
            return;
        }

        if (loadingIndicator) loadingIndicator.style.display = 'block'; // Show loading indicator
        clearShareList(); // Clear existing UI elements before loading new ones
        allSharesData = []; // Clear previous data from the array

        try {
            // Construct a query to get shares belonging to the current user
            const sharesCol = window.firestore.collection(db, 'shares');
            const q = window.firestore.query(sharesCol, window.firestore.where("userId", "==", currentUserId));
            const querySnapshot = await window.firestore.getDocs(q);

            // Iterate through the results and add to UI and allSharesData array
            querySnapshot.forEach((doc) => {
                const share = { id: doc.id, ...doc.data() };
                allSharesData.push(share); // Store the full share data
                addShareToTable(share); // Add to desktop table view
                addShareToMobileCards(share); // Add to mobile card view
            });
            console.log("Shares loaded successfully.");
            updateQuickViewDropdown(); // Update the quick view dropdown after loading
        } catch (error) {
            console.error("Error loading shares:", error);
            // Changed from alert to console error for this specific permission error after load
            // since it might be a data consistency issue rather than an app-breaking one for the user
            console.error("If you see 'Missing or insufficient permissions' here, check your Firestore Security Rules and your data's 'userId' field for consistency.");
        } finally {
            if (loadingIndicator) loadingIndicator.style.display = 'none'; // Hide loading indicator
        }
    }

    // Adds a single share object to the desktop table view
    function addShareToTable(share) {
        const row = shareTableBody.insertRow();
        row.dataset.docId = share.id; // Store Firestore document ID on the row element

        // Populate table cells with share data
        row.insertCell().textContent = share.shareName;
        row.insertCell().textContent = share.currentPrice ? `$${share.currentPrice.toFixed(2)}` : 'N/A';
        row.insertCell().textContent = share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : 'N/A';

        const dividendCell = row.insertCell();
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.currentPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.currentPrice, share.frankingCredits);
        dividendCell.innerHTML = `Div: $${share.dividendAmount ? share.dividendAmount.toFixed(2) : 'N/A'}<br>
                                  Unyield: ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A'}<br>
                                  FrYield: ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A'}`;

        row.insertCell().textContent = share.comments || 'No comments';

        // Add event listeners for row selection (click)
        row.addEventListener('click', function() {
            handleRowClick(this);
        });

        // Add touch event listeners for mobile long press (to edit)
        row.addEventListener('touchstart', handleTouchStart);
        row.addEventListener('touchmove', handleTouchMove);
        row.addEventListener('touchend', handleTouchEnd);
    }

    // Adds a single share object to the mobile card view
    function addShareToMobileCards(share) {
        const card = document.createElement('div');
        card.className = 'share-card';
        card.dataset.docId = share.id; // Store Firestore document ID on the card element

        // Calculate yields for display
        const unfrankedYield = calculateUnfrankedYield(share.dividendAmount, share.currentPrice);
        const frankedYield = calculateFrankedYield(share.dividendAmount, share.currentPrice, share.frankingCredits);

        // Populate card HTML with share data
        card.innerHTML = `
            <h3>${share.shareName}</h3>
            <p><strong>Entered:</strong> ${share.entryDate || 'N/A'}</p>
            <p><strong>Current:</strong> ${share.currentPrice ? `$${share.currentPrice.toFixed(2)}` : 'N/A'}</p>
            <p><strong>Target:</strong> ${share.targetPrice ? `$${share.targetPrice.toFixed(2)}` : 'N/A'}</p>
            <p><strong>Dividend:</strong> $${share.dividendAmount ? share.dividendAmount.toFixed(2) : 'N/A'}</p>
            <p><strong>Franking:</strong> ${share.frankingCredits ? share.frankingCredits + '%' : 'N/A'}</p>
            <p><strong>Unfranked Yield:</strong> ${unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A'}</p>
            <p><strong>Franked Yield:</strong> ${frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A'}</p>
            <p class="card-comments"><strong>Comments:</strong> ${share.comments || 'No comments'}</p>
        `;
        mobileShareCardsContainer.appendChild(card); // Add card to the container

        // Add event listeners for card selection (click)
        card.addEventListener('click', function() {
            handleCardClick(this);
        });

        // Add touch event listeners for mobile long press (to edit)
        card.addEventListener('touchstart', handleTouchStart);
        card.addEventListener('touchmove', handleTouchMove);
        card.addEventListener('touchend', handleTouchEnd);
    }

    // Clears all shares from the table and mobile card display
    function clearShareList() {
        if (shareTableBody) shareTableBody.innerHTML = '';
        if (mobileShareCardsContainer) mobileShareCardsContainer.innerHTML = '';
        selectedShareDocId = null; // Clear selected share
        if (viewDetailsBtn) viewDetailsBtn.disabled = true; // Disable view details button
    }

    // Handles click on a table row
    function handleRowClick(row) {
        const docId = row.dataset.docId;
        selectShare(docId, row); // Select the share based on its document ID
    }

    // Handles click on a mobile share card
    function handleCardClick(card) {
        const docId = card.dataset.docId;
        selectShare(docId, card); // Select the share based on its document ID
    }

    // Selects a share by its document ID and visually highlights it
    function selectShare(docId, element = null) {
        // Remove 'selected' class from any previously selected row/card
        document.querySelectorAll('.share-list-section tr.selected, .mobile-share-cards .share-card.selected').forEach(el => {
            el.classList.remove('selected');
        });

        // Add 'selected' class to the clicked row/card or find it if element is null
        if (element) {
            element.classList.add('selected');
        } else {
            // If element is not provided (e.g., called from quick view button),
            // find and select the corresponding element in both table and mobile cards
            const row = shareTableBody.querySelector(`tr[data-doc-id="${docId}"]`);
            if (row) row.classList.add('selected');
            const card = mobileShareCardsContainer.querySelector(`.share-card[data-doc-id="${docId}"]`);
            if (card) card.classList.add('selected');
        }

        selectedShareDocId = docId; // Update the selected share's document ID
        if (viewDetailsBtn) viewDetailsBtn.disabled = false; // Enable view details button
    }

    // --- Mobile Touch Event Handlers for Long Press (Edit) ---
    function handleTouchStart(e) {
        // Record starting touch coordinates
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchMoved = false; // Reset touchMoved flag

        clearTimeout(longPressTimer); // Clear any existing timer
        // Set a new timer for long press
        longPressTimer = setTimeout(() => {
            if (!touchMoved) { // If finger hasn't moved significantly
                const element = e.currentTarget; // The row or card element
                const docId = element.dataset.docId;
                selectShare(docId, element); // Select the share
                showEditFormForSelectedShare(); // Open edit form
                e.preventDefault(); // Prevent default browser actions (like scrolling or click)
            }
        }, LONG_PRESS_THRESHOLD);
    }

    function handleTouchMove(e) {
        // Calculate distance moved
        const currentX = e.touches[0].clientX;
        const currentY = e.touches[0].clientY;
        const dx = Math.abs(currentX - touchStartX);
        const dy = Math.abs(currentY - touchStartY);

        // If movement exceeds threshold, it's not a long press
        if (dx > TOUCH_MOVE_THRESHOLD || dy > TOUCH_MOVE_THRESHOLD) {
            touchMoved = true;
            clearTimeout(longPressTimer); // Cancel long press timer
        }
    }

    function handleTouchEnd(e) {
        clearTimeout(longPressTimer); // Clear timer when touch ends
        // If it was a quick tap, the standard 'click' event will follow.
        // If it was a long press, e.preventDefault() in handleTouchStart would have already stopped the click.
    }


    // --- Form Modal Functions (Add/Edit Share) ---
    // Shows the share form modal
    function showShareForm(isEdit = false) {
        if (!shareFormSection) return;
        clearForm(); // Clear inputs before showing
        deleteShareFromFormBtn.disabled = !isEdit; // Enable delete button only if in edit mode
        formTitle.textContent = isEdit ? 'Edit Share' : 'Add Share'; // Set modal title
        showModal(shareFormSection); // Display the modal
    }

    // Clears all input fields in the share form
    function clearForm() {
        selectedShareDocId = null; // Deselect any share
        formInputs.forEach(input => {
            if (input) input.value = '';
        });
        if (document.getElementById('editDocId')) document.getElementById('editDocId').value = '';
    }

    // Populates the share form with data from a given share object
    function populateForm(share) {
        if (!share) return;
        shareNameInput.value = share.shareName || '';
        currentPriceInput.value = share.currentPrice || '';
        targetPriceInput.value = share.targetPrice || '';
        dividendAmountInput.value = share.dividendAmount || '';
        frankingCreditsInput.value = share.frankingCredits || '';
        commentsInput.value = share.comments || '';
        document.getElementById('editDocId').value = share.id || ''; // Set hidden ID for edit mode
    }

    // Handles the 'Cancel' button click in the form modal
    function handleCancelForm() {
        clearForm(); // Clear the form
        hideModal(shareFormSection); // Hide the modal
    }

    // --- Data Operations (Add, Update, Delete) ---
    // Saves a share (either adds new or updates existing) to Firestore
    async function saveShare() {
        if (!db || !currentUserId) {
            alert("User not signed in. Please sign in to save shares.");
            return;
        }

        // Get values from form inputs
        const shareName = shareNameInput.value.trim().toUpperCase();
        const currentPrice = parseFloat(currentPriceInput.value);
        const targetPrice = parseFloat(targetPriceInput.value);
        const dividendAmount = parseFloat(dividendAmountInput.value);
        const frankingCredits = parseFloat(frankingCreditsInput.value);
        const comments = commentsInput.value.trim();
        const docId = document.getElementById('editDocId').value; // Get the document ID if in edit mode

        if (!shareName) {
            alert("Share Name (ASX Code) is required.");
            return;
        }

        // Prepare share data object
        const shareData = {
            shareName,
            currentPrice: isNaN(currentPrice) ? null : currentPrice,
            targetPrice: isNaN(targetPrice) ? null : targetPrice,
            dividendAmount: isNaN(dividendAmount) ? null : dividendAmount,
            frankingCredits: isNaN(frankingCredits) ? null : frankingCredits,
            comments,
            userId: currentUserId, // Associate share with the current user
            entryDate: new Date().toISOString().split('T')[0] // Format date asYYYY-MM-DD
        };

        try {
            if (docId) {
                // If docId exists, update an existing share
                const shareDocRef = window.firestore.doc(db, 'shares', docId);
                await window.firestore.updateDoc(shareDocRef, shareData);
                console.log("Share updated:", docId);
                alert("Share updated successfully!");
            } else {
                // If no docId, add a new share
                const sharesColRef = window.firestore.collection(db, 'shares');
                await window.firestore.addDoc(sharesColRef, shareData);
                console.log("Share added.");
                alert("Share added successfully!");
            }
            hideModal(shareFormSection); // Close the form modal
            await loadShares(); // Reload the share list to reflect changes
        } catch (error) {
            console.error("Error saving share:", error);
            alert("Error saving share: " + error.message);
        }
    }

    // Deletes the currently selected share from Firestore
    async function deleteShare() {
        if (!selectedShareDocId || !db || !currentUserId) {
            alert("No share selected for deletion or user not signed in.");
            return;
        }

        // Custom confirmation modal (as alert()/confirm() are not allowed)
        if (!confirm("Are you sure you want to delete this share?")) { // Using prompt for now, recommend custom modal
            return;
        }

        try {
            const shareDocRef = window.firestore.doc(db, 'shares', selectedShareDocId);
            await window.firestore.deleteDoc(shareDocRef);
            console.log("Share deleted:", selectedShareDocId);
            alert("Share deleted successfully!");
            hideModal(shareFormSection); // Close the form modal
            await loadShares(); // Reload shares after deletion
        } catch (error) {
            console.error("Error deleting share:", error);
            alert("Error deleting share: " + error.message);
        }
    }

    // --- Display Share Detail Modal ---
    // Shows the detailed view of the currently selected share
    function showShareDetails() {
        if (!selectedShareDocId) {
            alert("Please select a share to view details.");
            return;
        }

        // Find the selected share data from the allSharesData array
        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);

        if (selectedShare) {
            // Populate the modal with share data
            modalShareName.textContent = selectedShare.shareName || 'N/A';
            modalEntryDate.textContent = selectedShare.entryDate || 'N/A';
            modalCurrentPrice.textContent = selectedShare.currentPrice ? `$${selectedShare.currentPrice.toFixed(2)}` : 'N/A';
            modalTargetPrice.textContent = selectedShare.targetPrice ? `$${selectedShare.targetPrice.toFixed(2)}` : 'N/A';
            modalDividendAmount.textContent = selectedShare.dividendAmount ? `$${selectedShare.dividendAmount.toFixed(2)}` : 'N/A';
            modalFrankingCredits.textContent = selectedShare.frankingCredits ? `${selectedShare.frankingCredits}%` : 'N/A';
            modalComments.textContent = selectedShare.comments || 'No comments';

            // Calculate and display yields
            const unfrankedYield = calculateUnfrankedYield(selectedShare.dividendAmount, selectedShare.currentPrice);
            const frankedYield = calculateFrankedYield(selectedShare.dividendAmount, selectedShare.currentPrice, selectedShare.frankingCredits);

            modalUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A';
            modalFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A';

            showModal(shareDetailModal); // Display the share details modal
        } else {
            alert("Selected share data not found.");
        }
    }

    // Opens the edit form pre-filled with data of the selected share
    function showEditFormForSelectedShare() {
        if (!selectedShareDocId) {
            alert("Please select a share to edit.");
            return;
        }

        const selectedShare = allSharesData.find(share => share.id === selectedShareDocId);
        if (selectedShare) {
            populateForm(selectedShare); // Fill the form with selected share's data
            showShareForm(true); // Show the form in edit mode
        } else {
            alert("Selected share data not found for editing.");
        }
    }


    // --- Dividend Calculator Logic ---
    // Calculates unfranked dividend yield
    function calculateUnfrankedYield(dividend, price) {
        if (typeof dividend !== 'number' || typeof price !== 'number' || price <= 0) {
            return null; // Return null if inputs are invalid
        }
        return (dividend / price) * 100;
    }

    // Calculates franked dividend yield (grossed-up)
    function calculateFrankedYield(dividend, price, franking) {
        if (typeof dividend !== 'number' || typeof price !== 'number' || price <= 0) {
            return null;
        }
        // Ensure franking is a number between 0 and 100, convert to decimal
        const effectiveFranking = (typeof franking === 'number' && franking >= 0 && franking <= 100) ? (franking / 100) : 0;
        // Formula for grossed-up dividend assuming a 30% company tax rate
        const grossedUpDividend = dividend / (1 - (0.3 * effectiveFranking));
        return (grossedUpDividend / price) * 100;
    }

    // Updates the displayed calculations in the dividend calculator modal
    function updateDividendCalculations() {
        const dividend = parseFloat(calcDividendAmountInput.value);
        const price = parseFloat(calcCurrentPriceInput.value);
        const franking = parseFloat(calcFrankingCreditsInput.value);

        const unfrankedYield = calculateUnfrankedYield(dividend, price);
        const frankedYield = calculateFrankedYield(dividend, price, franking);

        calcUnfrankedYieldSpan.textContent = unfrankedYield !== null ? unfrankedYield.toFixed(2) + '%' : 'N/A';
        calcFrankedYieldSpan.textContent = frankedYield !== null ? frankedYield.toFixed(2) + '%' : 'N/A';
    }

    // Listen for input changes in dividend calculator fields to update calculations in real-time
    if (calcDividendAmountInput) calcDividendAmountInput.addEventListener('input', updateDividendCalculations);
    if (calcCurrentPriceInput) calcCurrentPriceInput.addEventListener('input', updateDividendCalculations);
    if (calcFrankingCreditsInput) calcFrankingCreditsInput.addEventListener('input', updateDividendCalculations);

    // --- Standard Calculator Logic ---
    // Resets the standard calculator to its initial state
    function resetCalculator() {
        currentInput = '0';
        operator = null;
        previousInput = '';
        resetDisplay = false;
        standardCalcDisplay.value = currentInput;
    }

    // Appends a digit or decimal point to the current input
    function appendToDisplay(value) {
        if (resetDisplay) {
            currentInput = value; // Start a new number if display was reset
            resetDisplay = false;
        } else {
            if (currentInput === '0' && value !== '.') {
                currentInput = value; // Replace initial '0' unless it's a decimal point
            } else {
                currentInput += value;
            }
        }
        standardCalcDisplay.value = currentInput;
    }

    // Handles operator button clicks
    function handleOperator(nextOperator) {
        if (currentInput === '') return; // Do nothing if display is empty

        if (previousInput !== '' && operator) {
            calculateResult(); // If there's a previous operation, calculate it first
        }
        previousInput = currentInput; // Store current number as previous
        operator = nextOperator; // Set new operator
        resetDisplay = true; // Prepare to start a new number
    }

    // Performs the calculation based on stored numbers and operator
    function calculateResult() {
        let result;
        const prev = parseFloat(previousInput);
        const current = parseFloat(currentInput);

        if (isNaN(prev) || isNaN(current) || !operator) {
            return; // Exit if operands or operator are missing
        }

        switch (operator) {
            case '+':
                result = prev + current;
                break;
            case '-':
                result = prev - current;
                break;
            case '*':
                result = prev * current;
                break;
            case '/':
                if (current === 0) {
                    alert("Cannot divide by zero!"); // Custom alert for division by zero
                    resetCalculator();
                    return;
                }
                result = prev / current;
                break;
            case '%': // Calculate percentage of the previous number (e.g., 100 % 10 = 10)
                result = prev * (current / 100);
                break;
            default:
                return;
        }

        currentInput = result.toString(); // Update current input with result
        standardCalcDisplay.value = currentInput; // Display result
        previousInput = ''; // Clear previous input
        operator = null; // Clear operator
        resetDisplay = true; // Set flag to start new number
    }

    // Event listeners for standard calculator buttons
    standardCalcButtons.forEach(button => {
        button.addEventListener('click', () => {
            const value = button.dataset.value;
            if (value === 'C') {
                resetCalculator();
            } else if (value === '=') {
                calculateResult();
            } else if (['+', '-', '*', '/', '%'].includes(value)) {
                handleOperator(value);
            } else {
                appendToDisplay(value);
            }
        });
    });

    // --- Quick View Shares Dropdown Logic ---
    // Event listener for Quick View Shares button
    if (quickViewSharesBtn) {
        quickViewSharesBtn.addEventListener('click', (event) => {
            event.stopPropagation(); // Prevent event from bubbling to window and closing dropdown immediately
            quickViewDropdown.classList.toggle('hidden'); // Toggle visibility of the dropdown
        });
    }

    // Function to Populate and Update the Quick View Shares Dropdown
    function updateQuickViewDropdown() {
        if (!dropdownSharesList) return;
        dropdownSharesList.innerHTML = ''; // Clear any existing buttons

        // If no shares, display a message
        if (allSharesData.length === 0) {
            const noSharesMsg = document.createElement('div');
            noSharesMsg.textContent = 'No shares in watchlist.';
            noSharesMsg.style.padding = '10px 15px';
            noSharesMsg.style.textAlign = 'center';
            noSharesMsg.style.color = '#777';
            dropdownSharesList.appendChild(noSharesMsg);
            return;
        }

        // Create a button for each share and add to the dropdown
        allSharesData.forEach(share => {
            const button = document.createElement('button');
            button.textContent = share.shareName; // Display ASX code
            button.className = 'dropdown-share-button'; // Add a class for specific styling if needed
            button.addEventListener('click', (event) => {
                event.stopPropagation(); // Stop propagation to prevent window click from closing dropdown immediately
                selectShare(share.id); // Select the share in the main list
                showShareDetails(); // Show the details modal for the selected share
                quickViewDropdown.classList.add('hidden'); // Hide the dropdown after selection
            });
            dropdownSharesList.appendChild(button);
        });
    }
});
