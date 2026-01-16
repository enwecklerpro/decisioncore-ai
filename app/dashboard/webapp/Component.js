sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";

    return UIComponent.extend("decisioncore.dashboard.Component", {
        metadata: { manifest: "json" },

        init: function () {
            // Call parent init
            UIComponent.prototype.init.apply(this, arguments);

            // Create dashboard model
            var oDashboardModel = new JSONModel({
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
            this.setModel(oDashboardModel, "dashboard");
        }
    });
});
