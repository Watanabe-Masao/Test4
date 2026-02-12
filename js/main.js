/**
 * Main Application Entry Point
 * 仕入粗利管理システム v8 (Refactored)
 */

import { appState } from './models/state.js';
import { loadAndApplyAllSettings, saveAllSettings } from './services/storageService.js';
import { validateRequiredData } from './services/dataLoader.js';
import { exportExcel } from './services/excelService.js';
import { processConsumableFiles } from './services/dataLoader.js';
import {
    initializeEventHandlers,
    setupGenerateHandler,
    setupExportHandler,
    setupConsumableFileHandler
} from './ui/eventHandlers.js';
import {
    setupModalGlobalFunctions,
    showValidationModal,
    closeValidationModal
} from './ui/modals.js';
import {
    updateViewTabs,
    updateStatsRow,
    updateViewTitle,
    toggleExportButton,
    createLoadingState,
    createEmptyState
} from './ui/components.js';

/**
 * Application class
 */
class App {
    constructor() {
        this.initialized = false;
    }

    /**
     * Initializes the application
     */
    async initialize() {
        if (this.initialized) return;

        console.log('🚀 Initializing 仕入粗利管理システム v8 (Refactored)');

        try {
            // Load saved settings
            loadAndApplyAllSettings();

            // Setup global functions for modals
            setupModalGlobalFunctions();

            // Initialize event handlers
            initializeEventHandlers();

            // Setup generate and export handlers
            setupGenerateHandler(() => this.generate());
            setupExportHandler(() => this.exportData());
            setupConsumableFileHandler((files, mode) => this.handleConsumables(files, mode));

            // Setup global render function
            window.render = () => this.render();

            // Show initial empty state
            this.showEmptyState();

            this.initialized = true;
            console.log('✅ Application initialized successfully');
        } catch (err) {
            console.error('❌ Application initialization failed:', err);
            throw err;
        }
    }

    /**
     * Shows empty state
     */
    showEmptyState() {
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = createEmptyState(
                '📂',
                'データファイルをアップロードしてください',
                '左のパネルから「仕入」と「売上」ファイルを読み込むと、分析を開始できます'
            );
        }

        updateViewTitle('データ読込待ち');
        updateViewTabs(false);
        updateStatsRow(false);
        toggleExportButton(false);
    }

    /**
     * Generates the analysis
     */
    async generate() {
        console.log('📊 Starting data generation...');

        // Validate data
        const validation = validateRequiredData();

        if (!validation.isValid || validation.hasWarnings) {
            showValidationModal(validation.warnings);

            if (validation.hasErrors) {
                return; // Stop if there are errors
            }

            // If only warnings, allow user to proceed
            return;
        }

        // Show loading state
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = createLoadingState('データ処理中...');
        }

        // Simulate processing (in real implementation, this would call the calculator)
        setTimeout(() => {
            try {
                // This would be replaced with actual calculation logic
                // For now, just show a placeholder
                content.innerHTML = createEmptyState(
                    '🔧',
                    '計算エンジンは次のフェーズで実装予定',
                    'Phase 3ではUI層のリファクタリングを完了しました。\n計算エンジンはPhase 4で実装されます。'
                );

                console.log('✅ Generation completed');
            } catch (err) {
                console.error('❌ Generation failed:', err);
                content.innerHTML = createEmptyState(
                    '❌',
                    'エラーが発生しました',
                    err.message
                );
            }
        }, 500);
    }

    /**
     * Exports data to Excel
     */
    exportData() {
        const result = appState.getResult();
        if (!result) {
            console.warn('No result to export');
            return;
        }

        exportExcel(result);
    }

    /**
     * Handles consumable files
     * @param {FileList} files - Files to process
     * @param {string} mode - Processing mode
     */
    async handleConsumables(files, mode) {
        await processConsumableFiles(files, mode);
    }

    /**
     * Renders the current view
     */
    render() {
        const currentView = appState.getCurrentView();
        const currentStore = appState.getCurrentStore();
        const result = appState.getResult();

        console.log(`🎨 Rendering view: ${currentView}, store: ${currentStore}`);

        if (!result) {
            this.showEmptyState();
            return;
        }

        // This would be replaced with actual rendering logic
        // For now, just show a placeholder
        const content = document.getElementById('content');
        if (content) {
            content.innerHTML = createEmptyState(
                '🎨',
                'レンダリングエンジンは次のフェーズで実装予定',
                `View: ${currentView}\nStore: ${currentStore}`
            );
        }
    }

    /**
     * Proceeds with generation despite warnings
     */
    proceedWithWarnings() {
        closeValidationModal();
        this.generate();
    }
}

// Create and export app instance
const app = new App();

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => app.initialize());
} else {
    app.initialize();
}

// Export for global access if needed
window.app = app;
window.proceedWithWarnings = () => app.proceedWithWarnings();

export default app;
