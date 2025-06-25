/* File Version: v22 */
/* Last Updated: 2025-06-26 (Header layout refinements, Hamburger menu visibility fix) */

:root {
    /* Light Theme (Default) */
    --background-color: #f4f7f6; /* Lighter background for the app */
    --text-color: #333;
    --header-bg: #e0e6e4; /* Slightly darker than background for header */
    --card-bg: #ffffff; /* White cards/sections */
    --border-color: #ddd;
    --button-bg: #007bff;
    --button-text: #fff;
    --button-hover-bg: #0056b3;
    --input-bg: #fff;
    --input-border: #ccc;
    --modal-bg: rgba(0, 0, 0, 0.6); /* Slightly darker modal overlay */
    --modal-content-bg: #fff;
    --table-header-bg: #f0f0f0;
    --table-row-hover-bg: #f5f5f5;
    --asx-button-bg: #e9ecef; /* Light grey for ASX code buttons */
    --asx-button-hover-bg: #dee2e6;
    --asx-button-text: #333;
    --asx-button-active-bg: #007bff; /* Blue for active ASX button */
    --asx-button-active-text: #fff;
    --danger-button-bg: #dc3545;
    --danger-button-hover-bg: #c82333;
    --secondary-button-bg: #6c757d;
    --secondary-button-hover-bg: #545b62;
    --google-auth-btn-bg: #dd4b39; /* Google red */
    --google-auth-btn-hover-bg: #c23321;
    --label-color: #555; /* For form labels */
    --shadow-color: rgba(0, 0, 0, 0.1);
    --mobile-menu-bg: #e0e6e4; /* Same as header bg */
    --mobile-menu-border: #ccc;
    --mobile-menu-text: #333;
    --close-menu-btn-color: #666;
}

/* Dark Theme */
body.dark-theme {
    --background-color: #1a1a2e; /* Deep purple/blue */
    --text-color: #e0e0e0;
    --header-bg: #272740; /* Slightly darker header for contrast */
    --card-bg: #2e2e4a; /* Darker cards */
    --border-color: #444;
    --button-bg: #4a7dff; /* Brighter blue for buttons */
    --button-text: #fff;
    --button-hover-bg: #3a6cd9;
    --input-bg: #3c3c5c;
    --input-border: #555;
    --modal-bg: rgba(0, 0, 0, 0.8);
    --modal-content-bg: #2e2e4a;
    --table-header-bg: #3a3a5a;
    --table-row-hover-bg: #333350;
    --asx-button-bg: #3a3a5a;
    --asx-button-hover-bg: #4a4a6a;
    --asx-button-text: #e0e0e0;
    --asx-button-active-bg: #4a7dff;
    --asx-button-active-text: #fff;
    --danger-button-bg: #e74c3c;
    --danger-button-hover-bg: #c0392b;
    --secondary-button-bg: #7f8c8d;
    --secondary-button-hover-bg: #616e70;
    --google-auth-btn-bg: #e74c3c; /* Darker red for Google in dark theme */
    --google-auth-btn-hover-bg: #c0392b;
    --label-color: #bbb;
    --shadow-color: rgba(0, 0, 0, 0.4);
    --mobile-menu-bg: #272740;
    --mobile-menu-border: #444;
    --mobile-menu-text: #e0e0e0;
    --close-menu-btn-color: #bbb;
}

/* Base Styles */
body {
    font-family: 'Inter', sans-serif;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
    background-color: var(--background-color);
    color: var(--text-color);
    transition: background-color 0.3s ease, color 0.3s ease;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
}

.container {
    max-width: 1200px;
    margin: 20px auto;
    padding: 0 15px;
}

/* Header */
header {
    background-color: var(--header-bg);
    padding: 15px 20px;
    box-shadow: 0 2px 4px var(--shadow-color);
    display: flex;
    flex-direction: column; /* Stack rows vertically */
    gap: 10px; /* Space between header rows */
    position: relative; /* For absolute positioning of hamburger menu */
}

.header-top-row {
    display: flex;
    justify-content: center; /* Center the title by default */
    align-items: center;
    gap: 15px; /* Space between elements */
    position: relative; /* For proper positioning of theme toggle relative to itself */
}

h1#mainTitle {
    margin: 0 auto; /* NEW: Use auto margins for centering */
    font-size: 1.8em;
    font-weight: 700;
    color: var(--text-color);
    text-align: center; /* Keep text centered within its own flex item */
    flex-grow: 0; /* NEW: Don't let it grow on desktop, to maintain centering */
    max-width: calc(100% - 150px); /* Adjust max-width if needed to prevent overlap with buttons */
    white-space: nowrap; /* Prevent title from wrapping */
    overflow: hidden;
    text-overflow: ellipsis; /* Add ellipsis if too long */
}

/* Theme Toggle Button */
.theme-toggle-btn {
    background: none;
    border: 1px solid var(--border-color);
    color: var(--text-color);
    padding: 8px 12px;
    border-radius: 20px;
    cursor: pointer;
    font-size: 0.9em;
    display: flex;
    align-items: center;
    gap: 5px;
    transition: background-color 0.3s ease, color 0.3s ease, border-color 0.3s ease;
    /* Position it absolutely to ensure mainTitle stays centered regardless of its width */
    position: absolute;
    right: 0; /* Align to the far right */
    top: 50%;
    transform: translateY(-50%);
    z-index: 10; /* Ensure it's above other elements if they overlap slightly */
}

.theme-toggle-btn:hover {
    background-color: var(--button-hover-bg);
    color: var(--button-text);
    border-color: var(--button-hover-bg);
}

.theme-toggle-btn .fas {
    font-size: 1em;
}

/* NEW: Hamburger Menu Button (visible on mobile, hidden on desktop) */
.hamburger-btn {
    background: none;
    border: none;
    color: var(--text-color);
    font-size: 1.8em; /* Larger icon for easy tapping */
    cursor: pointer;
    display: none; /* Hidden by default, shown via media query */
    position: absolute; 
    left: 0; /* Align to the far left of the header-top-row */
    top: 50%;
    transform: translateY(-50%);
    padding: 5px 10px; /* Make it easier to tap */
    z-index: 11; /* Above theme toggle */
}

.hamburger-btn:hover {
    color: var(--button-hover-bg);
}

/* NEW: Mobile Menu (Hidden by default) */
.mobile-menu {
    position: fixed; /* Fixed to viewport */
    top: 0;
    left: -300px; /* Start off-screen to the left */
    width: 280px; /* Width of the menu */
    height: 100%;
    background-color: var(--mobile-menu-bg);
    box-shadow: 2px 0 5px var(--shadow-color);
    transition: left 0.3s ease-in-out; /* Smooth slide-in/out */
    z-index: 1000; /* High z-index to be on top of everything */
    padding: 20px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    overflow-y: auto; /* Enable scrolling if content is long */
    border-right: 1px solid var(--mobile-menu-border);
}

.mobile-menu.open {
    left: 0; /* Slide in */
}

.close-menu-btn {
    background: none;
    border: none;
    color: var(--close-menu-btn-color);
    font-size: 2.5em; /* Large X icon */
    position: absolute;
    top: 10px;
    right: 15px;
    cursor: pointer;
    padding: 5px;
    line-height: 1; /* Remove extra line height */
}

.close-menu-btn:hover {
    color: var(--danger-button-bg);
}

.mobile-menu h3 {
    color: var(--mobile-menu-text);
    margin-top: 20px;
    margin-bottom: 10px;
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 5px;
    font-size: 1.1em;
}

.menu-buttons-group {
    display: flex;
    flex-direction: column; /* Stack buttons vertically */
    gap: 10px; /* Space between buttons */
    margin-bottom: 20px;
}

.mobile-menu button {
    background-color: var(--button-bg);
    color: var(--button-text);
    padding: 12px 15px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    text-align: left; /* Align text to the left */
    display: flex;
    align-items: center;
    gap: 10px;
    transition: background-color 0.2s ease, transform 0.1s ease;
    width: 100%; /* Full width within the menu */
    box-sizing: border-box;
}

.mobile-menu button:hover {
    background-color: var(--button-hover-bg);
    transform: translateY(-1px);
}

.mobile-menu button:disabled {
    background-color: var(--secondary-button-bg);
    cursor: not-allowed;
    opacity: 0.7;
}

/* Overlay for hamburger menu */
.menu-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.5); /* Semi-transparent black */
    z-index: 999; /* Below the menu, above content */
    display: none; /* Hidden by default */
}


/* Watchlist and Sort Controls */
.watchlist-controls-row {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on smaller screens */
    justify-content: center; /* Center groups */
    align-items: center;
    gap: 15px 25px; /* Vertical and horizontal gap */
    padding: 10px 0;
    border-top: 1px solid var(--border-color);
    border-bottom: 1px solid var(--border-color);
}

.watchlist-management-group,
.sort-controls-group {
    display: flex;
    align-items: center;
    gap: 8px; /* Space between label and dropdown/button */
    color: var(--label-color);
    font-weight: 600;
}

.dropdown-large {
    padding: 10px 15px;
    border: 1px solid var(--input-border);
    border-radius: 8px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 1em;
    appearance: none; /* Remove default dropdown arrow */
    -webkit-appearance: none;
    -moz-appearance: none;
    cursor: pointer;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    min-width: 150px; /* Minimum width for dropdowns */
    background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236c757d%22%20d%3D%22M287%2069.9a14.7%2014.7%200%200%200-20.8%200L146.2%20189.9%2026.3%2069.9a14.7%2014.7%200%200%200-20.8%2020.8L135.8%20216.7a14.7%2014.7%200%200%200%2020.8%200L287%2090.7a14.7%2014.7%200%200%200%200-20.8z%22%2F%3E%3C%2Fsvg%3E'); /* Custom arrow */
    background-repeat: no-repeat;
    background-position: right 12px top 50%;
    background-size: 12px auto;
    padding-right: 30px; /* Space for the custom arrow */
}

.dropdown-large:focus {
    border-color: var(--button-bg);
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    outline: none;
}

.small-button {
    background-color: var(--secondary-button-bg);
    color: var(--button-text);
    padding: 9px 12px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    transition: background-color 0.2s ease, transform 0.1s ease;
    display: flex;
    align-items: center;
    gap: 5px;
}

.small-button:hover {
    background-color: var(--secondary-button-hover-bg);
    transform: translateY(-1px);
}

.small-button:disabled {
    background-color: var(--secondary-button-hover-bg);
    cursor: not-allowed;
    opacity: 0.7;
}

/* ASX Code Buttons Container */
.asx-code-buttons-container {
    display: flex;
    flex-wrap: wrap; /* Allow buttons to wrap */
    justify-content: center; /* Center the buttons */
    gap: 8px; /* Space between buttons */
    padding: 10px 0;
}

.asx-code-btn {
    background-color: var(--asx-button-bg);
    color: var(--asx-button-text);
    border: 1px solid var(--input-border);
    border-radius: 20px;
    padding: 8px 15px;
    cursor: pointer;
    font-size: 0.9em;
    font-weight: 600;
    transition: background-color 0.2s ease, color 0.2s ease, border-color 0.2s ease;
}

.asx-code-btn:hover {
    background-color: var(--asx-button-hover-bg);
}

.asx-code-btn.active {
    background-color: var(--asx-button-active-bg);
    color: var(--asx-button-active-text);
    border-color: var(--asx-button-active-bg);
}


/* Main Content / Table */
.share-list-section {
    margin-top: 20px;
    background-color: var(--card-bg);
    border-radius: 8px;
    box-shadow: 0 2px 8px var(--shadow-color);
    overflow: hidden; /* Ensures rounded corners are respected */
}

.table-container {
    overflow-x: auto; /* Enables horizontal scrolling for tables on small screens */
    -webkit-overflow-scrolling: touch; /* Smooth scrolling on iOS */
}

table {
    width: 100%;
    border-collapse: collapse;
    color: var(--text-color);
}

table th, table td {
    padding: 12px 15px;
    text-align: left;
    border-bottom: 1px solid var(--border-color);
    font-size: 0.9em;
}

table th {
    background-color: var(--table-header-bg);
    font-weight: 600;
    color: var(--text-color);
    white-space: nowrap; /* Prevent headers from wrapping */
}

table tbody tr {
    transition: background-color 0.2s ease;
    cursor: pointer;
}

table tbody tr.selected {
    background-color: var(--table-row-hover-bg); /* Highlight selected row */
    font-weight: 600;
}

table tbody tr:not(.selected):hover {
    background-color: var(--table-row-hover-bg);
}

/* Mobile Cards (Hidden by default on desktop) */
.mobile-share-cards {
    display: none; /* Hidden by default */
    flex-direction: column;
    gap: 15px;
    padding: 15px;
}

.mobile-card {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    box-shadow: 0 2px 5px var(--shadow-color);
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.mobile-card.selected {
    background-color: var(--table-row-hover-bg);
    border-color: var(--button-bg); /* Highlight with main brand color */
    font-weight: 600;
}

.mobile-card:not(.selected):hover {
    background-color: var(--table-row-hover-bg);
}

.mobile-card h3 {
    margin-top: 0;
    margin-bottom: 10px;
    color: var(--text-color);
    font-size: 1.2em;
}

.mobile-card p {
    margin: 5px 0;
    font-size: 0.9em;
    color: var(--text-color);
}

.mobile-card p strong {
    color: var(--label-color);
}

/* Fixed Footer & Auth Button */
.fixed-footer {
    position: sticky; /* Sticky positioning */
    bottom: 0;
    left: 0;
    width: 100%;
    background-color: var(--header-bg); /* Match header background */
    box-shadow: 0 -2px 4px var(--shadow-color);
    padding: 10px 20px;
    display: flex;
    justify-content: center; /* Center the auth button */
    align-items: center;
    z-index: 500; /* Ensure it stays above content but below modals */
}

.google-auth-btn {
    background-color: var(--google-auth-btn-bg);
    color: var(--button-text);
    padding: 12px 25px;
    border: none;
    border-radius: 25px; /* Pill shape */
    cursor: pointer;
    font-size: 1.1em;
    font-weight: 600;
    transition: background-color 0.2s ease, transform 0.1s ease;
    display: flex;
    align-items: center;
    gap: 10px;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2); /* Subtle shadow */
}

.google-auth-btn:hover {
    background-color: var(--google-auth-btn-hover-bg);
    transform: translateY(-2px);
}

.google-auth-btn:disabled {
    background-color: var(--secondary-button-bg);
    cursor: not-allowed;
    opacity: 0.7;
}


/* Modals (General) */
.modal {
    display: none; /* Hidden by default with JS */
    position: fixed;
    z-index: 1000; /* High z-index to appear on top */
    left: 0;
    top: 0;
    width: 100%;
    height: 100%;
    overflow: auto; /* Enable scroll if content is too long */
    background-color: var(--modal-bg);
    padding-top: 60px; /* Space from top */
}

.modal-content {
    background-color: var(--modal-content-bg);
    margin: 5% auto; /* 5% from top and centered horizontally */
    padding: 25px;
    border-radius: 10px;
    box-shadow: 0 5px 15px var(--shadow-color);
    position: relative;
    max-width: 500px; /* Max width for consistency */
    width: 90%; /* Responsive width */
    box-sizing: border-box; /* Include padding in width calculation */
    color: var(--text-color);
}

/* NEW: Specific sizing for Add Share Modal */
.add-share-modal-content {
    max-height: 85vh; /* Max height based on viewport height */
    overflow-y: auto; /* Scroll only if content exceeds max-height */
}

.modal-content h2 {
    margin-top: 0;
    margin-bottom: 20px;
    text-align: center;
    color: var(--text-color);
    font-size: 1.6em;
}

.close-button {
    color: var(--text-color);
    font-size: 2em;
    position: absolute;
    top: 10px;
    right: 20px;
    cursor: pointer;
    transition: color 0.2s ease;
}

.close-button:hover,
.close-button:focus {
    color: var(--danger-button-bg);
    text-decoration: none;
    cursor: pointer;
}

/* Form Styling within Modals */
.modal-content label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--label-color);
    font-size: 0.95em;
}

.modal-content input[type="text"],
.modal-content input[type="number"],
.modal-content textarea {
    width: calc(100% - 22px); /* Full width minus padding and border */
    padding: 10px;
    margin-bottom: 15px;
    border: 1px solid var(--input-border);
    border-radius: 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 1em;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
}

.modal-content input[type="text"]:focus,
.modal-content input[type="number"]:focus,
.modal-content textarea:focus {
    border-color: var(--button-bg);
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    outline: none;
}

/* Comments Section in Form */
.comments-form-container h3 {
    display: flex;
    align-items: center;
    justify-content: space-between; /* Space out title and button */
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 5px;
    margin-top: 25px;
    margin-bottom: 15px;
    font-size: 1.2em;
    color: var(--text-color);
}

.comments-form-container .add-section-btn {
    background-color: var(--button-bg);
    color: var(--button-text);
    border: none;
    border-radius: 50%; /* Circle shape */
    width: 30px;
    height: 30px;
    font-size: 1.5em;
    line-height: 1;
    display: flex;
    justify-content: center;
    align-items: center;
    cursor: pointer;
    transition: background-color 0.2s ease;
}

.comments-form-container .add-section-btn:hover {
    background-color: var(--button-hover-bg);
}

.comment-section {
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 15px;
    background-color: var(--card-bg);
    position: relative; /* For delete button positioning */
}

.comment-section .comment-delete-btn {
    background: none;
    border: none;
    color: var(--danger-button-bg);
    font-size: 1.5em;
    position: absolute;
    top: 5px;
    right: 5px;
    cursor: pointer;
    transition: color 0.2s ease;
}

.comment-section .comment-delete-btn:hover {
    color: var(--danger-button-hover-bg);
}

/* NEW: Styling for buttons in the Add/Edit Share modal (form-action-buttons) */
.form-action-buttons,
.modal-action-buttons {
    display: flex;
    flex-wrap: wrap; /* Allow wrapping on very small screens, but prefer no wrap */
    justify-content: center; /* Center buttons */
    gap: 10px; /* Space between buttons */
    margin-top: 25px;
}

.form-action-buttons button,
.modal-action-buttons button {
    flex-grow: 1; /* Allow buttons to grow and take equal space */
    max-width: 180px; /* Max width to prevent them from becoming too wide on large screens */
    padding: 12px 18px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    display: flex;
    align-items: center;
    justify-content: center; /* Center text and icon */
    gap: 8px;
    transition: background-color 0.2s ease, transform 0.1s ease;
    text-align: center; /* Ensure text is centered if it wraps */
    box-sizing: border-box; /* Include padding/border in width */
}

.form-action-buttons #saveShareBtn,
.modal-action-buttons #editShareFromDetailBtn {
    background-color: var(--button-bg);
    color: var(--button-text);
}

.form-action-buttons #saveShareBtn:hover,
.modal-action-buttons #editShareFromDetailBtn:hover {
    background-color: var(--button-hover-bg);
    transform: translateY(-1px);
}

.form-action-buttons #cancelFormBtn {
    background-color: var(--secondary-button-bg);
    color: var(--button-text);
}

.form-action-buttons #cancelFormBtn:hover {
    background-color: var(--secondary-button-hover-bg);
    transform: translateY(-1px);
}

.form-action-buttons #deleteShareFromFormBtn {
    background-color: var(--danger-button-bg);
    color: var(--button-text);
}

.form-action-buttons #deleteShareFromFormBtn:hover {
    background-color: var(--danger-button-hover-bg);
    transform: translateY(-1px);
}

/* Share Details Modal Styling */
#modalCommentsContainer h3 {
    border-bottom: 1px solid var(--border-color);
    padding-bottom: 5px;
    margin-top: 25px;
    margin-bottom: 15px;
    font-size: 1.2em;
    color: var(--text-color);
}

.modal-comment-item {
    background-color: var(--card-bg);
    border: 1px solid var(--border-color);
    border-radius: 8px;
    padding: 12px;
    margin-bottom: 10px;
}

.modal-comment-item p {
    margin: 0;
    line-height: 1.5;
}

.modal-comment-item strong {
    color: var(--label-color);
    font-size: 0.95em;
    display: block; /* Ensures title is on its own line */
    margin-bottom: 5px;
}


/* Dividend Calculator Modal */
.calculator-modal-content {
    /* Specific styles if needed */
}
.calc-input-group {
    margin-bottom: 15px;
}

.calc-input-group label {
    display: block;
    margin-bottom: 8px;
    font-weight: 600;
    color: var(--label-color);
    font-size: 0.95em;
}

.calc-input-group input[type="number"],
.calc-input-group select {
    width: calc(100% - 22px);
    padding: 10px;
    border: 1px solid var(--input-border);
    border-radius: 5px;
    background-color: var(--input-bg);
    color: var(--text-color);
    font-size: 1em;
    transition: border-color 0.2s ease, box-shadow 0.2s ease;
    -webkit-appearance: none; /* Remove default styling for select */
    -moz-appearance: none;
    appearance: none;
    background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%22292.4%22%20height%3D%22292.4%22%3E%3Cpath%20fill%3D%22%236c757d%22%20d%3D%22M287%2069.9a14.7%2014.7%200%200%200-20.8%200L146.2%20189.9%2026.3%2069.9a14.7%2014.7%200%200%200-20.8%2020.8L135.8%20216.7a14.7%2014.7%200%200%200%2020.8%200L287%2090.7a14.7%2014.7%200%200%200%200-20.8z%22%2F%3E%3C%2Fsvg%3E'); /* Custom arrow */
    background-repeat: no-repeat;
    background-position: right 12px top 50%;
    background-size: 12px auto;
    padding-right: 30px; /* Space for the custom arrow */
}

.calc-input-group input[type="number"]:focus,
.calc-input-group select:focus {
    border-color: var(--button-bg);
    box-shadow: 0 0 0 2px rgba(0, 123, 255, 0.25);
    outline: none;
}

.calculator-modal-content hr {
    border: none;
    border-top: 1px solid var(--border-color);
    margin: 20px 0;
}

/* Standard Calculator Styling */
.calculator-display {
    background-color: var(--input-bg);
    border: 1px solid var(--input-border);
    border-radius: 8px;
    padding: 15px;
    margin-bottom: 20px;
    text-align: right;
    min-height: 80px;
    display: flex;
    flex-direction: column;
    justify-content: space-around;
    overflow: hidden; /* Hide overflow for long numbers */
}

.calculator-input {
    font-size: 1.2em;
    color: var(--label-color);
    min-height: 20px;
    white-space: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.calculator-result {
    font-size: 2.2em;
    font-weight: 700;
    color: var(--text-color);
    min-height: 30px;
    white-space: nowrap;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
}

.calculator-buttons {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 10px;
}

.calc-btn {
    background-color: var(--button-bg);
    color: var(--button-text);
    border: none;
    border-radius: 8px;
    padding: 15px;
    font-size: 1.5em;
    font-weight: 600;
    cursor: pointer;
    transition: background-color 0.2s ease, transform 0.1s ease;
}

.calc-btn:hover {
    background-color: var(--button-hover-bg);
    transform: translateY(-1px);
}

.calc-btn.clear {
    background-color: var(--danger-button-bg);
}
.calc-btn.clear:hover {
    background-color: var(--danger-button-hover-bg);
}

.calc-btn.operator {
    background-color: var(--secondary-button-bg);
}
.calc-btn.operator:hover {
    background-color: var(--secondary-button-hover-bg);
}

.calc-btn.equals {
    background-color: #28a745; /* Green for equals */
}
.calc-btn.equals:hover {
    background-color: #218838;
}

.calc-btn.zero {
    grid-column: span 2; /* Make zero button span two columns */
}


/* Custom Dialog Modal */
.custom-dialog-buttons {
    display: flex;
    justify-content: center;
    gap: 15px;
    margin-top: 25px;
}

.custom-dialog-buttons button {
    padding: 10px 20px;
    border: none;
    border-radius: 8px;
    cursor: pointer;
    font-size: 1em;
    font-weight: 600;
    transition: background-color 0.2s ease;
}

.custom-dialog-buttons #customDialogConfirmBtn {
    background-color: var(--button-bg);
    color: var(--button-text);
}

.custom-dialog-buttons #customDialogConfirmBtn:hover {
    background-color: var(--button-hover-bg);
}

.custom-dialog-buttons #customDialogCancelBtn {
    background-color: var(--danger-button-bg);
    color: var(--button-text);
}

.custom-dialog-buttons #customDialogCancelBtn:hover {
    background-color: var(--danger-button-hover-bg);
}


/* Scroll to Top Button */
#scrollToTopBtn {
    display: none; /* Hidden by default */
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 900; /* Below modals */
    background-color: var(--button-bg);
    color: var(--button-text);
    border: none;
    border-radius: 50%;
    width: 50px;
    height: 50px;
    font-size: 1.5em;
    cursor: pointer;
    box-shadow: 0 4px 8px var(--shadow-color);
    transition: background-color 0.3s ease, transform 0.2s ease;
}

#scrollToTopBtn:hover {
    background-color: var(--button-hover-bg);
    transform: translateY(-2px);
}


/* Loading Indicator */
.loading {
    text-align: center;
    padding: 20px;
    font-size: 1.2em;
    color: var(--label-color);
}

/* Error Message for Firebase Init */
.error-message {
    background-color: #ffe0e0;
    color: #cc0000;
    border: 1px solid #cc0000;
    padding: 15px;
    margin: 20px auto;
    border-radius: 8px;
    max-width: 600px;
    text-align: center;
}
.dark-theme .error-message {
    background-color: #5a1a1a;
    color: #ffcccc;
    border-color: #ffcccc;
}
.error-message p {
    margin: 0 0 10px 0;
}
.error-message p:last-child {
    margin-bottom: 0;
}


/* --- Responsive Design / Media Queries --- */

/* Mobile devices (portrait and landscape) and smaller tablets */
@media (max-width: 768px) {
    .header-top-row {
        justify-content: space-between; /* Push elements to edges */
        align-items: center; /* Vertically align items */
    }

    h1#mainTitle {
        font-size: 1.5em; /* Smaller title on mobile */
        flex-grow: 1; /* Allow title to take available space */
        text-align: center; /* Center text within its allocated flex space */
        white-space: nowrap; /* Prevent title from wrapping */
        overflow: hidden;
        text-overflow: ellipsis; /* Add ellipsis if too long */
        /* Remove fixed padding, let flexbox handle spacing around it */
        margin: 0 10px; /* NEW: Add some horizontal margin to prevent overlap with buttons */
    }

    .theme-toggle-btn {
        position: static; /* Let it flow normally within flexbox */
        transform: none;
        padding: 5px 8px; /* Smaller padding */
        font-size: 0.8em;
        order: 1; /* Place it after title by default if hamburger is left */
        margin-left: auto; /* Push to the right edge within header-top-row */
    }

    .hamburger-btn {
        display: block; /* Show hamburger menu button on mobile */
        order: -1; /* Place it before title */
        margin-right: auto; /* Push to the left edge within header-top-row */
    }

    /* Hide standard buttons when hamburger menu is active */
    #newShareBtn, #viewDetailsBtn, #standardCalcBtn, #dividendCalcBtn {
        display: none; /* These are now inside the hamburger menu */
    }

    .watchlist-controls-row {
        flex-direction: column; /* Stack controls vertically */
        gap: 15px;
        padding: 15px 0;
    }

    .watchlist-management-group,
    .sort-controls-group {
        width: 100%; /* Full width for groups */
        justify-content: center; /* Center content within group */
    }

    .dropdown-large {
        width: calc(100% - 120px); /* Adjust width to make space for labels */
        max-width: 250px; /* Limit max width even on full width */
    }

    .small-button {
        padding: 10px 15px; /* Slightly larger for touch targets */
        font-size: 1em;
    }

    /* Table to be hidden, cards to be shown on mobile */
    table {
        display: none;
    }

    .mobile-share-cards {
        display: flex; /* Show mobile cards */
    }

    .modal-content {
        width: 95%; /* Wider modal on mobile */
        margin: 20px auto; /* More margin on mobile */
        padding: 20px;
    }
    
    .add-share-modal-content {
        max-height: 90vh; /* Allow it to be taller on mobile if needed */
    }

    .form-action-buttons,
    .modal-action-buttons {
        flex-direction: column; /* Stack buttons vertically on small screens */
        gap: 15px;
    }

    .form-action-buttons button,
    .modal-action-buttons button {
        width: 100%; /* Full width when stacked */
        max-width: none; /* Remove max-width constraint */
        padding: 15px 20px; /* Larger touch targets */
    }
    
    .comments-form-container .add-section-btn {
        width: 35px; /* Slightly larger for mobile tap target */
        height: 35px;
        font-size: 1.8em;
    }
}

/* Medium devices (tablets, 769px and up) */
@media (min-width: 769px) {
    .hamburger-btn,
    .mobile-menu,
    .menu-overlay {
        display: none !important; /* Ensure hamburger is hidden on desktop */
    }

    /* Bring back desktop header button layout */
    header {
        flex-direction: column; /* Keep column for the header itself */
        justify-content: flex-start;
        align-items: center; /* Center items horizontally within header */
        flex-wrap: wrap; 
        padding-bottom: 0; 
        gap: 10px; /* Maintain gap between header rows */
    }

    .header-top-row {
        width: 100%; /* Take full width */
        margin-bottom: 0; /* No margin here, let header gap handle it */
        justify-content: space-between; /* Space out title and theme toggle */
        gap: 15px; /* Space between items in this row */
    }

    h1#mainTitle {
        font-size: 2.2em; /* Larger title on desktop */
        text-align: center; /* Center text within its element */
        flex-grow: 1; /* Allow it to grow to push buttons to edges */
        order: 0; /* Default order */
        margin: 0; /* Reset margins */
    }

    .theme-toggle-btn {
        position: static; /* Normal flow within flexbox */
        transform: none;
        order: 1; /* Place it last in the top row */
    }

    .watchlist-controls-row {
        width: 100%; /* Take full width */
        justify-content: center; /* Center the groups */
        gap: 20px 40px; /* More space on desktop */
        padding: 15px 0;
    }

    .watchlist-management-group,
    .sort-controls-group {
        width: auto; /* Auto width */
        justify-content: flex-start;
    }

    .dropdown-large {
        min-width: 180px; /* A bit wider on desktop */
        width: auto; /* Let content dictate width within min/max */
    }

    .fixed-footer {
        padding: 15px 20px; /* Larger padding on desktop */
    }

    /* Ensure table is visible and cards are hidden on desktop */
    table {
        display: table;
    }

    .mobile-share-cards {
        display: none;
    }
}

/* Specific adjustments for very large screens (optional) */
@media (min-width: 1024px) {
    header {
        padding: 20px 30px;
    }
    h1#mainTitle {
        font-size: 2.5em;
    }
    .container {
        padding: 0 20px;
    }
}
