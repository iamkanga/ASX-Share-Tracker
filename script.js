// This script interacts with Firebase Firestore for data storage.
// It now directly accesses Firebase instances and functions exposed globally on the 'window' object
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
    const displayUserIdSpan = document.getElementById('displayUserId');
    const displayUserNameSpan = document.getElementById('displayUserName');
    const loadingIndicator = document.getElementById('loadingIndicator');

    // References for the Google Sign-in/Sign-out buttons
    const googleSignInBtn = document.getElementById('googleSignInBtn');
    const googleSignOutBtn = document.getElementById('googleSignOutBtn');

    // Firebase variables
    let db;
    let auth;
    let currentUserId;
    let currentAppId;

    // UI Initialization
    if (addShareBtn) addShareBtn.disabled = true;
    [shareNameInput, currentPriceInput, targetPriceInput, dividendAmountInput, frankingCreditsInput, commentsInput].forEach(input => {
        if (input) input.disabled = true;
    });
    if (loadingIndicator) loadingIndicator.style.display = 'block';

    // Google Sign-in handler (with fix applied)
    window.addEventListener('firebaseAuthReady', async (event) => {
        db = window.myFirestoreDb;
        auth = window.myFirebaseAuth;
        currentUserId = event.detail.userId;
        currentAppId = window.getAppId();

        if (displayUserIdSpan) displayUserIdSpan.textContent = currentUserId;
        if (displayUserNameSpan) displayUserNameSpan.textContent = event.detail.user ? (event.detail.user.displayName || event.detail.user.email || 'Guest') : 'Guest';
        if (loadingIndicator) loadingIndicator.style.display = 'none';

        if (googleSignInBtn && !googleSignInBtn.dataset.listenerAttached) {
            googleSignInBtn.addEventListener('click', async () => {
                try {
                    const provider = window.myGoogleAuthProvider;
                    const authInstance = window.myFirebaseAuth;

                    if (!authInstance || !provider) {
                        alert("Authentication not initialized. Please refresh the page.");
                        return;
                    }

                    console.log("Attempting Google Sign-in...");
                    await window.mySignInWithPopup(authInstance, provider);
                    console.log("Google Sign-in successful.");
                } catch (error) {
                    console.error("Google Sign-in failed:", error);
                    alert(`Google sign-in failed: ${error.message}`);
                }
            });
            googleSignInBtn.dataset.listenerAttached = 'true';
        }

        if (googleSignOutBtn && !googleSignOutBtn.dataset.listenerAttached) {
            googleSignOutBtn.addEventListener('click', async () => {
                try {
                    await window.mySignOut(window.myFirebaseAuth);
                    console.log("Signed out.");
                    if (shareTableBody) shareTableBody.innerHTML = '';
                } catch (error) {
                    console.error("Sign-out failed:", error);
                }
            });
            googleSignOutBtn.dataset.listenerAttached = 'true';
        }

        if (db && currentUserId) await loadShares();
    });

    async function loadShares() {
        try {
            const q = window.firestoreUtils.query(
                window.firestoreUtils.collection(db, `artifacts/${currentAppId}/users/${currentUserId}/shares`),
                window.firestoreUtils.where("userId", "==", currentUserId),
                window.firestoreUtils.where("appId", "==", currentAppId)
            );
            const querySnapshot = await window.firestoreUtils.getDocs(q);
            if (shareTableBody) shareTableBody.innerHTML = '';
            querySnapshot.forEach((doc) => {
                const share = doc.data();
                const row = shareTableBody.insertRow();
                row.insertCell(0).textContent = share.entryDate;
                row.insertCell(1).textContent = share.name;
                row.insertCell(2).textContent = share.currentPrice;
                row.insertCell(3).textContent = share.targetPrice;
                row.insertCell(4).textContent = share.dividendAmount;
                row.insertCell(5).textContent = share.frankingCredits * 100 + '%';
                row.insertCell(6).textContent = share.comments;
                row.insertCell(7).textContent = 'Actions'; // Placeholder for buttons
            });
        } catch (e) {
            console.error("Error loading shares:", e);
        }
    }
});
