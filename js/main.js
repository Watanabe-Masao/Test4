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
        this.dashboardInstance = null;
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
                this.markUploadCardLoaded('shiire');
            }

            // Restore uriage data
            const uriageRepo = new DataRepository('uriage');
            const uriageData = await uriageRepo.getAll();
            if (uriageData && uriageData.length > 0) {
                appState.setData('uriage', uriageData);
                appState.setData('uriageBaihen', uriageData);
                console.log(`✅ Restored ${uriageData.length} uriage records`);
            }

            // Restore baihen data
            const baihenRepo = new DataRepository('baihen');
            const baihenData = await baihenRepo.getAll();
            if (baihenData && baihenData.length > 0) {
                appState.setData('baihen', baihenData);
                console.log(`✅ Restored ${baihenData.length} baihen records`);
            }

            // Mark upload card as loaded if we have sales/baihen data
            if ((uriageData && uriageData.length > 0) || (baihenData && baihenData.length > 0)) {
                this.markUploadCardLoaded('uriageBaihen');
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
     * Marks an upload card as loaded
     * @param {string} type - The data type
     */
    markUploadCardLoaded(type) {
        const card = document.querySelector(`.upload-card[data-type="${type}"]`);
        if (card) {
            card.classList.add('loaded');
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
     * @param {boolean} skipValidation - Skip validation (used when proceeding with warnings)
     */
    async generate(skipValidation = false) {
        console.log('📊 Starting data generation...');

        // Validate data
        if (!skipValidation) {
            const validation = validateRequiredData();

            if (validation.hasErrors) {
                showValidationModal(validation.warnings);
                return; // Stop if there are errors
            }

            if (validation.hasWarnings) {
                showValidationModal(validation.warnings);
                return; // Show warnings, user can click proceed
            }
        }

        // Show loading state
        const content = document.getElementById('content');
        if (!content) {
            console.error('Content container not found');
            return;
        }

        content.innerHTML = createLoadingState('ダッシュボードを初期化中...');

        // Destroy previous dashboard instance
        if (this.dashboardInstance) {
            try { this.dashboardInstance.destroy(); } catch (e) { /* ignore */ }
            this.dashboardInstance = null;
        }

        // Initialize professional dashboard
        try {
            this.dashboardInstance = await initProfessionalDashboard('content');
            appState.setCurrentView('dashboard');
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

        console.log(`🎨 Rendering view: ${currentView}, store: ${currentStore}`);

        // Check if we have data to work with
        const hasData = appState.hasData('shiire') || appState.hasData('uriageBaihen');
        if (!hasData) {
            this.showEmptyState();
            return;
        }

        if (currentView === 'dashboard') {
            // Re-initialize the professional dashboard
            if (!this.dashboardInstance) {
                this.generate(true);
            }
            // If dashboard already exists, do nothing (keep it as-is)
            return;
        }

        // For other views, show a coming-soon placeholder
        const content = document.getElementById('content');
        if (content) {
            const viewNames = {
                category: '帳合別分析',
                forecast: '週間予測',
                analysis: '予算分析',
                daily: '日別推移',
                summary: '荒利計算',
                reports: 'レポート'
            };
            const viewName = viewNames[currentView] || currentView;
            content.innerHTML = createEmptyState(
                '🚧',
                `${viewName} ビューは開発中です`,
                'ダッシュボードタブをクリックして分析画面に戻れます'
            );
        }
    }

    /**
     * Proceeds with generation despite warnings
     */
    proceedWithWarnings() {
        closeValidationModal();
        this.generate(true);
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
