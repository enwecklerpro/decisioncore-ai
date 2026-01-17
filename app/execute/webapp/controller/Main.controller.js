sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast"
], function (Controller, JSONModel, MessageToast) {
    "use strict";

    return Controller.extend("decisioncore.execute.controller.Main", {

        onInit: function () {
            // View model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                scenario: "", // Selected scenario key
                correlationId: "",
                payload: '{\n  "amount": 5000,\n  "riskLevel": 3,\n  "customerType": "STANDARD",\n  "country": "DE"\n}',
                result: null,
                hasResult: false
            });
            this.getView().setModel(oViewModel, "view");
        },

        onScenarioChange: function (oEvent) {
            var oItem = oEvent.getParameter("selectedItem");
            if (oItem) {
                var oCtx = oItem.getBindingContext();
                // Request the inputSchema property explicitly if it's not automatically loaded
                oCtx.requestProperty("inputSchema").then(function (sSchema) {
                    if (sSchema) {
                        this.getView().getModel("view").setProperty("/payload", sSchema);
                        sap.m.MessageToast.show("Template loaded from Scenario");
                    }
                }.bind(this));
            }
        },

        onEvaluate: function () {
            var oViewModel = this.getView().getModel("view");
            var oSelect = this.byId("scenarioSelect");
            var oItem = oSelect.getSelectedItem();

            if (!oItem) {
                MessageToast.show("Please select a scenario.");
                return;
            }

            var sScenarioName = oItem.getText();
            var sPayload = oViewModel.getProperty("/payload");
            var sCorrelation = oViewModel.getProperty("/correlationId");

            oViewModel.setProperty("/busy", true);

            // Call CAP Action 'SimulateDecision'
            fetch("/api/decision/SimulateDecision", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    scenarioName: sScenarioName,
                    payload: sPayload,
                    correlationId: sCorrelation
                })
            })
                .then(res => {
                    if (!res.ok) return res.json().then(e => { throw new Error(e.error.message || "Server Error") });
                    return res.json();
                })
                .then(data => {
                    // Parse nested JSON strings from backend
                    var aRules = [];
                    try { if (data.rulesFired) aRules = JSON.parse(data.rulesFired); } catch (e) { }

                    var oResultUI = {
                        decision: data.decision || "UNKNOWN",
                        finalScore: data.finalScore || 0,
                        confidence: data.confidence || 0,
                        processingTimeMs: data.processingTimeMs || 0,
                        explanation: data.explanation || "",
                        rulesFired: aRules,
                        rawJson: JSON.stringify(data, null, 2)
                    };

                    oViewModel.setProperty("/result", oResultUI);
                    oViewModel.setProperty("/hasResult", true);
                    oViewModel.setProperty("/busy", false);
                    MessageToast.show("Simulation successful: " + oResultUI.decision);
                })
                .catch(err => {
                    oViewModel.setProperty("/busy", false);
                    // Fallback for demo continuity
                    var oFallback = {
                        rawJson: JSON.stringify({ error: err.message, note: "Check if server supports SimulateDecision action" }, null, 2)
                    };
                    oViewModel.setProperty("/result", oFallback);
                    MessageToast.show("Exec Error: " + err.message);
                });
        },

        onLoadSample: function () {
            var sSample = JSON.stringify({
                "amount": 12500,
                "currency": "EUR",
                "vendorId": "V-9921",
                "riskCategory": "MEDIUM",
                "description": "Consulting services for Q1 Project Alpha"
            }, null, 2);
            this.getView().getModel("view").setProperty("/payload", sSample);
            MessageToast.show("Sample loaded");
        },

        onClear: function () {
            this.getView().getModel("view").setProperty("/result", null);
            this.getView().getModel("view").setProperty("/hasResult", false);
        }
    });
});
