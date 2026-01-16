sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("decisioncore.dashboard.controller.Dashboard", {

        onInit: function () {
            // Create dashboard model if it doesn't exist
            var oView = this.getView();
            var oDashboardModel = oView.getModel("dashboard");

            if (!oDashboardModel) {
                oDashboardModel = new JSONModel({
                    stats: {
                        totalDecisions: 0,
                        todayDecisions: 0,
                        approvalRate: 0,
                        rejectionRate: 0,
                        reviewRate: 0,
                        avgConfidence: 0,
                        avgProcessingMs: 0,
                        rulesContribution: 60,
                        aiContribution: 40
                    },
                    topRules: [],
                    loading: false
                });
                oView.setModel(oDashboardModel, "dashboard");
            }

            // Wait for view to be ready, then load data
            oView.attachAfterRendering(this._loadDashboardData.bind(this));
        },

        _loadDashboardData: function () {
            var oView = this.getView();
            var oDashboardModel = oView.getModel("dashboard");
            var oDataModel = oView.getModel();

            if (!oDashboardModel || !oDataModel) {
                console.log("Models not ready yet");
                return;
            }

            oDashboardModel.setProperty("/loading", true);

            // Load dashboard stats via fetch
            var sServiceUrl = "/api/decision/getDashboardStats()";

            fetch(sServiceUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": "Basic " + btoa("admin:admin")
                }
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (oStats) {
                    oDashboardModel.setProperty("/stats", {
                        totalDecisions: oStats.totalDecisions || 0,
                        todayDecisions: oStats.todayDecisions || 0,
                        approvalRate: Math.round(oStats.approvalRate || 0),
                        rejectionRate: Math.round(oStats.rejectionRate || 0),
                        reviewRate: Math.round(oStats.reviewRate || 0),
                        avgConfidence: Math.round(oStats.avgConfidence || 0),
                        avgProcessingMs: Math.round(oStats.avgProcessingMs || 0),
                        rulesContribution: Math.round(oStats.rulesContribution || 60),
                        aiContribution: Math.round(oStats.aiContribution || 40)
                    });
                    oDashboardModel.setProperty("/loading", false);
                })
                .catch(function (oError) {
                    console.log("Error loading stats:", oError);
                    oDashboardModel.setProperty("/loading", false);
                });

            // Load top rules
            var sRulesUrl = "/api/decision/getTopRules(scenarioName='',limit=10)";

            fetch(sRulesUrl, {
                method: "GET",
                headers: {
                    "Accept": "application/json",
                    "Authorization": "Basic " + btoa("admin:admin")
                }
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (data) {
                    var aRules = data.value || data || [];
                    oDashboardModel.setProperty("/topRules", aRules);
                })
                .catch(function (oError) {
                    console.log("Error loading rules:", oError);
                    oDashboardModel.setProperty("/topRules", []);
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
