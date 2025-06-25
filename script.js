<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>ASX Share Tracker</title>
    <!-- Favicon: Eggplant emoji -->
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🍆</text></svg>">

    <link rel="stylesheet" href="style.css?v=9">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap" rel="stylesheet">
    <!-- Font Awesome for icons -->
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css">
</head>
<body>
    <header>
        <div class="header-top-row">
            <h1 id="mainTitle">My ASX Share Watchlist</h1>
            <div class="main-buttons">
                <div class="button-row">
                    <button id="newShareBtn"><i class="fas fa-plus"></i> Add</button>
                    <button id="viewDetailsBtn" disabled><i class="fas fa-eye"></i> View</button>
                    <button id="dividendCalcBtn"><i class="fas fa-calculator"></i> Dividend Calculator</button>
                    <button id="standardCalcBtn"><i class="fas fa-calculator"></i> Standard Calculator</button>
                </div>
            </div>
        </div>
        <div class="watchlist-management-section">
            <label for="watchlistSelect">Select Watchlist:</label>
            <select id="watchlistSelect" disabled>
                <option value="">Loading...</option>
            </select>
            <button id="addWatchlistBtn" disabled><i class="fas fa-plus"></i> Add New</button>
            <button id="renameWatchlistBtn" disabled><i class="fas fa-edit"></i> Rename</button>
        </div>
        <div id="asxCodeButtonsContainer" class="asx-code-buttons-container">
            <!-- ASX Code buttons will be populated here by JavaScript -->
        </div>
    </header>

    <main class="container">
        <div id="loadingIndicator" class="loading">Loading shares...</div>

        <section class="share-list-section">
            <div class="sort-controls">
                <label for="sortSelect">Sort By:</label>
                <select id="sortSelect">
                    <option value="shareName-asc">ASX Code (A-Z)</option>
                    <option value="shareName-desc">ASX Code (Z-A)</option>
                    <option value="lastFetchedPrice-desc">Current Price (High to Low)</option>
                    <option value="lastFetchedPrice-asc">Current Price (Low to High)</option>
                    <option value="dividendAmount-desc">Dividend (High to Low)</option>
                    <option value="dividendAmount-asc">Dividend (Low to High)</option>
                    <option value="entryDate-desc">Entry Date (Newest First)</option>
                    <option value="entryDate-asc">Entry Date (Oldest First)</option>
                </select>
            </div>
            
            <div class="table-container">
                <table id="shareTable">
                    <thead>
                        <tr>
                            <th style="width: 15%;">ASX Code</th>
                            <th style="width: 20%;">Current Price</th>
                            <th style="width: 15%;">Target Price</th>
                            <th style="width: 30%;">Dividend & Yield</th>
                            <th style="width: 20%;">Comments</th>
                        </tr>
                    </thead>
                    <tbody>
                        <!-- Share data will be populated here by JavaScript -->
                    </tbody>
                </table>
            </div>

            <!-- Mobile-specific Share Cards -->
            <div id="mobileShareCards" class="mobile-share-cards">
                <!-- Mobile share cards will be populated here by JavaScript -->
            </div>
        </section>
    </main>

    <footer class="fixed-footer">
        <button id="googleAuthBtn" class="google-auth-btn">Sign In</button>
    </footer>

    <!-- Share Form Modal (Add/Edit Share) -->
    <section id="shareFormSection" class="modal">
        <div class="modal-content">
            <button class="close-button form-close-button">&times;</button>
            <h2 id="formTitle">Add New Share</h2>
            <input type="hidden" id="editDocId">

            <label for="shareName">ASX Code:</label>
            <input type="text" id="shareName" placeholder="e.g., CBA" required>

            <label for="currentPrice">Current Price ($):</label>
            <input type="number" id="currentPrice" step="0.01" min="0" placeholder="e.g., 95.50">

            <label for="targetPrice">Target Price ($):</label>
            <input type="number" id="targetPrice" step="0.01" min="0" placeholder="e.g., 100.00">

            <label for="dividendAmount">Dividend Amount ($ per share):</label>
            <input type="number" id="dividendAmount" step="0.001" min="0" placeholder="e.g., 3.00 (Annual)">

            <label for="frankingCredits">Franking Credits (%):</label>
            <input type="number" id="frankingCredits" step="0.1" min="0" max="100" placeholder="e.g., 70 (for 70%)">

            <div class="comments-form-container">
                <h3>Comments <button id="addCommentSectionBtn" class="add-section-btn">+</button></h3>
                <div id="commentsFormContainer">
                    <!-- Dynamic comment sections will be added here -->
                </div>
            </div>
            
            <div class="form-action-buttons">
                <button id="saveShareBtn">Save Share</button>
                <button id="cancelFormBtn" class="secondary-buttons">Cancel</button>
                <button id="deleteShareFromFormBtn" class="danger-button" style="display: none;">Delete</button>
            </div>
        </div>
    </section>

    <!-- Share Detail Modal -->
    <section id="shareDetailModal" class="modal">
        <div class="modal-content">
            <button class="close-button">&times;</button>
            <h2 id="modalShareName">Share Details</h2>
            <p><strong>Entry Date:</strong> <span id="modalEntryDate"></span></p>
            <p><strong>Current Price:</strong> <span id="modalCurrentPriceDetailed"></span></p>
            <p><strong>Target Price:</strong> <span id="modalTargetPrice"></span></p>
            <p><strong>Dividend Amount:</strong> <span id="modalDividendAmount"></span></p>
            <p><strong>Franking Credits:</strong> <span id="modalFrankingCredits"></span></p>
            <p><strong>Unfranked Yield:</strong> <span id="modalUnfrankedYield"></span></p>
            <p><strong>Franked Yield (Grossed-Up):</strong> <span id="modalFrankedYield"></span></p>

            <div id="modalCommentsContainer" class="modal-comments-sections">
                <!-- Detailed comments will be loaded here -->
            </div>

            <div class="modal-action-buttons">
                <button id="editShareFromDetailBtn"><i class="fas fa-edit"></i> Edit Share</button>
            </div>
        </div>
    </section>

    <!-- Dividend Calculator Modal -->
    <section id="dividendCalculatorModal" class="modal">
        <div class="modal-content calculator-modal-content">
            <button class="close-button calc-close-button">&times;</button>
            <h2>Dividend Yield Calculator</h2>
            <div class="calc-input-group">
                <label for="calcDividendAmount">Annual Dividend ($ per share):</label>
                <input type="number" id="calcDividendAmount" step="0.001" min="0" placeholder="e.g., 3.00">
            </div>
            <div class="calc-input-group">
                <label for="calcCurrentPrice">Current Share Price ($):</label>
                <input type="number" id="calcCurrentPrice" step="0.01" min="0" placeholder="e.g., 95.50">
            </div>
            <div class="calc-input-group">
                <label for="calcFrankingCredits">Franking Credits (%):</label>
                <input type="number" id="calcFrankingCredits" step="0.1" min="0" max="100" placeholder="e.g., 70">
            </div>
            
            <hr>

            <p><strong>Unfranked Yield:</strong> <span id="calcUnfrankedYield">-</span></p>
            <p><strong>Franked Yield (Grossed-Up):</strong> <span id="modalFrankedYield">-</span></p>

            <hr>

            <h3>Estimate Dividend Income</h3>
            <div class="investment-value-section">
                <p>
                    <label for="investmentValueSelect">Based on Investment of:</label>
                    <select id="investmentValueSelect">
                        <option value="1000">AUD 1,000</option>
                        <option value="5000">AUD 5,000</option>
                        <option value="10000" selected>AUD 10,000</option>
                        <option value="20000">AUD 20,000</option>
                        <option value="50000">AUD 50,000</option>
                        <option value="100000">AUD 100,000</option>
                    </select>
                </p>
                <p><strong>Estimated Annual Dividend:</strong> <span id="calcEstimatedDividend">-</span></p>
            </div>
        </div>
    </section>

    <!-- Standard Calculator Modal -->
    <section id="calculatorModal" class="modal">
        <div class="modal-content calculator-modal-content">
            <button class="close-button">&times;</button>
            <h2>Standard Calculator</h2>
            <div class="calculator-display">
                <div id="calculatorInput" class="calculator-input"></div>
                <div id="calculatorResult" class="calculator-result">0</div>
            </div>
            <div class="calculator-buttons">
                <button class="calc-btn clear" data-action="clear">AC</button>
                <button class="calc-btn operator" data-action="percentage">%</button>
                <button class="calc-btn operator" data-action="divide">÷</button>
                <button class="calc-btn number" data-value="7">7</button>
                <button class="calc-btn number" data-value="8">8</button>
                <button class="calc-btn number" data-value="9">9</button>
                <button class="calc-btn operator" data-action="multiply">×</button>
                <button class="calc-btn number" data-value="4">4</button>
                <button class="calc-btn number" data-value="5">5</button>
                <button class="calc-btn number" data-value="6">6</button>
                <button class="calc-btn operator" data-action="subtract">-</button>
                <button class="calc-btn number" data-value="1">1</button>
                <button class="calc-btn number" data-value="2">2</button>
                <button class="calc-btn number" data-value="3">3</button>
                <button class="calc-btn operator" data-action="add">+</button>
                <button class="calc-btn number zero" data-value="0">0</button>
                <button class="calc-btn decimal" data-value=".">.</button>
                <button class="calc-btn equals" data-action="calculate">=</button>
            </div>
        </div>
    </section>

    <!-- Hidden input for selected share ID -->
    <input type="hidden" id="editDocId" value="">

    <script type="module">
        // Firebase initialization (provided by the Canvas environment)
        import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
        import { getAuth, signInAnonymously, signInWithCustomToken, GoogleAuthProvider, onAuthStateChanged, signOut, signInWithPopup } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
        import { getFirestore, doc, getDoc, addDoc, setDoc, updateDoc, deleteDoc, onSnapshot, collection, query, where, getDocs, deleteField } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

        document.addEventListener('DOMContentLoaded', async function() {
            console.log("index.html (v8) script module loaded and DOMContentLoaded fired.");

            // Global variables provided by Canvas runtime, now safely inside DOMContentLoaded
            const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-app-id';
            const rawFirebaseConfig = typeof __firebase_config !== 'undefined' ? __firebase_config : '{}';
            const initialAuthToken = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null; // Now correctly scoped

            let firebaseConfig;
            try {
                firebaseConfig = JSON.parse(rawFirebaseConfig);
            } catch (e) {
                console.error("Firebase: Failed to parse __firebase_config. Using empty object.", e);
                firebaseConfig = {};
            }

            // Critical: Ensure projectId and apiKey are always defined for Firebase initialization
            if (!firebaseConfig.projectId || typeof firebaseConfig.projectId !== 'string' || firebaseConfig.projectId.trim() === '') {
                firebaseConfig.projectId = 'asx-watchlist-app'; // Fallback to a generic project ID
                console.warn("Firebase: 'projectId' was missing or invalid in __firebase_config. Using fallback 'asx-watchlist-app'.");
            }
            if (!firebaseConfig.apiKey || typeof firebaseConfig.apiKey !== 'string' || firebaseConfig.apiKey.trim() === '') {
                // Provide a dummy API key if missing. This is a stop-gap to prevent the 'auth/invalid-api-key'
                // error from completely crashing Auth initialization. True authentication will still fail
                // if the real key is bad, but the app won't crash on load.
                firebaseConfig.apiKey = 'YOUR_DUMMY_API_KEY_HERE'; // Placeholder
                console.warn("Firebase: 'apiKey' was missing or invalid in __firebase_config. Using a dummy key. Authentication might not work fully.");
            }

            console.log("Firebase: Initializing with config:", firebaseConfig); // Log the full config

            // Initialize Firebase
            const app = initializeApp(firebaseConfig);
            const db = getFirestore(app);
            const auth = getAuth(app); // This is where auth fails if apiKey is bad

            // Expose Firebase objects globally for script.js to use
            window.firestoreDb = db;
            window.firebaseAuth = auth;
            window.getFirebaseAppId = () => appId;
            window.firestore = { // Expose specific Firestore functions
                collection: collection,
                doc: doc,
                getDoc: getDoc,
                addDoc: addDoc,
                setDoc: setDoc,
                updateDoc: updateDoc,
                deleteDoc: deleteDoc,
                onSnapshot: onSnapshot,
                query: query,
                where: where,
                getDocs: getDocs,
                deleteField: deleteField
            };
            window.authFunctions = { // Expose specific Auth functions
                onAuthStateChanged: onAuthStateChanged,
                signOut: signOut,
                signInWithPopup: signInWithPopup,
                GoogleAuthProviderInstance: new GoogleAuthProvider(),
                signInAnonymously: signInAnonymously,
                signInWithCustomToken: signInWithCustomToken
            };

            // Attempt anonymous sign-in or custom token sign-in
            async function authenticateUser() {
                try {
                    if (initialAuthToken) { // initialAuthToken is now defined within this scope
                        await signInWithCustomToken(auth, initialAuthToken);
                        console.log("Firebase: Signed in with custom token.");
                    } else {
                        await signInAnonymously(auth);
                        console.log("Firebase: Signed in anonymously.");
                    }
                } catch (error) {
                    console.error("Firebase: Authentication failed during sign-in attempt. App might have limited functionality without proper auth.", error);
                    // Continue, but functionality might be limited
                } finally {
                     // Dispatch a custom event regardless of auth success, so script.js can try to load UI
                    const event = new Event('firebaseServicesReady');
                    window.dispatchEvent(event);
                }
            }

            authenticateUser();
        }); // End DOMContentLoaded for module script
    </script>
    <script src="script.js?v=56"></script>
</body>
</html>
