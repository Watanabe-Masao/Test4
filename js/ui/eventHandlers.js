/**
 * Event Handlers Module
 * Centralized event handling for UI interactions
 */

import { appState } from '../models/state.js';
import { handleDroppedFiles, loadFile } from '../services/dataLoader.js';
import { toggleTheme } from '../services/storageService.js';
import {
    showConsumableModal,
    showSupplierSettingsModal,
    showSettingsModal,
    closeConsumableModal,
    closeSupplierSettingsModal,
    closeSettingsModal,
    closeValidationModal,
    saveSupplierSettings,
    saveAllSettings
} from './modals.js';
import { updateStoreChips, updateStoreInventoryUI, updateGenerateButton, createEmptyState } from './components.js';
import { formatInput } from '../utils/helpers.js';

/**
 * Initializes all event handlers
 */
export function initializeEventHandlers() {
    setupViewTabHandlers();
    setupStoreChipHandlers();
    setupFileUploadHandlers();
    setupModalHandlers();
    setupThemeToggleHandler();
    setupDropZoneHandler();
    setupKeyboardHandlers();
    setupModalBackdropClose();
}

/**
 * Sets up view tab event handlers
 */
function setupViewTabHandlers() {
    const viewTabs = document.getElementById('view-tabs');
    if (!viewTabs) return;

    viewTabs.addEventListener('click', e => {
        const tab = e.target.closest('.topbar-tab');
        if (!tab) return;

        // Remove active class from all tabs
        viewTabs.querySelectorAll('.topbar-tab').forEach(t => {
            t.classList.remove('active');
        });

        // Add active class to clicked tab
        tab.classList.add('active');

        // Update current view
        const view = tab.dataset.view;
        appState.setCurrentView(view);

        // Trigger render
        if (window.render) {
            window.render();
        }
    });
}

/**
 * Sets up store chip event handlers
 */
function setupStoreChipHandlers() {
    const storeChips = document.getElementById('store-chips');
    if (!storeChips) return;

    storeChips.addEventListener('click', e => {
        const chip = e.target.closest('.chip');
        if (!chip) return;

        // Remove active class from all chips
        storeChips.querySelectorAll('.chip').forEach(c => {
            c.classList.remove('active');
        });

        // Add active class to clicked chip
        chip.classList.add('active');

        // Update current store
        const storeId = chip.dataset.store;
        appState.setCurrentStore(storeId);

        // Trigger render
        if (window.render) {
            window.render();
        }
    });
}

/**
 * Sets up file upload handlers
 */
function setupFileUploadHandlers() {
    // Individual file upload handlers
    const uploadCards = document.querySelectorAll('.upload-card[data-type]');
    uploadCards.forEach(card => {
        const input = card.querySelector('input[type="file"]');
        const type = card.dataset.type;

        if (input && type) {
            input.addEventListener('change', async function() {
                const file = this.files[0];
                if (!file) return;

                showFileProgress(file.name);

                try {
                    await loadFile(file, type);
                    card.classList.add('loaded');
                    hideFileProgress(file.name, true);

                    // Update UI components
                    updateStoreChips();
                    updateStoreInventoryUI();

                    // Check if can generate and refresh empty state
                    const canGenerate = appState.hasData('shiire') && appState.hasData('uriageBaihen');
                    updateGenerateButton(canGenerate);

                    // Refresh onboarding steps if still in empty state
                    refreshOnboardingState();
                } catch (err) {
                    console.error('File load error:', err);
                    hideFileProgress(file.name, false);
                }
            });
        }
    });

    // Upload card click handlers
    document.querySelectorAll('.upload-card').forEach(card => {
        card.addEventListener('click', function() {
            const input = this.querySelector('input[type="file"]');
            if (input) {
                input.click();
            }
        });
    });
}

/**
 * Sets up modal event handlers
 */
function setupModalHandlers() {
    // Consumable modal
    const consumableBtn = document.querySelector('.upload-card:has(#consumable-input)');
    if (consumableBtn) {
        consumableBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showConsumableModal();
        });
    }

    // Supplier settings modal button
    const supplierBtn = document.querySelector('button[onclick*="showSupplierSettingsModal"]');
    if (supplierBtn) {
        supplierBtn.onclick = showSupplierSettingsModal;
    }

    // Settings modal button
    const settingsBtn = document.getElementById('theme-toggle')?.nextElementSibling;
    if (settingsBtn) {
        settingsBtn.onclick = showSettingsModal;
    }

    // Modal close buttons
    document.querySelectorAll('[onclick*="closeConsumableModal"]').forEach(btn => {
        btn.onclick = closeConsumableModal;
    });

    document.querySelectorAll('[onclick*="closeSupplierSettingsModal"]').forEach(btn => {
        btn.onclick = closeSupplierSettingsModal;
    });

    document.querySelectorAll('[onclick*="closeSettingsModal"]').forEach(btn => {
        btn.onclick = closeSettingsModal;
    });

    document.querySelectorAll('[onclick*="closeValidationModal"]').forEach(btn => {
        btn.onclick = closeValidationModal;
    });

    // Modal save buttons
    document.querySelectorAll('[onclick*="saveSupplierSettings"]').forEach(btn => {
        btn.onclick = saveSupplierSettings;
    });

    document.querySelectorAll('[onclick*="saveAllSettings"]').forEach(btn => {
        btn.onclick = saveAllSettings;
    });
}

/**
 * Sets up theme toggle handler
 */
function setupThemeToggleHandler() {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.onclick = toggleTheme;
    }
}

/**
 * Sets up drag and drop zone handler
 */
function setupDropZoneHandler() {
    const dropZone = document.getElementById('drop-zone');
    if (!dropZone) return;

    dropZone.addEventListener('dragover', e => {
        e.preventDefault();
        dropZone.classList.add('drag-over');
    });

    dropZone.addEventListener('dragleave', () => {
        dropZone.classList.remove('drag-over');
    });

    dropZone.addEventListener('drop', async e => {
        e.preventDefault();
        dropZone.classList.remove('drag-over');

        const fileCount = e.dataTransfer.files.length;
        if (fileCount > 0) {
            showFileProgress(`${fileCount}件のファイル`);
        }

        try {
            await handleDroppedFiles(e.dataTransfer.files);
            hideFileProgress(`${fileCount}件のファイル`, true);
        } catch (err) {
            hideFileProgress(`ファイル`, false);
        }

        // Update UI
        updateStoreChips();
        updateStoreInventoryUI();

        // Check if can generate
        const canGenerate = appState.hasData('shiire') && appState.hasData('uriageBaihen');
        updateGenerateButton(canGenerate);

        // Refresh onboarding state
        refreshOnboardingState();
    });

    dropZone.addEventListener('click', () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.multiple = true;
        input.accept = '.xlsx,.xls';

        input.onchange = async () => {
            const fileCount = input.files.length;
            if (fileCount > 0) {
                showFileProgress(`${fileCount}件のファイル`);
            }

            try {
                await handleDroppedFiles(input.files);
                hideFileProgress(`${fileCount}件のファイル`, true);
            } catch (err) {
                hideFileProgress('ファイル', false);
            }

            // Update UI
            updateStoreChips();
            updateStoreInventoryUI();

            // Check if can generate
            const canGenerate = appState.hasData('shiire') && appState.hasData('uriageBaihen');
            updateGenerateButton(canGenerate);

            // Refresh onboarding state
            refreshOnboardingState();
        };

        input.click();
    });
}

/**
 * Sets up generate button handler
 * @param {Function} generateFunction - Function to call when generate is clicked
 */
export function setupGenerateHandler(generateFunction) {
    const generateBtn = document.getElementById('btn-generate');
    if (generateBtn) {
        generateBtn.onclick = generateFunction;
    }
}

/**
 * Sets up export button handler
 * @param {Function} exportFunction - Function to call when export is clicked
 */
export function setupExportHandler(exportFunction) {
    const exportBtn = document.getElementById('btn-export');
    if (exportBtn) {
        exportBtn.onclick = exportFunction;
    }
}

/**
 * Sets up consumable file selection
 */
export function setupConsumableFileHandler(processFunction) {
    const selectBtn = document.querySelector('[onclick*="selectConsumableFiles"]');
    if (selectBtn) {
        selectBtn.onclick = () => {
            document.getElementById('consumable-input')?.click();
        };
    }

    const consumableInput = document.getElementById('consumable-input');
    if (consumableInput) {
        consumableInput.addEventListener('change', async function() {
            const files = this.files;
            if (!files || files.length === 0) return;

            const mode = document.querySelector('input[name="consumable-mode"]:checked')?.value || 'overwrite';
            closeConsumableModal();

            if (processFunction) {
                await processFunction(files, mode);
            }
        });
    }
}

/**
 * Removes all inline event handlers and replaces with proper listeners
 */
export function cleanupInlineHandlers() {
    // Remove onclick attributes and set up proper event listeners
    document.querySelectorAll('[onclick]').forEach(el => {
        const onclickValue = el.getAttribute('onclick');

        if (onclickValue) {
            // Store the onclick value for reference if needed
            el.dataset.onclickBackup = onclickValue;

            // Remove the inline onclick
            el.removeAttribute('onclick');

            // Add proper event listener based on the function name
            if (onclickValue.includes('showConsumableModal')) {
                el.addEventListener('click', showConsumableModal);
            } else if (onclickValue.includes('showSupplierSettingsModal')) {
                el.addEventListener('click', showSupplierSettingsModal);
            } else if (onclickValue.includes('showSettingsModal')) {
                el.addEventListener('click', showSettingsModal);
            } else if (onclickValue.includes('toggleTheme')) {
                el.addEventListener('click', toggleTheme);
            }
            // Add more as needed
        }
    });
}

/**
 * Setup global functions for file loading callbacks
 * Exports functions to window for HTML inline event handlers
 */
export function setupFileLoadingGlobalFunctions() {
    // Wrapper for loadFile that takes input element
    window.loadFile = async function(inputElement, type) {
        const file = inputElement.files?.[0];
        if (!file) return;

        try {
            await loadFile(file, type);
            const card = inputElement.closest('.upload-card');
            if (card) card.classList.add('loaded');

            // Update UI components
            updateStoreChips();
            updateStoreInventoryUI();

            // Check if can generate
            const canGenerate = appState.hasData('shiire') && appState.hasData('uriageBaihen');
            updateGenerateButton(canGenerate);
        } catch (err) {
            console.error('File load error:', err);
        }
    };

    // Wrapper for processConsumableFiles
    window.processConsumableFiles = function(inputElement) {
        // Show modal instead of processing directly
        showConsumableModal();
    };

    // Additional modal functions
    window.selectConsumableFiles = function() {
        document.getElementById('consumable-input')?.click();
    };

    window.closeConsumableModal = closeConsumableModal;

    // Export utility functions
    window.formatInput = formatInput;

    // File progress indicator functions
    window.showFileProgress = showFileProgress;
    window.hideFileProgress = hideFileProgress;
    window.updateFileLoadStatus = updateFileLoadStatus;

    // Sidebar section toggle
    window.toggleSidebarSection = toggleSidebarSection;
}

/**
 * Sets up keyboard event handlers (ESC to close modals)
 */
function setupKeyboardHandlers() {
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            // Close modals in priority order (topmost first)
            const modalIds = [
                'report-preview-modal',
                'column-config-modal',
                'data-management-modal',
                'validation-modal',
                'settings-modal',
                'supplier-settings-modal',
                'consumable-modal'
            ];

            for (const id of modalIds) {
                const modal = document.getElementById(id);
                if (modal && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                    e.preventDefault();
                    return;
                }
            }
        }
    });
}

/**
 * Sets up click-outside-to-close for all modals
 */
function setupModalBackdropClose() {
    const modalIds = [
        'consumable-modal',
        'supplier-settings-modal',
        'settings-modal',
        'validation-modal',
        'report-preview-modal',
        'column-config-modal',
        'data-management-modal'
    ];

    modalIds.forEach(id => {
        const modal = document.getElementById(id);
        if (!modal) return;

        modal.addEventListener('click', (e) => {
            // Only close if clicking the backdrop itself, not the content
            if (e.target === modal) {
                modal.style.display = 'none';
            }
        });
    });
}

/**
 * Shows file loading progress indicator
 * @param {string} filename - Name of file being loaded
 */
function showFileProgress(filename) {
    const progress = document.getElementById('file-progress');
    const bar = document.getElementById('file-progress-bar');
    const status = document.getElementById('file-load-status');

    if (progress) {
        progress.classList.add('active');
    }
    if (bar) {
        bar.style.width = '30%';
        // Animate to 80% over time
        setTimeout(() => { bar.style.width = '80%'; }, 100);
    }
    if (status) {
        status.textContent = `${filename} を読込中...`;
        status.style.color = 'var(--info)';
    }
}

/**
 * Hides file loading progress indicator
 * @param {string} filename - Name of file loaded
 * @param {boolean} success - Whether loading was successful
 */
function hideFileProgress(filename, success = true) {
    const progress = document.getElementById('file-progress');
    const bar = document.getElementById('file-progress-bar');
    const status = document.getElementById('file-load-status');

    if (bar) {
        bar.style.width = '100%';
    }

    if (status) {
        if (success) {
            status.textContent = `${filename} を読込みました`;
            status.style.color = 'var(--success)';
        } else {
            status.textContent = `${filename} の読込に失敗しました`;
            status.style.color = 'var(--danger)';
        }
    }

    // Hide progress bar after completion animation
    setTimeout(() => {
        if (progress) {
            progress.classList.remove('active');
        }
        if (bar) {
            bar.style.width = '0';
        }
    }, 800);

    // Clear status message after a delay
    setTimeout(() => {
        if (status) {
            status.textContent = '';
        }
    }, 3000);
}

/**
 * Updates file load status text
 * @param {string} text - Status text
 * @param {string} color - CSS color variable
 */
function updateFileLoadStatus(text, color = 'var(--text4)') {
    const status = document.getElementById('file-load-status');
    if (status) {
        status.textContent = text;
        status.style.color = color;
    }
}

/**
 * Toggles a collapsible sidebar section
 * @param {string} sectionId - ID of the section element
 */
function toggleSidebarSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    section.classList.toggle('collapsed');
}

/**
 * Refreshes the onboarding state in the empty state view
 * Updates checkmarks when files are loaded
 */
function refreshOnboardingState() {
    const emptyState = document.querySelector('.empty-state');
    if (!emptyState) return;

    const onboardingSteps = emptyState.querySelector('.onboarding-steps');
    if (!onboardingSteps) return;

    // Re-render empty state with updated onboarding
    const content = document.getElementById('content');
    if (content && content.querySelector('.empty-state')) {
        content.innerHTML = createEmptyState(
            '📂',
            'データファイルをアップロードしてください',
            '左のパネルから「仕入」と「売上・売変」ファイルを読み込むと、分析を開始できます',
            true
        );
    }
}
