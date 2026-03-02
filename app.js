/* 
 * Buscador CDI - Frontend Implementation
 * Author: Alejandro Venegas Robles (alejandro2196vr@gmail.com)
 * 
 * Static fallback version of the application logic. 
 * Relies on `medicalData` array being globally available (e.g., loaded via data.js).
 */

/**
 * Global error handler for uncaught exceptions.
 * Renders critical errors into the DOM (#errorLog) for visibility in offline/standalone environments.
 */
window.onerror = function (message, source, lineno, colno, error) {
    const errorDiv = document.getElementById('errorLog');
    if (errorDiv) {
        errorDiv.style.display = 'block';
        const errorMsg = `CRITICAL ERROR:\nMsg: ${message}\nFile: ${source}:${lineno}\nStack: ${error?.stack || 'N/A'}`;
        errorDiv.textContent = errorMsg;
        console.error("APP LOG:", errorMsg);
    }
    return false; // Let default handler run if needed
};

/**
 * Computes Levenshtein distance between two strings using dynamic programming.
 * @param {string} a 
 * @param {string} b 
 * @returns {number} Edit distance
 */
function levenshteinDistance(a, b) {
    try {
        const matrix = [];
        for (let i = 0; i <= b.length; i++) matrix[i] = [i];
        for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
        for (let i = 1; i <= b.length; i++) {
            for (let j = 1; j <= a.length; j++) {
                if (b.charAt(i - 1) == a.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1, // substitution
                        matrix[i][j - 1] + 1,     // insertion
                        matrix[i - 1][j] + 1      // deletion
                    );
                }
            }
        }
        return matrix[b.length][a.length];
    } catch (e) {
        throw new Error(`Levenshtein calculation failed: ${e.message}`);
    }
}

/**
 * Calculates a similarity score [0.0 - 1.0] based on Levenshtein distance.
 * @param {string} str1 
 * @param {string} str2 
 * @returns {number} Similarity ratio
 */
function calculateSimilarity(str1, str2) {
    try {
        const longer = str1.length > str2.length ? str1 : str2;
        const shorter = str1.length > str2.length ? str2 : str1;
        if (longer.length === 0) return 1.0;
        const distance = levenshteinDistance(longer.toLowerCase(), shorter.toLowerCase());
        return (longer.length - distance) / longer.length;
    } catch (e) {
        throw new Error(`Similarity calculation failed: ${e.message}`);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    try {
        const searchInput = document.getElementById('searchInput');
        const resultsContainer = document.getElementById('resultsContainer');

        if (!searchInput || !resultsContainer) {
            throw new Error("Critical DOM elements missing (#searchInput, #resultsContainer).");
        }

        searchInput.addEventListener('input', (e) => {
            handleSearch(e.target.value);
        });
    } catch (e) {
        window.onerror(e.message, 'app.js (init)', 0, 0, e);
    }
});

/**
 * Executes search against the global `medicalData` array and updates the DOM.
 * @param {string} query Search term input
 */
function handleSearch(query) {
    try {
        const resultsContainer = document.getElementById('resultsContainer');
        resultsContainer.innerHTML = '';

        if (!query || query.length < 2) return;

        const queryWords = query.toLowerCase().trim().split(/\s+/);

        const matches = medicalData.filter(item => {
            // Check if ANY term satisfies ALL words in the query
            return item.terms.some(term => {
                const termLower = term.toLowerCase();

                // Every word in the user's query must match this 'term' somehow (order agnostic)
                return queryWords.every(word => {
                    // Exact substring match
                    if (termLower.includes(word)) return true;

                    // Or fuzzy match (if word is long enough to avoid false positives)
                    if (word.length > 3) {
                        // Check if the word fuzzy matches any word in the term
                        const termWords = termLower.split(/\s+/);
                        return termWords.some(tWord => calculateSimilarity(tWord, word) > 0.75);
                    }

                    return false;
                });
            });
        });

        matches.forEach(item => renderResultCard(item, resultsContainer));
    } catch (e) {
        throw new Error(`handleSearch failed: ${e.message}`);
    }
}

/**
 * Renders a single result card based on the item type (simple, tree, excluded).
 * @param {Object} item Data object representing the medical entity
 * @param {HTMLElement} container Parent container to append the card
 */
function renderResultCard(item, container) {
    try {
        const card = document.createElement('div');
        card.className = item.type === 'excluded' ? 'result-card excluded-card' : 'result-card';

        const title = document.createElement('div');
        title.className = 'result-title';
        title.textContent = item.terms[0].toUpperCase();
        card.appendChild(title);

        if (item.alert) {
            const alertBox = document.createElement('div');
            alertBox.className = 'alert-message';
            alertBox.textContent = `⚠️ ALERTA: ${item.alert}`;
            card.appendChild(alertBox);
        }

        const contentArea = document.createElement('div');
        contentArea.className = 'decision-tree';
        card.appendChild(contentArea);

        // Render appropriate UI component based on entity classification
        if (item.type === 'excluded') {
            const excludedText = document.createElement('div');
            excludedText.style.color = '#856404';
            excludedText.style.fontWeight = 'bold';
            excludedText.style.marginTop = '1rem';
            excludedText.textContent = "[NO PRECISA CODIFICACIÓN]";
            contentArea.appendChild(excludedText);
        } else if (item.type === 'simple' || item.type === 'tree_placeholder') {
            renderFinalResult(item.value, contentArea);
        } else if (item.type === 'tree') {
            renderTreeStep(item.root, contentArea);
        }

        container.appendChild(card);
    } catch (e) {
        throw new Error(`renderResultCard failed for item ${item.id}: ${e.message}`);
    }
}

/**
 * Recursively renders decision tree nodes for complex diagnoses.
 * @param {Object} node Current tree node with question and options
 * @param {HTMLElement} container Parent container
 */
function renderTreeStep(node, container) {
    try {
        container.innerHTML = '';

        const question = document.createElement('span');
        question.className = 'decision-question';
        question.textContent = node.question;
        container.appendChild(question);

        const btnGroup = document.createElement('div');
        btnGroup.className = 'btn-group';

        node.options.forEach(opt => {
            const btn = document.createElement('button');
            btn.className = 'btn-decision';
            btn.textContent = opt.label;

            btn.onclick = () => {
                if (opt.value) {
                    renderFinalResult(opt.value, container);
                } else if (opt.next) {
                    renderTreeStep(opt.next, container);
                }
            };
            btnGroup.appendChild(btn);
        });
        container.appendChild(btnGroup);
    } catch (e) {
        throw new Error(`renderTreeStep failed: ${e.message}`);
    }
}

/**
 * Renders the final coding string and the copy-to-clipboard functionality.
 * @param {string} text Final diagnostic/procedural string
 * @param {HTMLElement} container Parent container
 */
function renderFinalResult(text, container) {
    try {
        container.innerHTML = '';
        const wrapper = document.createElement('div');
        wrapper.className = 'final-result';

        const resultText = document.createElement('div');
        resultText.className = 'result-text';
        resultText.textContent = text;

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.innerHTML = '📋 Copiar';
        copyBtn.onclick = () => copyToClipboard(text, copyBtn);

        wrapper.appendChild(resultText);
        wrapper.appendChild(copyBtn);
        container.appendChild(wrapper);
    } catch (e) {
        throw new Error(`renderFinalResult failed: ${e.message}`);
    }
}

/**
 * Writes text to system clipboard using the modern async Clipboard API.
 * @param {string} text 
 * @param {HTMLElement} btnElement Reference for UX feedback
 */
async function copyToClipboard(text, btnElement) {
    try {
        await navigator.clipboard.writeText(text);

        const originalText = btnElement.innerHTML;
        btnElement.innerHTML = '✅ Copiado!';
        btnElement.style.backgroundColor = '#218838';

        setTimeout(() => {
            btnElement.innerHTML = originalText;
            btnElement.style.backgroundColor = '';
        }, 2000);
    } catch (e) {
        console.error('Clipboard API write failed. Typically occurs if context is not secure (HTTPS/localhost).', e);
        alert('Permiso de portapapeles bloqueado. Copie manualmente.');
    }
}
