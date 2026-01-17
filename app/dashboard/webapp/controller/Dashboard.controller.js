sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("decisioncore.dashboard.controller.Dashboard", {

        onInit: function () {
            var oView = this.getView();
            var oDashboardModel = new JSONModel({
                stats: {
                    totalDecisions: 0,
                    approvalRate: 0,
                    rejectionRate: 0,
                    reviewRate: 0,
                    avgConfidence: 0,
                    avgProcessingMs: 0,
                    rulesContribution: 0,
                    aiContribution: 0
                },
                topRules: [],
                // VizFrame Data structure
                vizData: {
                    decisions: []
                },
                loading: true
            });
            oView.setModel(oDashboardModel, "dashboard");

            // View Settings Model
            var sCurrentTheme = sap.ui.getCore().getConfiguration().getTheme();
            var bIsDark = sCurrentTheme.includes("dark");
            oView.setModel(new JSONModel({ timeRange: "today", autoRefresh: true, darkMode: bIsDark }), "view");

            // Format Chart when View is ready
            oView.attachAfterRendering(() => {
                this._initVizFrame();
                this._loadDashboardData();
            });
        },

        _initVizFrame: function () {
            var oVizFrame = this.byId("idVizFramePie");
            if (oVizFrame) {
                oVizFrame.setVizProperties({
                    plotArea: {
                        dataLabel: { visible: true, showTotal: true },
                        drawingEffect: "glossy"
                    },
                    title: { visible: false },
                    legend: { visible: true }
                });
            }
        },

        _loadDashboardData: function () {
            var oDashboardModel = this.getView().getModel("dashboard");
            oDashboardModel.setProperty("/loading", true);

            // Simulation of API call
            setTimeout(() => {
                // Use Premium Demo Data
                this._updateModel(this._getPremiumDemoData());
            }, 500);
        },

        _getPremiumDemoData: function () {
            return {
                totalDecisions: 12458,
                approvalRate: 68,
                rejectionRate: 24,
                reviewRate: 8,
                avgConfidence: 94,
                avgProcessingMs: 145,
                rulesContribution: 65,
                aiContribution: 35
            };
        },

        _updateModel: function (stats) {
            var oModel = this.getView().getModel("dashboard");

            // 1. Update Stats
            oModel.setProperty("/stats", stats);

            // 2. Mock Top Rules
            oModel.setProperty("/topRules", [
                { ruleCode: "R-CREDIT-01", ruleName: "High Value Credit Check", triggerCount: 4521, triggerRate: 36, avgImpact: 45 },
                { ruleCode: "R-FRAUD-99", ruleName: "Geo-Location Velocity", triggerCount: 1250, triggerRate: 10, avgImpact: -100 },
                { ruleCode: "R-COMP-05", ruleName: "Vendor Sanctions List", triggerCount: 85, triggerRate: 1, avgImpact: -100 },
                { ruleCode: "R-AUTO-02", ruleName: "Standard Auto-Approval", triggerCount: 6500, triggerRate: 52, avgImpact: 20 }
            ]);

            // 3. Prepare Viz Data
            // We calculate counts based on percentages for the visual demo
            var total = stats.totalDecisions;
            var cApprove = Math.round(total * (stats.approvalRate / 100));
            var cReject = Math.round(total * (stats.rejectionRate / 100));
            var cReview = Math.round(total * (stats.reviewRate / 100));

            oModel.setProperty("/vizData/decisions", [
                { Status: "Approved", Count: cApprove },
                { Status: "Rejected", Count: cReject },
                { Status: "Review", Count: cReview }
            ]);

            oModel.setProperty("/loading", false);
        },

        formatNumber: function (n) {
            if (!n) return "0";
            return new Intl.NumberFormat('en-US').format(n);
        },

        onRefresh: function () {
            this._loadDashboardData();
            MessageToast.show("Data refreshed");
        },

        onThemeChange: function (oEvent) {
            var bDark = oEvent.getParameter("state");
            var sTheme = bDark ? "sap_horizon_dark" : "sap_horizon";
            sap.ui.getCore().applyTheme(sTheme);

            if (window.parent) {
                window.parent.postMessage({ type: "setTheme", theme: sTheme }, "*");
            }

            MessageToast.show("Theme " + (bDark ? "Dark" : "Light") + " applied");
        },

        onSettings: function () {
            if (!this._pSettingsDialog) {
                this._pSettingsDialog = this.loadFragment({
                    name: "decisioncore.dashboard.view.SettingsDialog"
                });
            }
            this._pSettingsDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCloseSettings: function () {
            this.byId("settingsDialog").close();
            MessageToast.show("Dashboard preferences updated.");
        }
    });
});
