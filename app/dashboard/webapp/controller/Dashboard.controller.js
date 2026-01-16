sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("decisioncore.dashboard.controller.Dashboard", {

        onInit: function () {
            this._loadDashboardData();
        },

        _loadDashboardData: function () {
            var oView = this.getView();
            var oDashboardModel = oView.getModel("dashboard");
            var oDataModel = oView.getModel();

            oDashboardModel.setProperty("/loading", true);

            // Load dashboard stats
            var oStatsContext = oDataModel.bindContext("/getDashboardStats(...)");
            oStatsContext.execute().then(function () {
                var oStats = oStatsContext.getBoundContext().getObject();
                oDashboardModel.setProperty("/stats", oStats || {
                    totalDecisions: 0,
                    todayDecisions: 0,
                    approvalRate: 0,
                    rejectionRate: 0,
                    reviewRate: 0,
                    avgConfidence: 0,
                    avgProcessingMs: 0,
                    rulesContribution: 60,
                    aiContribution: 40
                });
            }).catch(function (oError) {
                console.error("Error loading stats:", oError);
                oDashboardModel.setProperty("/stats", {
                    totalDecisions: 0,
                    approvalRate: 0,
                    rejectionRate: 0,
                    reviewRate: 0,
                    avgConfidence: 0,
                    avgProcessingMs: 0,
                    rulesContribution: 60,
                    aiContribution: 40
                });
            });

            // Load top rules
            var oRulesContext = oDataModel.bindContext("/getTopRules(...)");
            oRulesContext.setParameter("scenarioName", null);
            oRulesContext.setParameter("limit", 10);
            oRulesContext.execute().then(function () {
                var aRules = oRulesContext.getBoundContext().getObject().value || [];
                oDashboardModel.setProperty("/topRules", aRules);
                oDashboardModel.setProperty("/loading", false);
            }).catch(function (oError) {
                console.error("Error loading rules:", oError);
                oDashboardModel.setProperty("/topRules", []);
                oDashboardModel.setProperty("/loading", false);
            });
        },

        onRefresh: function () {
            MessageToast.show("Refreshing dashboard...");
            this._loadDashboardData();
        },

        formatNumber: function (value) {
            if (value === null || value === undefined) return "0";
            return Math.round(value * 10) / 10;
        }
    });
});
