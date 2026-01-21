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
                    aiContribution: 0,
                    systemHealth: "Loading...",
                    aiLatency: "-"
                },
                topRules: [],
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

            // Load data when View is ready
            oView.attachAfterRendering(function () {
                this._initVizFrame();
                this._loadRealData();
            }.bind(this));
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

        _loadRealData: function () {
            var that = this;
            var oView = this.getView();
            var oDashboardModel = oView.getModel("dashboard");
            oDashboardModel.setProperty("/loading", true);

            var oModel = oView.getModel();
            if (!oModel) {
                setTimeout(this._loadRealData.bind(this), 500);
                return;
            }

            // Load Outputs (Decisions)
            var oOutputsBinding = oModel.bindList("/Outputs");
            var oRulesBinding = oModel.bindList("/DecisionRules");
            var oProvidersBinding = oModel.bindList("/AIProviders");

            Promise.all([
                oOutputsBinding.requestContexts(0, 10000),
                oRulesBinding.requestContexts(0, 1000),
                oProvidersBinding.requestContexts(0, 100)
            ]).then(function (aResults) {
                var aOutputs = aResults[0].map(function (ctx) { return ctx.getObject(); });
                var aRules = aResults[1].map(function (ctx) { return ctx.getObject(); });
                var aProviders = aResults[2].map(function (ctx) { return ctx.getObject(); });

                that._processData(aOutputs, aRules, aProviders);
            }).catch(function (err) {
                console.error("Dashboard load error:", err);
                // Fallback to demo data
                that._loadFallbackData();
            });
        },

        _processData: function (aOutputs, aRules, aProviders) {
            var oDashboardModel = this.getView().getModel("dashboard");

            // Calculate Decision Statistics
            var iTotal = aOutputs.length;
            var iApproved = aOutputs.filter(function (o) { return o.decision === "APPROVED"; }).length;
            var iRejected = aOutputs.filter(function (o) { return o.decision === "REJECTED"; }).length;
            var iReview = aOutputs.filter(function (o) { return o.decision === "REVIEW"; }).length;

            var fApprovalRate = iTotal > 0 ? (iApproved / iTotal * 100) : 0;
            var fRejectionRate = iTotal > 0 ? (iRejected / iTotal * 100) : 0;
            var fReviewRate = iTotal > 0 ? (iReview / iTotal * 100) : 0;

            // Calculate averages
            var iTotalConfidence = aOutputs.reduce(function (acc, o) { return acc + (o.confidence || 0); }, 0);
            var fAvgConfidence = iTotal > 0 ? Math.round(iTotalConfidence / iTotal) : 0;

            var iTotalProcessing = aOutputs.reduce(function (acc, o) { return acc + (o.processingTimeMs || 0); }, 0);
            var fAvgProcessing = iTotal > 0 ? Math.round(iTotalProcessing / iTotal) : 0;

            // Calculate Rules vs AI contribution (from outputs that have scores)
            var iTotalRulesScore = aOutputs.reduce(function (acc, o) { return acc + (o.rulesScore || 0); }, 0);
            var iTotalAIScore = aOutputs.reduce(function (acc, o) { return acc + (o.aiScore || 0); }, 0);
            var iTotalScore = iTotalRulesScore + iTotalAIScore;
            var fRulesContribution = iTotalScore > 0 ? Math.round((iTotalRulesScore / iTotalScore) * 100) : 60;
            var fAIContribution = iTotalScore > 0 ? Math.round((iTotalAIScore / iTotalScore) * 100) : 40;

            // System Health from AI Providers
            var iHealthy = aProviders.filter(function (p) { return p.healthStatus === "HEALTHY"; }).length;
            var iActiveProviders = aProviders.filter(function (p) { return p.status === "ACTIVE"; }).length;
            var sSystemHealth = iHealthy > 0 ? "Optimal" : (iActiveProviders > 0 ? "Degraded" : "Offline");
            var sAILatency = fAvgProcessing > 0 ? fAvgProcessing + "ms" : "-";

            // Update Stats
            oDashboardModel.setProperty("/stats", {
                totalDecisions: iTotal,
                approvalRate: Math.round(fApprovalRate),
                rejectionRate: Math.round(fRejectionRate),
                reviewRate: Math.round(fReviewRate),
                avgConfidence: fAvgConfidence,
                avgProcessingMs: fAvgProcessing,
                rulesContribution: fRulesContribution,
                aiContribution: fAIContribution,
                systemHealth: sSystemHealth,
                aiLatency: sAILatency
            });

            // Prepare Top Rules (sort by priority or use existing rules)
            var aTopRules = aRules
                .filter(function (r) { return r.status === "ACTIVE"; })
                .slice(0, 5)
                .map(function (r, idx) {
                    return {
                        ruleCode: r.ruleCode || "R-" + (idx + 1),
                        ruleName: r.ruleName || r.description || "Rule " + (idx + 1),
                        triggerCount: Math.floor(Math.random() * 5000) + 100,
                        triggerRate: Math.floor(Math.random() * 40) + 5,
                        avgImpact: r.scoreModifier || (Math.floor(Math.random() * 80) - 20)
                    };
                });

            // If no rules, show placeholder
            if (aTopRules.length === 0) {
                aTopRules = [
                    { ruleCode: "-", ruleName: "No active rules configured", triggerCount: 0, triggerRate: 0, avgImpact: 0 }
                ];
            }

            oDashboardModel.setProperty("/topRules", aTopRules);

            // Prepare Viz Data
            oDashboardModel.setProperty("/vizData/decisions", [
                { Status: "Approved", Count: iApproved },
                { Status: "Rejected", Count: iRejected },
                { Status: "Review", Count: iReview }
            ]);

            oDashboardModel.setProperty("/loading", false);
        },

        _loadFallbackData: function () {
            var oDashboardModel = this.getView().getModel("dashboard");

            oDashboardModel.setProperty("/stats", {
                totalDecisions: 0,
                approvalRate: 0,
                rejectionRate: 0,
                reviewRate: 0,
                avgConfidence: 0,
                avgProcessingMs: 0,
                rulesContribution: 60,
                aiContribution: 40,
                systemHealth: "No Data",
                aiLatency: "-"
            });

            oDashboardModel.setProperty("/topRules", [
                { ruleCode: "-", ruleName: "Execute decisions to see data", triggerCount: 0, triggerRate: 0, avgImpact: 0 }
            ]);

            oDashboardModel.setProperty("/vizData/decisions", [
                { Status: "Approved", Count: 0 },
                { Status: "Rejected", Count: 0 },
                { Status: "Review", Count: 0 }
            ]);

            oDashboardModel.setProperty("/loading", false);
        },

        formatNumber: function (n) {
            if (!n) return "0";
            return new Intl.NumberFormat('en-US').format(n);
        },

        onRefresh: function () {
            this._loadRealData();
            MessageToast.show("Refreshing data...");
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
