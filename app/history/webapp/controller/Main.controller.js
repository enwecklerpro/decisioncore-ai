sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("decisioncore.history.controller.Main", {

        onInit: function () { },

        onRefresh: function () {
            this.getView().getModel().refresh();
            MessageToast.show("Refreshed");
        },

        onExport: function () {
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");
            var aContexts = oBinding.getCurrentContexts();

            if (aContexts.length === 0) {
                MessageToast.show("No data to export");
                return;
            }

            // Build CSV Content
            var sCSV = "ID;Decision;Score;Confidence;ProcessingMs;Timestamp\n";
            aContexts.forEach(function (oCtx) {
                var oData = oCtx.getObject();
                sCSV += (oData.ID || "") + ";" +
                    (oData.decision || "") + ";" +
                    (oData.finalScore || 0) + ";" +
                    (oData.confidence || 0) + ";" +
                    (oData.processingTimeMs || 0) + ";" +
                    (oData.createdAt || "") + "\n";
            });

            // Trigger Download
            var element = document.createElement('a');
            element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(sCSV));
            element.setAttribute('download', 'decision_logs_' + new Date().getTime() + '.csv');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            MessageToast.show("Logs exported to CSV.");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                var oFilterDecision = new Filter("decision", FilterOperator.Contains, sQuery);
                var oFilterID = new Filter("ID", FilterOperator.Contains, sQuery);
                var oCombined = new Filter({ filters: [oFilterDecision, oFilterID], and: false });
                oBinding.filter(oCombined);
            } else {
                oBinding.filter([]);
            }
        }
    });
});
