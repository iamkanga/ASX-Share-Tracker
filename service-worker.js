/* File Version: v13 */
/* Last Updated: 2025-06-25 */

:root {
    --primary-color: #28a745; /* Green */
    --secondary-color: #007bff; /* Blue */
    --background-color: #f8f9fa; /* Light Gray */
    --card-background-color: #ffffff; /* White */
    --border-color: #dee2e6; /* Light Gray Border */
    --text-color: #343a40; /* Dark Gray */
    --header-footer-bg: #e2e6ea; /* Slightly darker light gray */
    --button-hover-bg: #218838; /* Darker Green */
    --button-active-bg: #1e7e34; /* Even Darker Green */
    --danger-color: #dc3545; /* Red */
    --danger-hover-bg: #c82333; /* Darker Red */
    --shadow-light: rgba(0, 0, 0, 0.1);
    --shadow-medium: rgba(0, 0, 0, 0.2);
    --focus-ring-color: rgba(40, 167, 69, 0.5); /* Green with transparency */

    /* Calculator Specific Colors */
    --calc-bg: #333; /* Dark background */
    --calc-display-bg: #222; /* Even darker for display */
    --calc-display-text: #fff;
    --calc-input-text: #ccc;
    --calc-number-btn-bg: #e0e0e0;
    --calc-number-btn-hover: #d0d0d0;
    --calc-operator-btn-bg: #007bff; /* Blue */
    --calc-operator-btn-hover: #0069d9;
    --calc-clear-btn-bg: #ffc107; /* Yellow */
    --calc-clear-btn-hover: #e0a800;
    --calc-equals-btn-bg: var(--primary-color);
    --calc-equals-btn-hover: var(--button-hover-bg);
}

html {
    scroll-padding-top: 130px; /* Space for sticky header. Matches body padding-top. */
}

body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    background-color: var(--background-color);
    color: var(--text-color);
    line-height: 1.6;
    display: flex;
    flex-direction: column;
    min-height: 100vh;
    padding-top: 130px; /* Space for sticky header (adjust if header height changes) */
}

header {
    background-color: var(--header-footer-bg);
    padding: 0.75rem 1.5rem; /* Reduced padding */
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 2px 4px var(--shadow-light);
    text-align: center;
    flex-shrink: 0; /* Prevents header from shrinking */
    position: sticky; /* Make header sticky */
    top: 0;
    z-index: 20; /* Ensure it stays on top of other content */
}

.header-top-row {
    display: flex;
    justify-content: center; /* Center items for combined title and buttons */
    align-items: center;
    margin-bottom: 0.75rem; /* Reduced margin */
    flex-wrap: wrap; /* Allow wrapping on small screens */
    gap: 0.5rem; /* Gap between title and buttons */
}

h1 {
    color: var(--primary-color);
    margin: 0;
    font-size: 1.8rem;
    flex-grow: 1; /* Allows title to take available space */
    text-align: center; /* Center title on both desktop and mobile */
    min-width: fit-content; /* Allow title to shrink but not wrap unless truly necessary */
    padding-right: 0.5rem; /* Small space before buttons */
}

.main-buttons {
    display: flex;
    flex-direction: row; /* Always try to keep buttons in a row */
    gap: 0.5rem; /* Space between buttons */
    justify-content: center; /* Center the buttons within their container */
    flex-wrap: wrap; /* Allow wrapping for responsiveness */
    width: auto; /* Allow buttons to take only necessary width */
    flex-grow: 1; /* Allow buttons container to grow */
}

.button-row {
    display: flex;
    gap: 0.5rem;
    justify-content: center; /* Center buttons within their row */
    flex-wrap: wrap; /* Allow buttons to wrap */
    flex-grow: 1; /* Allow the button row to grow */
}

.main-buttons button,
.form-action-buttons button,
.modal-action-buttons button,
.watchlist-management-section button {
    background-color: var(--primary-color); /* Consistent primary color */
    color: white;
    border: none;
    padding: 0.6rem 1rem; /* Smaller padding */
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9rem; /* Smaller font size */
    transition: background-color 0.2s ease, transform 0.1s ease;
    box-shadow: 0 2px 5px var(--shadow-light);
    outline: none; /* Remove default outline */
    flex-shrink: 0; /* Prevent buttons from shrinking too much */
    flex-grow: 0; /* Don't force them to grow unless needed by min-width */
    min-width: 90px; /* Adjusted minimum width for smaller buttons */
}

.main-buttons button:hover,
.form-action-buttons button:hover,
.modal-action-buttons button:hover,
.watchlist-management-section button:hover {
    background-color: var(--button-hover-bg);
    transform: translateY(-1px);
}

.main-buttons button:active,
.form-action-buttons button:active,
.modal-action-buttons button:active,
.watchlist-management-section button:active {
    background-color: var(--button-active-bg);
    transform: translateY(0);
    box-shadow: 0 1px 3px var(--shadow-medium) inset;
}

.main-buttons button:disabled,
.form-action-buttons button:disabled,
.modal-action-buttons button:disabled,
.watchlist-management-section button:disabled {
    background-color: #cccccc;
    cursor: not-allowed;
    box-shadow: none;
    transform: none;
}

/* Specific styling for secondary buttons - keeping for generic use if needed */
.secondary-buttons { /* This class is now for the parent div if multiple buttons */
    background-color: var(--secondary-color); /* Removed direct button styling, use on elements with class */
}
.danger-button {
    background-color: var(--danger-color) !important; /* Important to override primary-color */
}
.danger-button:hover {
    background-color: var(--danger-hover-bg) !important;
}


/* NEW: Watchlist Management Section */
.watchlist-management-section {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping */
    justify-content: center; /* Center items */
    align-items: center;
    padding: 0.75rem 1rem; /* Adjusted padding */
    background-color: var(--card-background-color);
    border-bottom: 1px solid var(--border-color);
    gap: 0.5rem; /* Space between items */
    box-shadow: 0 1px 3px var(--shadow-light);
}

.watchlist-management-section label {
    font-weight: bold;
    color: var(--text-color);
    font-size: 0.95rem; /* Slightly smaller font */
    flex-shrink: 0; /* Prevent label from shrinking */
}

.watchlist-management-section select {
    padding: 0.5rem 0.8rem; /* Adjusted padding */
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: white;
    font-size: 0.95rem; /* Slightly smaller font */
    min-width: 140px; /* Adjusted min width */
    flex-grow: 1; /* Allow select to grow */
    max-width: 200px; /* Limit max width */
    -webkit-appearance: none; /* Remove default arrow on select */
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 8px center; /* Adjusted position */
    background-size: 18px; /* Slightly smaller arrow */
    cursor: pointer;
}

.watchlist-management-section select:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--focus-ring-color);
    outline: none;
}


/* ASX Code Buttons Container */
.asx-code-buttons-container {
    padding: 0.75rem 1.5rem; /* Adjusted padding */
    background-color: var(--background-color);
    display: flex;
    flex-wrap: wrap;
    gap: 0.4rem; /* Smaller gap */
    justify-content: center;
    border-bottom: 1px solid var(--border-color);
    box-shadow: 0 1px 3px var(--shadow-light);
}

.asx-code-button {
    background-color: var(--secondary-color); /* Changed from grey to blue */
    color: white;
    border: none;
    padding: 0.4rem 0.8rem; /* Smaller padding */
    border-radius: 5px;
    cursor: pointer;
    font-size: 0.85rem; /* Smaller font size */
    transition: background-color 0.2s ease, transform 0.1s ease;
    box-shadow: 0 1px 3px var(--shadow-light);
    outline: none;
    white-space: nowrap; /* Prevent buttons from wrapping text */
}

.asx-code-button:hover {
    background-color: var(--calc-operator-btn-hover); /* Darker blue */
    transform: translateY(-1px);
}

.asx-code-button:active {
    background-color: #0062cc; /* Even darker blue */
    transform: translateY(0);
    box-shadow: 0 1px 2px var(--shadow-medium) inset;
}

.loading {
    text-align: center;
    padding: 2rem;
    font-size: 1.2rem;
    color: var(--secondary-color);
}

.share-list-section {
    padding: 1.5rem;
    flex-grow: 1; /* Allows this section to fill remaining space */
    display: flex;
    flex-direction: column;
    align-items: center; /* Center content horizontally */
}

.share-list-section h2 {
    color: var(--primary-color);
    text-align: center;
    margin-bottom: 1.5rem;
    font-size: 1.6rem;
}

.sort-controls {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-bottom: 1rem;
    background-color: var(--card-background-color);
    padding: 0.75rem 1.25rem;
    border-radius: 8px;
    box-shadow: 0 1px 3px var(--shadow-light);
}

.sort-controls select {
    padding: 0.4rem 0.8rem;
    border: 1px solid var(--border-color);
    border-radius: 5px;
    font-size: 0.9rem;
}

table {
    width: 100%;
    max-width: 1200px; /* Limit table width on large screens */
    border-collapse: separate; /* For rounded corners */
    border-spacing: 0;
    margin-bottom: 2rem;
    background-color: var(--card-background-color);
    box-shadow: 0 4px 8px var(--shadow-light);
    border-radius: 12px; /* Rounded corners for the whole table */
    overflow: hidden; /* Ensures content respects border-radius */
    table-layout: fixed; /* Fix table layout to respect column widths */
}

th, td {
    padding: 1rem 0.75rem;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    vertical-align: top;
    word-wrap: break-word; /* Allow long words to break */
    /* Ensure consistent height for rows */
    height: 60px; /* Example fixed height for table rows */
    overflow: hidden; /* Hide overflowing content */
}

/* Explicit column widths for better table layout */
th:nth-child(1), td:nth-child(1) { width: 15%; } /* ASX Code */
th:nth-child(2), td:nth-child(2) { width: 20%; } /* Current Price */
th:nth-child(3), td:nth-child(3) { width: 15%; } /* Target Price */
th:nth-child(4), td:nth-child(4) { width: 30%; } /* Dividend & Yield */
th:nth-child(5), td:nth-child(5) { width: 20%; } /* Comments */


th {
    background-color: var(--primary-color);
    color: white;
    font-weight: bold;
    position: sticky;
    top: 0;
    z-index: 10;
    font-size: 0.95rem;
}

/* Rounded corners for table headers */
th:first-child {
    border-top-left-radius: 12px;
}
th:last-child {
    border-top-right-radius: 12px;
}

tbody tr:last-child td {
    border-bottom: none;
}

tbody tr:hover {
    background-color: #f1f1f1;
    cursor: pointer;
}

tbody tr.selected {
    background-color: #cfe2ff; /* Light blue for selected */
    border: 2px solid var(--secondary-color); /* Full border */
    box-shadow: 0 0 8px var(--secondary-color);
}


/* Current Price Display in Table */
.current-price-display {
    display: flex;
    flex-direction: column; /* Stack price and date */
    align-items: flex-start;
}
.current-price-display .price {
    font-weight: bold;
    font-size: 1.1em;
}
.current-price-display .date {
    font-size: 0.75em;
    color: #666;
}

/* Price Up/Down/No Change Indicators */
.price-up {
    color: #28a745; /* Green */
}
.price-down {
    color: #dc3545; /* Red */
}
.price-no-change {
    color: #343a40; /* Default text color */
}

/* Dividend Yield Cell Styling */
.dividend-yield-cell-content {
    font-size: 0.85rem;
    line-height: 1.3;
    margin-bottom: 0.2rem;
}
.dividend-yield-cell-content .value {
    font-weight: bold;
}


/* Modal Styles */
.modal {
    display: none; /* Hidden by default */
    position: fixed; /* Stay in place */
    z-index: 100; /* Sit on top */
    left: 0;
    top: 0;
    width: 100%; /* Full width */
    height: 100%; /* Full height */
    overflow: auto; /* Enable scroll if needed */
    background-color: rgba(0,0,0,0.6); /* Darker overlay for better centering */
    display: flex; /* Use flexbox for centering */
    justify-content: center; /* Center content horizontally */
    align-items: center; /* Center content vertically */
    padding: 1rem; /* Padding around the modal content */
    box-sizing: border-box; /* Include padding in width/height */
}

.modal-content {
    background-color: var(--card-background-color);
    margin: auto; /* For browsers that don't fully support flex centering */
    padding: 2rem;
    border: 1px solid var(--border-color);
    border-radius: 12px;
    box-shadow: 0 5px 15px var(--shadow-medium);
    width: 90%; /* Responsive width */
    max-width: 600px; /* Max width for desktop */
    position: relative;
    box-sizing: border-box; /* Include padding in width calculation */
    max-height: 90vh; /* Limit height to prevent overflow on small screens */
    overflow-y: auto; /* Enable scrolling within modal content */
    display: flex; /* Use flex for internal content layout */
    flex-direction: column;
}

.close-button {
    color: #aaa;
    position: absolute;
    top: 10px;
    right: 20px;
    font-size: 28px;
    font-weight: bold;
    cursor: pointer;
    transition: color 0.2s ease;
    background: none !important; /* Override button styles */
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
}

.close-button:hover,
.close-button:focus {
    color: #333;
    text-decoration: none;
}

.modal-content h2,
.modal-content h3 {
    color: var(--primary-color);
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 0.5rem;
    margin-bottom: 1rem;
}

.modal-content p {
    margin-bottom: 0.75rem;
}

.modal-content strong {
    color: var(--text-color);
}

.modal-comments-sections {
    margin-top: 1.5rem;
    padding-top: 1rem;
    border-top: 1px solid var(--border-color);
}

.comment-section {
    background-color: #f1f1f1;
    padding: 1rem;
    border-radius: 8px;
    margin-bottom: 1rem;
}
.comment-section h4 {
    margin-top: 0;
    margin-bottom: 0.5rem;
    color: var(--secondary-color);
    font-size: 1.1rem;
}
.comment-section p {
    margin: 0;
    font-size: 0.95rem;
}

.modal-action-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 2rem;
}

/* Form Styles */
#shareFormSection .modal-content {
    display: flex;
    flex-direction: column;
    gap: 1rem;
}

#shareFormSection input[type="text"],
#shareFormSection input[type="number"],
#shareFormSection textarea,
.comment-title-input,
.comment-text-input {
    width: calc(100% - 20px); /* Adjust for padding */
    padding: 0.75rem 10px;
    margin-bottom: 0.5rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    font-size: 1rem;
    box-sizing: border-box; /* Include padding in width */
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

#shareFormSection input:focus,
#shareFormSection textarea:focus,
.comment-title-input:focus,
.comment-text-input:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--focus-ring-color);
    outline: none;
}

.comments-form-container {
    border: 1px dashed var(--border-color);
    padding: 1rem;
    border-radius: 8px;
    margin-top: 1rem;
}
.comments-form-container h3 {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-top: 0;
    margin-bottom: 1rem;
    border-bottom: none;
    padding-bottom: 0;
    color: var(--text-color);
}

.comment-input-group {
    border: 1px solid #ccc;
    border-radius: 8px;
    padding: 0.75rem;
    margin-bottom: 1rem;
    position: relative;
    background-color: #fefefe;
}

.comment-input-group:last-of-type {
    margin-bottom: 0;
}

.comment-input-group .remove-section-btn {
    background-color: var(--danger-color);
    color: white;
    border: none;
    border-radius: 50%;
    width: 25px;
    height: 25px;
    font-size: 1rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    position: absolute;
    top: 5px;
    right: 5px;
    z-index: 1;
    transition: background-color 0.2s ease;
    box-shadow: 0 1px 3px var(--shadow-light);
}

.comment-input-group .remove-section-btn:hover {
    background-color: var(--danger-hover-bg);
}

.add-section-btn {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    border-radius: 50%;
    width: 30px;
    height: 30px;
    font-size: 1.5rem;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
    box-shadow: 0 2px 5px var(--shadow-light);
}
.add-section-btn:hover {
    background-color: #0069d9;
}
.add-section-btn:active {
    background-color: #0062cc;
}

.form-action-buttons {
    display: flex;
    justify-content: space-around;
    gap: 1rem;
    margin-top: 1rem;
    flex-wrap: wrap; /* Allow wrapping */
}

.form-action-buttons button {
    flex: 1;
    min-width: 120px;
}

.form-action-buttons #deleteShareFromFormBtn {
    background-color: var(--danger-color);
}
.form-action-buttons #deleteShareFromFormBtn:hover {
    background-color: var(--danger-hover-bg);
}

/* Dividend Calculator Specifics */
#dividendCalculatorModal .modal-content input[type="number"],
.calc-input-group input[type="number"] { /* Apply to grouped inputs */
    margin-bottom: 1rem;
    display: block;
    width: calc(100% - 20px);
    background-color: var(--calc-number-btn-bg); /* Darker input background */
    color: var(--text-color); /* Readable text color */
}
#dividendCalculatorModal .modal-content label {
    color: var(--calc-display-text); /* Label color for dark background */
}
#dividendCalculatorModal .modal-content p {
    font-size: 1.1rem;
    margin-bottom: 0.5rem;
    color: var(--calc-display-text); /* Ensure text is readable */
}
#dividendCalculatorModal .modal-content span {
    font-weight: bold;
    color: var(--calc-display-text); /* Ensure text is readable */
}
#dividendCalculatorModal hr {
    border: none;
    border-top: 1px solid rgba(255, 255, 255, 0.2); /* Lighter border for dark theme */
    margin: 1.5rem 0;
}
.investment-value-section select {
    padding: 0.5rem 1rem;
    border: 1px solid var(--border-color);
    border-radius: 8px;
    background-color: var(--calc-number-btn-bg); /* Match calculator button theme */
    color: var(--text-color);
    font-size: 1rem;
    min-width: 120px;
    -webkit-appearance: none;
    -moz-appearance: none;
    appearance: none;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'%3E%3C/polyline%3E%3C/svg%3E");
    background-repeat: no-repeat;
    background-position: right 10px center;
    background-size: 20px;
    cursor: pointer;
}
.investment-value-section select:focus {
    border-color: var(--primary-color);
    box-shadow: 0 0 0 3px var(--focus-ring-color);
    outline: none;
}
.investment-value-section p {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    flex-wrap: wrap;
}

/* Custom Dialog */
.custom-dialog-buttons {
    display: flex;
    justify-content: center;
    gap: 1rem;
    margin-top: 1.5rem;
}
.custom-dialog-buttons .dialog-button {
    background-color: var(--secondary-color);
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1rem;
    transition: background-color 0.2s ease;
}
.custom-dialog-buttons .dialog-button:hover {
    background-color: #0069d9;
}
.custom-dialog-buttons .dialog-button.cancel {
    background-color: #6c757d;
}
.custom-dialog-buttons .dialog-button.cancel:hover {
    background-color: #5a6268;
}

/* Calculator Modal Specifics (Standard & Dividend) */
.calculator-modal-content {
    background-color: var(--calc-bg) !important; /* Dark background */
    color: var(--calc-display-text) !important; /* Light text for readability */
    padding: 2rem;
    border-radius: 12px;
    box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
}
.calculator-modal-content h2 {
    color: var(--primary-color) !important; /* Ensure title is visible */
    border-bottom: 1px solid rgba(255, 255, 255, 0.2) !important;
}
.calculator-modal-content p strong {
    color: var(--calc-display-text) !important; /* Ensure strong tags are visible */
}


.calculator-display {
    background-color: var(--calc-display-bg);
    color: var(--calc-display-text);
    width: 100%;
    border-radius: 8px;
    padding: 1rem;
    box-sizing: border-box;
    text-align: right;
    font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace;
    overflow: hidden;
    margin-bottom: 1rem;
}

.calculator-input {
    font-size: 0.9em;
    color: var(--calc-input-text);
    min-height: 1.2em;
}

.calculator-result {
    font-size: 2em;
    font-weight: bold;
    min-height: 1.2em;
}

.calculator-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.75rem;
    width: 100%;
}

.calc-btn {
    background-color: var(--calc-number-btn-bg);
    border: none;
    padding: 1rem;
    border-radius: 8px;
    font-size: 1.2rem;
    cursor: pointer;
    transition: background-color 0.2s ease;
    box-shadow: 0 2px 4px var(--shadow-light);
}

.calc-btn:hover {
    background-color: var(--calc-number-btn-hover);
}

.calc-btn.clear {
    background-color: var(--calc-clear-btn-bg);
}
.calc-btn.clear:hover {
    background-color: var(--calc-clear-btn-hover);
}

.calc-btn.operator {
    background-color: var(--calc-operator-btn-bg);
    color: white;
}
.calc-btn.operator:hover {
    background-color: var(--calc-operator-btn-hover);
}

.calc-btn.equals {
    background-color: var(--calc-equals-btn-bg);
    color: white;
    grid-column: span 2; /* Stretch across two columns */
}
.calc-btn.equals:hover {
    background-color: var(--calc-equals-btn-hover);
}

.calc-btn.zero {
    grid-column: span 2; /* Stretch across two columns */
}

/* Footer Styles */
.fixed-footer {
    background-color: var(--header-footer-bg);
    padding: 0.75rem 1.5rem;
    border-top: 1px solid var(--border-color);
    box-shadow: 0 -2px 4px var(--shadow-light);
    flex-shrink: 0; /* Prevents footer from shrinking */
    display: flex;
    justify-content: center; /* Center the sign-in button on all screens */
    align-items: center;
}

.google-auth-btn {
    background-color: #4285F4; /* Google Blue */
    color: white;
    border: none;
    padding: 0.6rem 1.2rem;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.95rem;
    transition: background-color 0.2s ease;
    box-shadow: 0 2px 5px var(--shadow-light);
    outline: none;
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.google-auth-btn:hover {
    background-color: #357ae8;
}

/* --- Mobile Responsiveness --- */
@media (max-width: 768px) {
    body {
        padding-top: 170px; /* Adjust padding for taller mobile sticky header */
    }

    h1 {
        font-size: 1.5rem;
        text-align: center; /* Centered on mobile */
        width: 100%; /* Take full width */
        margin-bottom: 0.5rem; /* Space between title and buttons */
    }

    .header-top-row {
        flex-direction: column; /* Stack header elements */
        gap: 0.75rem; /* Adjusted gap */
    }

    .main-buttons {
        flex-direction: row; /* Keep buttons in a row for mobile, they will wrap */
        flex-wrap: wrap;
        justify-content: center;
        width: 100%;
    }

    .button-row {
        flex-basis: 100%; /* Ensure each button-row takes full width */
        justify-content: center;
        gap: 0.4rem; /* Smaller gap for mobile buttons */
    }
    
    .main-buttons button {
        width: calc(50% - 0.2rem); /* Two buttons per row, adjusted for gap */
        min-width: unset; /* Remove min-width constraint */
        font-size: 0.85rem; /* Smaller font for mobile buttons */
        padding: 0.5rem 0.8rem;
    }

    /* Adjust watchlist management section for mobile */
    .watchlist-management-section {
        flex-direction: row; /* Keep elements in a row, allow wrap */
        flex-wrap: wrap;
        align-items: center;
        padding: 0.6rem 1rem; /* Reduced padding */
        gap: 0.4rem; /* Reduced gap */
        justify-content: center; /* Center content */
    }

    .watchlist-management-section label {
        font-size: 0.85rem; /* Smaller font for label */
        margin-bottom: 0; /* Remove bottom margin */
    }

    .watchlist-management-section select {
        width: calc(100% - 1.5rem); /* Adjust width to fit */
        flex-grow: 1;
        max-width: unset; /* Remove max-width constraint */
        margin-bottom: 0;
        font-size: 0.85rem;
        padding: 0.4rem 0.6rem;
    }

    .watchlist-management-section button {
        width: calc(50% - 0.2rem); /* Two buttons per row */
        padding: 0.5rem 0.8rem; /* Smaller padding */
        font-size: 0.85rem; /* Smaller font size */
        box-sizing: border-box; /* Include padding in width */
    }
    .watchlist-management-section button:last-child:nth-child(odd) { /* If there's an odd number of buttons and last one is alone */
        width: 100%; /* Make the last button full width */
    }


    table {
        display: none; /* Hide table on small screens */
    }

    .mobile-share-cards {
        display: grid; /* Show mobile cards */
        grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); /* Responsive grid */
        gap: 1.5rem;
        padding: 1.5rem;
        width: 100%;
        max-width: 1200px;
        box-sizing: border-box;
    }

    .share-card {
        background-color: var(--card-background-color);
        padding: 1.5rem;
        border-radius: 12px;
        box-shadow: 0 4px 8px var(--shadow-light);
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        position: relative;
        border: 1px solid transparent; /* For selected state */
    }

    .share-card.selected {
        border: 2px solid var(--secondary-color); /* Full border */
        box-shadow: 0 0 8px var(--secondary-color);
        background-color: #cfe2ff; /* Light blue for selected */
    }

    .share-card h3 {
        color: var(--primary-color);
        margin-top: 0;
        margin-bottom: 0.5rem;
        font-size: 1.4rem;
        border-bottom: 1px solid var(--border-color);
        padding-bottom: 0.5rem;
    }

    .share-card p {
        margin: 0;
        font-size: 0.95rem;
        display: flex; /* Allow content inside p to flex */
        justify-content: space-between; /* Space out label and value */
        align-items: baseline;
    }

    .share-card strong {
        flex-shrink: 0; /* Prevent strong label from shrinking */
        margin-right: 0.5rem;
    }

    .share-card .price {
        font-weight: bold;
        font-size: 1.05em;
    }

    .share-card .card-comments {
        margin-top: 0.75rem;
        padding-top: 0.75rem;
        border-top: 1px dashed #eee;
        font-style: italic;
        color: #666;
    }

    /* Mobile footer adjustments */
    .fixed-footer {
        justify-content: center; /* Center the sign-in button */
    }
}
