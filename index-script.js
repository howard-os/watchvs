import { encodeWatchSet, decodeWatchSet } from './watchSetEncoding.js';

const devModeStartup = true; // Set to true for ID-only display (no images/names)
let displayMode = devModeStartup ? 'dev' : 'normal'; // 'dev' for IDs, 'normal' for images

let watches = []; // Will be populated from JSON
let allWatchesFromJSON = []; // Cache of all watches from JSON
let originalWatchSetIds = []; // Store original set for ranking URL

let selectedTop = new Set();
let selectedBottom = new Set();
let middleWatches = [];
let allWatches = [];
let currentPass = 0;
let currentIndex = 0;
let completedComparisons = 0;
let totalComparisons = 0;
let comparisonLimit = 0;

// Load watches from JSON and handle both choice and ranking modes
async function loadWatches() {
    try {
        const response = await fetch('watches-200/watches.json');
        allWatchesFromJSON = await response.json();
        
        // Check if there's a watch set in the URL hash
        const hashParam = window.location.hash.slice(1); // Remove # prefix
        
        let selectedWatchIds;
        let currentMode = 'c'; // default to choice mode
        let decodedResult;
        
        if (hashParam) {
            decodedResult = decodeWatchSet(hashParam);
            if (decodedResult) {
                selectedWatchIds = decodedResult.watchIds;
                currentMode = decodedResult.mode;
            }
        }
        
        // If no valid URL set, pick 10 random watches and update URL
        if (!selectedWatchIds || selectedWatchIds.length !== 10) {
            const shuffled = allWatchesFromJSON.filter(w => w.id).sort(() => Math.random() - 0.5);
            selectedWatchIds = shuffled.slice(0, 10).map(w => w.id);
            currentMode = 'c';
            
            // Encode IDs and update URL hash
            const encoded = encodeWatchSet(selectedWatchIds, 'c');
            if (encoded) {
                window.history.replaceState({}, '', `#${encoded}`);
            } else {
                console.error('Failed to encode watch set, using first 10');
                selectedWatchIds = allWatchesFromJSON.slice(0, 10).map(w => w.id);
            }
        }
        
        // Store the original set IDs for later ranking URL generation
        originalWatchSetIds = selectedWatchIds.slice(); // Make a copy
        
        // Load watches in the proper order (ranked or random selection)
        watches = selectedWatchIds.map((watchId, index) => {
            const watch = allWatchesFromJSON.find(w => w.id === watchId);
            if (!watch) return null;
            
            let image = watch.image;
            if (image === 'placeholder') {
                const imageNum = Math.floor(Math.random() * 11) + 1;
                const ext = imageNum === 11 ? 'png' : 'jpg';
                image = `watch-images/watch-${imageNum}.${ext}`;
            }
            return {
                id: index + 1,
                jsonId: watch.id,
                name: watch.name,
                image: image
            };
        }).filter(w => w !== null);
        
        // If ranking mode, skip to results view
        if (currentMode === 'r') {
            allWatches = watches;
            showResults();
        } else {
            // Choice mode: shuffle watches and initialize selection UI
            watches = watches.sort(() => Math.random() - 0.5);
            initializeSelection();
        }
    } catch (error) {
        console.error('Error loading watches:', error);
        alert('Could not load watch list. Please check the JSON file.');
    }
}

function initializeSelection() {
    const grid = document.getElementById('watchGrid');
    grid.innerHTML = '';

    watches.forEach(watch => {
        const box = document.createElement('div');
        box.className = 'watch-box';
        
        if (displayMode === 'dev') {
            box.textContent = watch.jsonId;
            box.style.fontSize = '2.5rem';
            box.style.fontWeight = 'bold';
            box.style.background = '#f0f0f0';
        } else {
            box.style.backgroundImage = `url('${watch.image}')`;
        }
        
        box.dataset.id = watch.id;
        box.onclick = () => toggleSelection(watch.id);
        grid.appendChild(box);
    });
    
    // Show dev skip button if dev mode startup is enabled
    if (devModeStartup) {
        document.getElementById('devSkipButton').style.display = 'block';
    }
    
    updateDisplayToggle();
}

function toggleSelection(watchId) {
    const selectionMode = document.getElementById('selectionSectionTop').classList.contains('active') ? 'top' : 'bottom';
    
    // Find the correct box based on which grid is active
    let box;
    if (selectionMode === 'top') {
        box = document.getElementById('watchGrid').querySelector(`[data-id="${watchId}"]`);
    } else {
        box = document.getElementById('watchGridBottom').querySelector(`[data-id="${watchId}"]`);
    }
    
    if (!box) return;
    
    if (selectionMode === 'top') {
        if (selectedTop.has(watchId)) {
            selectedTop.delete(watchId);
            box.classList.remove('selected-top');
        } else if (selectedTop.size < 3) {
            selectedTop.add(watchId);
            box.classList.add('selected-top');
            
            // Auto-advance when 3rd item selected
            if (selectedTop.size === 3) {
                setTimeout(() => moveToBottomSelection(), 300);
            }
        }
        updateSelectionUI();
    } else {
        if (selectedBottom.has(watchId)) {
            selectedBottom.delete(watchId);
            box.classList.remove('selected-bottom');
        } else if (selectedBottom.size < 3) {
            selectedBottom.add(watchId);
            box.classList.add('selected-bottom');
        }
        updateSelectionUI();
    }
}

function updateSelectionUI() {
    const isTopPhase = document.getElementById('selectionSectionTop').classList.contains('active');
    
    if (isTopPhase) {
        document.getElementById('topCount').textContent = `${selectedTop.size} / 3`;
    } else {
        document.getElementById('bottomCount').textContent = `${selectedBottom.size} / 3`;
        
        // Auto-advance when 3rd item selected
        if (selectedBottom.size === 3) {
            setTimeout(() => startComparisons(), 300);
        }
    }
}

function moveToBottomSelection() {
    document.getElementById('selectionSectionTop').classList.remove('active');
    document.getElementById('selectionSectionBottom').classList.add('active');
    
    // Populate bottom selection grid
    const gridBottom = document.getElementById('watchGridBottom');
    gridBottom.innerHTML = '';
    
    watches.forEach(watch => {
        if (!selectedTop.has(watch.id)) {
            const box = document.createElement('div');
            box.className = 'watch-box';
            
            if (displayMode === 'dev') {
                box.textContent = watch.jsonId;
                box.style.fontSize = '2.5rem';
                box.style.fontWeight = 'bold';
                box.style.background = '#f0f0f0';
            } else {
                box.style.backgroundImage = `url('${watch.image}')`;
            }
            
            box.dataset.id = watch.id;
            box.onclick = () => toggleSelection(watch.id);
            gridBottom.appendChild(box);
        }
    });
    
    updateSelectionUI();
}

function backToTopSelection() {
    document.getElementById('selectionSectionBottom').classList.remove('active');
    document.getElementById('selectionSectionTop').classList.add('active');
    selectedBottom.clear();
    // Clear the bottom grid styling
    document.querySelectorAll('#watchGridBottom [data-id]').forEach(box => {
        box.classList.remove('selected-bottom');
    });
    updateSelectionUI();
}

function resetSelection() {
    selectedTop.clear();
    selectedBottom.clear();
    document.querySelectorAll('.watch-box').forEach(box => {
        box.classList.remove('selected-top', 'selected-bottom');
    });
    updateSelectionUI();
}

function skipToResults() {
    // Randomly select 3 watches as top 3
    const shuffled = [...watches].sort(() => Math.random() - 0.5);
    const topWatches = shuffled.slice(0, 3).sort((a, b) => a.id - b.id);
    const remaining = shuffled.slice(3);
    const bottomWatches = remaining.slice(0, 3).sort((a, b) => a.id - b.id);
    middleWatches = remaining.slice(3);

    allWatches = [...topWatches, ...middleWatches, ...bottomWatches];

    // Jump straight to results
    document.getElementById('selectionSectionTop').classList.remove('active');
    document.getElementById('resultsSection').classList.add('active');
    finishComparisons();
}

function toggleDisplayMode() {
    displayMode = displayMode === 'dev' ? 'normal' : 'dev';
    updateDisplayToggle();
    
    // Reinitialize the currently visible grid
    const isTopPhase = document.getElementById('selectionSectionTop').classList.contains('active');
    const isBottomPhase = document.getElementById('selectionSectionBottom').classList.contains('active');
    
    if (isTopPhase) {
        initializeSelection();
    } else if (isBottomPhase) {
        moveToBottomSelection();
    }
    
    if (document.getElementById('resultsSection').classList.contains('active')) {
        finishComparisons();
    }
}

function updateDisplayToggle() {
    const btn = document.getElementById('displayToggle');
    if (devModeStartup) {
        btn.classList.add('visible');
        btn.textContent = displayMode === 'dev' ? 'Show Images' : 'Show IDs';
    }
}

function startComparisons() {
    // Prepare rankings
    allWatches = [];
    
    // Hide about link
    document.getElementById('aboutLink').style.display = 'none';
    
    // Normalize selection order by sorting by watch ID
    const topWatches = Array.from(selectedTop)
        .sort((a, b) => a - b)
        .map(id => watches.find(w => w.id === id));
    
    // Middle watches (unselected)
    middleWatches = watches.filter(w => 
        !selectedTop.has(w.id) && !selectedBottom.has(w.id)
    );
    
    // Bottom 3 will be placed last, also sorted by ID
    const bottomWatches = Array.from(selectedBottom)
        .sort((a, b) => a - b)
        .map(id => watches.find(w => w.id === id));

    // Initialize all watches
    allWatches = [...topWatches, ...middleWatches, ...bottomWatches];
    
    // Comparisons: top 3 needs ~4, middle 4 needs ~6, bottom 3 needs ~3-5
    comparisonLimit = 13;
    completedComparisons = 0;
    currentPass = 0;
    currentIndex = 0;

    // Hide selection, show comparison
    document.getElementById('selectionSectionBottom').classList.remove('active');
    document.getElementById('comparisonSection').classList.add('active');

    showNextComparison();
}

function showNextComparison() {
    // Once we've done enough comparisons, finish
    if (completedComparisons >= comparisonLimit) {
        finishComparisons();
        return;
    }

    // Start with top group (top 5 + middle)
    const topGroupSize = selectedTop.size + middleWatches.length;
    const bottomGroupStart = topGroupSize;

    // If we've finished the top group, switch to bottom group
    if (currentPass === 0 && currentIndex >= topGroupSize - 1) {
        currentPass = 1;
        currentIndex = bottomGroupStart;
    }

    // Comparison logic depends on which group
    if (currentPass === 0) {
        // Top group sorting
        if (currentIndex < topGroupSize - 1) {
            const watch1 = allWatches[currentIndex];
            const watch2 = allWatches[currentIndex + 1];

            displayComparison(watch1, watch2, (watchNumber) => {
                if (watchNumber === 2) {
                    [allWatches[currentIndex], allWatches[currentIndex + 1]] = 
                    [allWatches[currentIndex + 1], allWatches[currentIndex]];
                }

                currentIndex++;
                completedComparisons++;
                setTimeout(() => showNextComparison(), 300);
            });
        }
    } else {
        // Bottom group rough sorting (just 1-2 passes)
        const bottomGroupEnd = allWatches.length;
        const bottomPass = currentPass - 1;

        if (bottomPass >= 2) {
            // Done with bottom group
            finishComparisons();
            return;
        }

        if (currentIndex < bottomGroupEnd - 1 - bottomPass) {
            const watch1 = allWatches[currentIndex];
            const watch2 = allWatches[currentIndex + 1];

            displayComparison(watch1, watch2, (watchNumber) => {
                if (watchNumber === 2) {
                    [allWatches[currentIndex], allWatches[currentIndex + 1]] = 
                    [allWatches[currentIndex + 1], allWatches[currentIndex]];
                }

                currentIndex++;
                completedComparisons++;
                setTimeout(() => showNextComparison(), 300);
            });
        } else {
            // End of this pass, move to next
            currentPass++;
            currentIndex = bottomGroupStart;
            showNextComparison();
        }
    }
}

function displayComparison(watch1, watch2, callback) {
    // Randomly swap order to avoid consistent clicking patterns
    let display1 = watch1;
    let display2 = watch2;
    const shouldSwap = Math.random() > 0.5;
    
    if (shouldSwap) {
        [display1, display2] = [display2, display1];
    }
    
    // Map clicked position back to original watch position
    const wrappedCallback = (clickedPosition) => {
        const clickedWatch = clickedPosition === 1 ? display1 : display2;
        const originalPosition = clickedWatch === watch1 ? 1 : 2;
        callback(originalPosition);
    };
    
    if (displayMode === 'dev') {
        document.getElementById('image1').style.display = 'none';
        document.getElementById('label1').textContent = display1.jsonId;
        document.getElementById('label1').style.fontSize = '3rem';
        document.getElementById('label1').style.paddingTop = '150px';

        document.getElementById('image2').style.display = 'none';
        document.getElementById('label2').textContent = display2.jsonId;
        document.getElementById('label2').style.fontSize = '3rem';
        document.getElementById('label2').style.paddingTop = '150px';
    } else {
        document.getElementById('image1').style.display = 'block';
        document.getElementById('label1').textContent = display1.name;
        document.getElementById('image1').src = display1.image;
        document.getElementById('label1').style.fontSize = '0.9rem';
        document.getElementById('label1').style.paddingTop = '10px';

        document.getElementById('image2').style.display = 'block';
        document.getElementById('label2').textContent = display2.name;
        document.getElementById('image2').src = display2.image;
        document.getElementById('label2').style.fontSize = '0.9rem';
        document.getElementById('label2').style.paddingTop = '10px';
    }

    const progress = Math.min((completedComparisons / comparisonLimit) * 100, 100);
    document.getElementById('progressFill').style.width = progress + '%';
    document.getElementById('progressText').textContent = 
        `Comparison ${completedComparisons + 1} / ${comparisonLimit}`;

    document.getElementById('watch1').classList.remove('selected');
    document.getElementById('watch2').classList.remove('selected');

    window.currentComparisonCallback = wrappedCallback;
}

function selectWinner(watchNumber) {
    if (window.currentComparisonCallback) {
        document.getElementById(`watch${watchNumber}`).classList.add('selected');
        window.currentComparisonCallback(watchNumber);
    }
}

function finishComparisons() {
    showResults();
}

function showResults() {
    document.getElementById('selectionSectionTop').classList.remove('active');
    document.getElementById('selectionSectionBottom').classList.remove('active');
    document.getElementById('comparisonSection').classList.remove('active');
    document.getElementById('resultsSection').classList.add('active');
    document.getElementById('aboutLink').style.display = 'block';

    const rankedList = document.getElementById('rankedList');
    rankedList.innerHTML = '';

    allWatches.forEach((watch, index) => {
        const li = document.createElement('li');
        li.className = 'ranked-item';
        
        if (displayMode === 'dev') {
            li.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <div class="watch-name">Watch ${watch.jsonId}</div>
            `;
        } else {
            li.innerHTML = `
                <div class="rank-number">${index + 1}</div>
                <img class="rank-image" src="${watch.image}" alt="Watch ${watch.name}">
                <div class="watch-name">${watch.name}</div>
            `;
        }
        
        rankedList.appendChild(li);
    });
    
    // Generate ranking URL with the final order
    const rankedIds = allWatches.map(w => w.jsonId);
    const rankingUrl = encodeWatchSet(rankedIds, 'r');
    if (rankingUrl) {
        const fullUrl = `#${rankingUrl}`;
        document.getElementById('shareRankingUrl').value = window.location.origin + window.location.pathname + fullUrl;
        window.history.replaceState({}, '', fullUrl);
    }
}

function copyShareUrl() {
    const shareUrl = document.getElementById('shareRankingUrl');
    shareUrl.select();
    
    try {
        document.execCommand('copy');
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    } catch (err) {
        console.error('Failed to copy:', err);
    }
}

function downloadResults() {
    let markdown = '# My Watch Rankings\n\n';
    allWatches.forEach((watch, index) => {
        if (displayMode === 'dev') {
            markdown += `${index + 1}. Watch ${watch.jsonId}\n`;
        } else {
            markdown += `${index + 1}. ${watch.name}\n`;
        }
    });

    markdown += '\n---\n\n[Create your own ranking](https://solidred.co.uk/watchvs/)\n';

    const textArea = document.createElement('textarea');
    textArea.value = markdown;
    textArea.style.position = 'fixed';
    textArea.style.opacity = '0';
    document.body.appendChild(textArea);
    textArea.select();

    try {
        document.execCommand('copy');
        const button = event.target;
        const originalText = button.textContent;
        button.textContent = '✓ Copied!';
        setTimeout(() => {
            button.textContent = originalText;
        }, 2000);
    } finally {
        document.body.removeChild(textArea);
    }
}

function restart() {
    selectedTop.clear();
    selectedBottom.clear();
    document.getElementById('selectionSectionTop').classList.add('active');
    document.getElementById('selectionSectionBottom').classList.remove('active');
    document.getElementById('resultsSection').classList.remove('active');
    document.getElementById('comparisonSection').classList.remove('active');
    document.getElementById('aboutLink').style.display = 'block';
    
    // Go back to choice mode with same watch set
    const choiceUrl = encodeWatchSet(originalWatchSetIds, 'c');
    if (choiceUrl) {
        window.history.replaceState({}, '', `#${choiceUrl}`);
    }
    
    initializeSelection();
    updateSelectionUI();
}

function loadNewSet() {
    // Clear hash and reload
    window.history.replaceState({}, '', window.location.pathname);
    location.reload();
}

// Expose functions to global scope for HTML onclick handlers
window.loadWatches = loadWatches;
window.loadNewSet = loadNewSet;
window.initializeSelection = initializeSelection;
window.updateSelectionUI = updateSelectionUI;
window.moveToBottomSelection = moveToBottomSelection;
window.backToTopSelection = backToTopSelection;
window.skipToResults = skipToResults;
window.startComparisons = startComparisons;
window.selectWinner = selectWinner;
window.finishComparisons = finishComparisons;
window.downloadResults = downloadResults;
window.copyShareUrl = copyShareUrl;
window.restart = restart;

window.addEventListener('load', () => {
    loadWatches();
});

window.addEventListener('hashchange', () => {
    loadWatches();
});
