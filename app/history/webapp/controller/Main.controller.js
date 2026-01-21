sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, MessageBox, JSONModel, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("decisioncore.history.controller.Main", {

        onInit: function () {
            // Initialize stats model
            var oStatsModel = new JSONModel({
                totalDecisions: 0,
                approvedCount: 0,
                rejectedCount: 0,
                reviewCount: 0,
                avgConfidence: "0%",
                avgProcessing: "0ms",
                approvalRate: "0%"
            });
            this.getView().setModel(oStatsModel, "stats");

            // Load stats after data is loaded
            this._loadStats();
        },

        _loadStats: function () {
            var oView = this.getView();
            var oStatsModel = oView.getModel("stats");

            var oModel = oView.getModel();
            if (!oModel) {
                setTimeout(this._loadStats.bind(this), 500);
                return;
            }

            var oBinding = oModel.bindList("/Outputs");
            oBinding.requestContexts(0, 10000).then(function (aContexts) {
                var aOutputs = aContexts.map(function (ctx) { return ctx.getObject(); });
                var iTotal = aOutputs.length;

                if (iTotal === 0) {
                    oStatsModel.setData({
                        totalDecisions: 0,
                        approvedCount: 0,
                        rejectedCount: 0,
                        reviewCount: 0,
                        avgConfidence: "0%",
                        avgProcessing: "0ms",
                        approvalRate: "0%"
                    });
                    return;
                }

                var iApproved = aOutputs.filter(function (o) { return o.decision === "APPROVED"; }).length;
                var iRejected = aOutputs.filter(function (o) { return o.decision === "REJECTED"; }).length;
                var iReview = aOutputs.filter(function (o) { return o.decision === "REVIEW"; }).length;

                // Calculate averages
                var iTotalConfidence = aOutputs.reduce(function (acc, o) { return acc + (o.confidence || 0); }, 0);
                var iAvgConfidence = Math.round(iTotalConfidence / iTotal);

                var iTotalProcessing = aOutputs.reduce(function (acc, o) { return acc + (o.processingTimeMs || 0); }, 0);
                var iAvgProcessing = Math.round(iTotalProcessing / iTotal);

                var fApprovalRate = ((iApproved / iTotal) * 100).toFixed(0);

                oStatsModel.setData({
                    totalDecisions: iTotal,
                    approvedCount: iApproved,
                    rejectedCount: iRejected,
                    reviewCount: iReview,
                    avgConfidence: iAvgConfidence + "%",
                    avgProcessing: iAvgProcessing + "ms",
                    approvalRate: fApprovalRate + "%"
                });
            }).catch(function () {
                // Ignore errors
            });
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            this._loadStats();
            MessageToast.show("Refreshed");
        },

        onOutcomeFilter: function (oEvent) {
            var sKey = oEvent.getParameter("selectedItem").getKey();
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");

            if (sKey) {
                oBinding.filter([new Filter("decision", FilterOperator.EQ, sKey)]);
            } else {
                oBinding.filter([]);
            }
        },

        onShowDetails: function (oEvent) {
            var oContext = oEvent.getSource().getBindingContext();
            var oOutput = oContext.getObject();

            sap.ui.require([
                "sap/m/Dialog", "sap/m/VBox", "sap/m/Text", "sap/m/Button",
                "sap/m/ObjectStatus", "sap/m/ObjectNumber", "sap/m/Label",
                "sap/ui/layout/form/SimpleForm", "sap/m/TextArea"
            ], function (Dialog, VBox, Text, Button, ObjectStatus, ObjectNumber, Label, SimpleForm, TextArea) {
                var oDialog = new Dialog({
                    title: "Decision Details",
                    contentWidth: "600px",
                    content: [
                        new SimpleForm({
                            editable: false,
                            layout: "ResponsiveGridLayout",
                            labelSpanL: 4,
                            labelSpanM: 4,
                            content: [
                                new Label({ text: "Decision ID" }),
                                new Text({ text: oOutput.ID }),

                                new Label({ text: "Decision" }),
                                new ObjectStatus({
                                    text: oOutput.decision,
                                    state: oOutput.decision === "APPROVED" ? "Success" : oOutput.decision === "REJECTED" ? "Error" : "Warning",
                                    inverted: true
                                }),

                                new Label({ text: "Final Score" }),
                                new ObjectNumber({ number: oOutput.finalScore, unit: "/100" }),

                                new Label({ text: "Confidence" }),
                                new ObjectNumber({ number: oOutput.confidence, unit: "%" }),

                                new Label({ text: "Processing Time" }),
                                new Text({ text: (oOutput.processingTimeMs || 0) + " ms" }),

                                new Label({ text: "Rules Score" }),
                                new ObjectNumber({ number: oOutput.rulesScore || 0 }),

                                new Label({ text: "AI Score" }),
                                new ObjectNumber({ number: oOutput.aiScore || 0 }),

                                new Label({ text: "Explanation" }),
                                new TextArea({
                                    value: oOutput.explanation || "-",
                                    rows: 3,
                                    width: "100%",
                                    editable: false
                                }),

                                new Label({ text: "Created At" }),
                                new Text({ text: oOutput.createdAt ? new Date(oOutput.createdAt).toLocaleString() : "-" })
                            ]
                        })
                    ],
                    endButton: new Button({
                        text: "Close",
                        press: function () {
                            oDialog.close();
                            oDialog.destroy();
                        }
                    }),
                    afterClose: function () {
                        oDialog.destroy();
                    }
                });
                oDialog.open();
            });
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
            element.setAttribute('download', 'decision_audit_' + new Date().getTime() + '.csv');
            element.style.display = 'none';
            document.body.appendChild(element);
            element.click();
            document.body.removeChild(element);

            MessageToast.show("Audit log exported to CSV");
        },

        onExportPDF: function () {
            MessageToast.show("PDF export coming soon - use CSV for now");
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("historyTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                var oFilterDecision = new Filter({
                    path: "decision",
                    operator: FilterOperator.Contains,
                    value1: sQuery,
                    caseSensitive: false
                });
                var oFilterID = new Filter({
                    path: "ID",
                    operator: FilterOperator.Contains,
                    value1: sQuery,
                    caseSensitive: false
                });
                var oCombined = new Filter({ filters: [oFilterDecision, oFilterID], and: false });
                oBinding.filter(oCombined);
            } else {
                oBinding.filter([]);
            }
        }
    });
});
