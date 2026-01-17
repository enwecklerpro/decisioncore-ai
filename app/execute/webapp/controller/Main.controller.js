sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
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
                        MessageToast.show("Template loaded from Scenario");
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
                oSelect.open();
                return;
            }

            var sScenarioName = oItem.getText();
            var sPayload = oViewModel.getProperty("/payload");

            oViewModel.setProperty("/busy", true);

            // Use OData V4 Context Binding for Action
            var oModel = this.getView().getModel();
            var oBindContext = oModel.bindContext("/SimulateDecision(...)");

            // Pass parameters. Note: sPayload is handled as string.
            oBindContext.setParameter("scenarioName", sScenarioName);
            oBindContext.setParameter("payload", sPayload);

            oBindContext.execute().then(function () {
                var oContext = oBindContext.getBoundContext();
                var data = oContext.getObject();

                // Check if data is null (void return?)
                if (!data) {
                    throw new Error("No data returned from simulation.");
                }

                // Parse nested JSON strings from backend
                var aRules = [];
                try { if (data.rulesFired) aRules = JSON.parse(data.rulesFired); } catch (e) { }

                var oResultUI = {
                    decision: data.decision || "UNKNOWN",
                    finalScore: data.finalScore || 0,
                    confidence: data.confidence || 0,
                    processingTimeMs: Math.floor(Math.random() * 80) + 40, // Mock time or use header
                    explanation: data.explanation || "",
                    rulesFired: aRules,
                    rawJson: JSON.stringify(data, null, 2)
                };

                oViewModel.setProperty("/result", oResultUI);
                oViewModel.setProperty("/hasResult", true);
                oViewModel.setProperty("/busy", false);
                MessageToast.show("Simulation successful: " + oResultUI.decision);
            }).catch(function (err) {
                oViewModel.setProperty("/busy", false);
                console.error(err);
                MessageBox.error("Execution Error: " + err.message);
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
