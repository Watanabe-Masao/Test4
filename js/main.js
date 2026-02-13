/**
 * Main Application Entry Point
 * 仕入粗利管理システム v8 (Refactored)
 */

import { appState } from './models/state.js';
import { loadAndApplyAllSettings, saveAllSettings } from './services/storageService.js';
import { validateRequiredData } from './services/dataLoader.js';
import { exportExcel } from './services/excelService.js';
import { processConsumableFiles } from './services/dataLoader.js';
import { calculator } from './services/database/calculationEngine.js';
import { initDashboard } from './ui/dashboard.js';
import { initSpreadsheetView } from './ui/spreadsheetView.js';
import { initModernDashboard } from './ui/modernDashboard.js';
import { initProfessionalDashboard } from './ui/dashboard/DashboardApp.js';
import {
    initializeEventHandlers,
    setupGenerateHandler,
    setupExportHandler,
    setupConsumableFileHandler,
    setupFileLoadingGlobalFunctions
} from './ui/eventHandlers.js';
import {
    setupModalGlobalFunctions,
    showValidationModal,
    closeValidationModal
} from './ui/modals.js';
import {
    showDataManagementModal,
    closeDataManagementModal
} from './ui/dataManagementModal.js';
import {
    updateViewTabs,
    updateStatsRow,
    updateViewTitle,
    toggleExportButton,
    updateGenerateButton,
    createLoadingState,
    createEmptyState
} from './ui/components.js';
import { initDatabase, showDatabaseInfo, DataRepository } from './services/database/index.js';

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
            // Initialize IndexedDB
            console.log('💾 Initializing database...');
            await initDatabase();
            console.log('✅ Database initialized');

            // Restore data from IndexedDB
            await this.restoreDataFromDB();

            // Load saved settings
            loadAndApplyAllSettings();

            // Setup global functions for modals
            setupModalGlobalFunctions();

            // Setup global functions for file loading
            setupFileLoadingGlobalFunctions();

            // Initialize event handlers
            initializeEventHandlers();

            // Setup generate and export handlers
            setupGenerateHandler(() => this.generate());
            setupExportHandler(() => this.exportData());
            setupConsumableFileHandler((files, mode) => this.handleConsumables(files, mode));

            // Setup global render function
            window.render = () => this.render();

            // Setup global database info function (for debugging)
            window.showDbInfo = showDatabaseInfo;

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
     * Restores data from IndexedDB to appState
     */
    async restoreDataFromDB() {
        try {
            console.log('🔄 Restoring data from IndexedDB...');

            // Restore shiire data
            const shiireRepo = new DataRepository('shiire');
            const shiireData = await shiireRepo.getAll();
            if (shiireData && shiireData.length > 0) {
                appState.setData('shiire', shiireData);
                console.log(`✅ Restored ${shiireData.length} shiire records`);
            }

            // Restore uriage data
            const uriageRepo = new DataRepository('uriage');
            const uriageData = await uriageRepo.getAll();
            if (uriageData && uriageData.length > 0) {
                appState.setData('uriageBaihen', uriageData);
                console.log(`✅ Restored ${uriageData.length} uriage records`);
            }

            // Update generate button state
            const canGenerate = appState.hasData('shiire') && appState.hasData('uriageBaihen');
            updateGenerateButton(canGenerate);

            if (canGenerate) {
                console.log('✅ Data restored - Generate button enabled');
            }
        } catch (error) {
            console.warn('⚠️ Failed to restore data from IndexedDB:', error);
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
                '左のパネルから「仕入」と「売上・売変」ファイルを読み込むと、分析を開始できます',
                true
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
        if (!content) {
            console.error('Content container not found');
            return;
        }

        content.innerHTML = createLoadingState('ダッシュボードを初期化中...');

        // Initialize professional dashboard
        try {
            await initProfessionalDashboard('content');
            console.log('✅ Professional dashboard initialized successfully');
        } catch (err) {
            console.error('❌ Dashboard initialization failed:', err);
            content.innerHTML = createEmptyState(
                '❌',
                'ダッシュボードの初期化に失敗しました',
                err.message || '不明なエラーが発生しました'
            );
        }
    }

    /**
     * Shows spreadsheet view
     */
    async showSpreadsheet() {
        console.log('📊 Opening spreadsheet view...');

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
        if (!content) {
            console.error('Content container not found');
            return;
        }

        content.innerHTML = createLoadingState('スプレッドシートを初期化中...');

        // Initialize spreadsheet view
        try {
            await initSpreadsheetView('content');
            console.log('✅ Spreadsheet view initialized successfully');
        } catch (err) {
            console.error('❌ Spreadsheet view initialization failed:', err);
            content.innerHTML = createEmptyState(
                '❌',
                'スプレッドシートビューの初期化に失敗しました',
                err.message || '不明なエラーが発生しました'
            );
        }
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
window.showSpreadsheet = () => app.showSpreadsheet();

export default app;
