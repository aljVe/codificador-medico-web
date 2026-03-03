/* 
 * Buscador CDI - Frontend Implementation
 * // Creado por Alejandro Venegas Robles. En caso de incidencias, contactar con alejandro2196vr@gmail.com
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

        if (item.code && item.code.trim() !== '' && item.type !== 'excluded') {
            const codeBox = document.createElement('div');
            codeBox.style.marginTop = '0.5rem';
            codeBox.style.marginBottom = '0.5rem';
            codeBox.style.fontWeight = 'bold';
            codeBox.style.color = '#0056b3';
            codeBox.style.backgroundColor = '#e8f4ff';
            codeBox.style.padding = '0.5rem';
            codeBox.style.borderRadius = '4px';
            codeBox.style.borderLeft = '4px solid #0056b3';
            codeBox.textContent = `CÓDIGO CIE-10: ${item.code}`;
            card.appendChild(codeBox);
        }

        const contentArea = document.createElement('div');
        contentArea.className = 'decision-tree';
        card.appendChild(contentArea);

        // Render appropriate UI component based on entity classification
        const requiresTree = item.tree === true || item.type === 'tree' || item.type === 'tree_placeholder';

        if (item.type === 'excluded') {
            const excludedText = document.createElement('div');
            excludedText.style.color = '#856404';
            excludedText.style.fontWeight = 'bold';
            excludedText.style.marginTop = '1rem';
            excludedText.textContent = "[NO PRECISA CODIFICACIÓN]";
            contentArea.appendChild(excludedText);
        } else if (requiresTree) {
            renderDynamicForm(item, contentArea);
        } else {
            let finalText = item.value || item.text;
            if (item.code && item.code.trim() !== '') {
                finalText += ` (CIE-10: ${item.code})`;
            }
            renderFinalResult(finalText, contentArea);
        }

        container.appendChild(card);
    } catch (e) {
        throw new Error(`renderResultCard failed for item ${item.id}: ${e.message}`);
    }
}

/**
 * Generates a dynamic form evaluating brackets inside TEXTO_NORMATIVO.
 * Replaces old renderTreeStep.
 * @param {Object} item Data object
 * @param {HTMLElement} container Parent container
 */
function renderDynamicForm(item, container) {
    try {
        container.innerHTML = '';

        // El texto paramétrico original
        const baseText = item.value || item.text || '';
        const regex = /\[(.*?)\]/g;

        let match;
        const matches = [];

        // Parse Regex para buscar corchetes
        while ((match = regex.exec(baseText)) !== null) {
            matches.push({
                fullMatch: match[0],
                inside: match[1]
            });
        }

        const formContainer = document.createElement('div');
        formContainer.className = 'dynamic-form';
        formContainer.style.marginBottom = '15px';
        formContainer.style.padding = '10px';
        formContainer.style.backgroundColor = '#f8f9fa';
        formContainer.style.border = '1px solid #dee2e6';
        formContainer.style.borderRadius = '5px';

        const controls = [];

        // Generar componentes UI dinámicos
        matches.forEach((m, index) => {
            const controlWrapper = document.createElement('div');
            controlWrapper.style.marginBottom = '10px';

            const label = document.createElement('label');
            label.textContent = `Campo ${index + 1}: `;
            label.style.fontWeight = 'bold';
            label.style.marginRight = '10px';
            controlWrapper.appendChild(label);

            let controlElement;

            if (m.inside.includes('/')) {
                // Genera Select si contiene '/'
                controlElement = document.createElement('select');
                controlElement.className = 'dynamic-select';
                controlElement.style.padding = '5px';
                controlElement.style.width = '100%';
                controlElement.style.maxWidth = '300px';

                const options = m.inside.split('/').map(o => o.trim());
                options.forEach(opt => {
                    const optionEl = document.createElement('option');
                    optionEl.value = opt;
                    optionEl.textContent = opt;
                    controlElement.appendChild(optionEl);
                });
            } else {
                // Genera Input si no contiene '/'
                controlElement = document.createElement('input');
                controlElement.type = 'text';
                controlElement.className = 'dynamic-input';
                controlElement.placeholder = m.inside;
                controlElement.style.padding = '5px';
                controlElement.style.width = '100%';
                controlElement.style.maxWidth = '300px';
            }

            // Asignar listeners para actualizar la preview en tiempo real
            controlElement.addEventListener('input', updatePreview);
            controlElement.addEventListener('change', updatePreview);

            controlWrapper.appendChild(controlElement);
            formContainer.appendChild(controlWrapper);
            controls.push(controlElement);
        });

        container.appendChild(formContainer);

        // Bloque de texto Preview que reemplaza corchetes
        const previewHeader = document.createElement('div');
        previewHeader.textContent = 'Preview del Diagnóstico:';
        previewHeader.style.fontWeight = 'bold';
        previewHeader.style.color = '#495057';
        container.appendChild(previewHeader);

        const previewContainer = document.createElement('p');
        previewContainer.id = 'texto-preview';
        previewContainer.style.fontStyle = 'italic';
        previewContainer.style.fontSize = '1.1em';
        previewContainer.style.marginBottom = '15px';
        container.appendChild(previewContainer);

        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn-copy';
        copyBtn.innerHTML = '📋 Copiar para Informe';
        copyBtn.onclick = () => copyToClipboard(previewContainer.textContent, copyBtn);
        container.appendChild(copyBtn);

        function updatePreview() {
            let finalString = baseText;
            let finalCode = item.code || '';

            matches.forEach((m, i) => {
                const ctrl = controls[i];
                let val = ctrl.value;
                if (!val || val.trim() === '') {
                    val = `[${m.inside}]`; // Mantiene corchete como placeholder si está vacío
                } else {
                    if (finalCode) {
                        const codeRegex = /\[(.*?)\]/g;
                        let codeMatch;
                        let newCode = finalCode;
                        let replaced = false;
                        while ((codeMatch = codeRegex.exec(finalCode)) !== null) {
                            const fullBracket = codeMatch[0];
                            const content = codeMatch[1];
                            const mappings = content.split('|');
                            for (let mapping of mappings) {
                                const parts = mapping.split(':');
                                if (parts.length === 2 && parts[0].trim() === val) {
                                    newCode = newCode.replace(fullBracket, parts[1].trim());
                                    replaced = true;
                                    break;
                                }
                            }
                            if (replaced) break;
                        }
                        finalCode = newCode;
                    }
                }
                finalString = finalString.replace(m.fullMatch, val);
            });
            if (finalCode && finalCode.trim() !== '') {
                finalString += ` (CIE-10: ${finalCode})`;
            }
            previewContainer.textContent = finalString;
        }

        // Ejecución inicial para llenar la vista previa
        updatePreview();

    } catch (e) {
        throw new Error(`renderDynamicForm failed: ${e.message}`);
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
