sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, JSONModel, MessageToast, MessageBox) {
    "use strict";

    // Sample payloads
    var SAMPLES = {
        credit: {
            amount: 15000,
            riskLevel: 3,
            customerType: "STANDARD",
            country: "DE",
            previousApprovals: 5,
            previousRejections: 0,
            documentsVerified: true
        },
        fraud: {
            amount: 25000,
            transactionsLast24h: 8,
            country: "US",
            customerType: "PREMIUM",
            isFirstTime: false
        },
        vendor: {
            amount: 100000,
            riskLevel: 4,
            monthsSinceOnboarding: 12,
            country: "DE",
            documentsVerified: true
        }
    };

    return Controller.extend("decisioncore.execute.controller.Main", {

        onInit: function () {
            var oViewModel = new JSONModel({
                busy: false,
                scenarioName: "",
                correlationId: "",
                payload: JSON.stringify(SAMPLES.credit, null, 2),
                isSimulation: true,
                result: null,
                hasResult: false
            });
            this.getView().setModel(oViewModel, "view");
        },

        onEvaluate: function () {
            this._executeDecision();
        },

        _executeDecision: function () {
            var oView = this.getView();
            var oViewModel = oView.getModel("view");
            var sScenario = oViewModel.getProperty("/scenarioName");
            var sPayload = oViewModel.getProperty("/payload");
            var sCorrelationId = oViewModel.getProperty("/correlationId");
            var bSimulation = oViewModel.getProperty("/isSimulation");
            var that = this;

            // Validation
            if (!sScenario) {
                MessageBox.warning("Please select a scenario first");
                return;
            }

            try {
                JSON.parse(sPayload);
            } catch (e) {
                MessageBox.error("Invalid JSON: " + e.message);
                return;
            }

            oViewModel.setProperty("/busy", true);
            oViewModel.setProperty("/hasResult", false);

            // Use fetch API for reliability
            fetch("/api/decision/EvaluateDecision", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json",
                    "Authorization": "Basic " + btoa("admin:admin")
                },
                body: JSON.stringify({
                    scenarioName: sScenario,
                    payload: sPayload,
                    correlationId: sCorrelationId || "test-" + Date.now(),
                    isSimulation: bSimulation
                })
            })
                .then(function (response) {
                    return response.json();
                })
                .then(function (oResult) {
                    // Parse JSON strings for display
                    if (oResult.rulesFired) {
                        try {
                            oResult.rulesFired = JSON.stringify(JSON.parse(oResult.rulesFired), null, 2);
                        } catch (e) { }
                    }
                    if (oResult.explanation) {
                        try {
                            var exp = JSON.parse(oResult.explanation);
                            oResult.explanation = JSON.stringify(exp, null, 2);
                        } catch (e) { }
                    }

                    oViewModel.setProperty("/result", oResult);
                    oViewModel.setProperty("/hasResult", true);
                    oViewModel.setProperty("/busy", false);

                    var sMsg = bSimulation ? "Simulation completed" : "Decision executed";
                    MessageToast.show(sMsg + ": " + oResult.decision);
                })
                .catch(function (oError) {
                    oViewModel.setProperty("/busy", false);
                    MessageBox.error("Error: " + oError.message);
                });
        },

        onClear: function () {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/scenarioName", "");
            oViewModel.setProperty("/correlationId", "");
            oViewModel.setProperty("/payload", JSON.stringify(SAMPLES.credit, null, 2));
            oViewModel.setProperty("/result", null);
            oViewModel.setProperty("/hasResult", false);
        },

        onLoadCreditSample: function () {
            this._loadSample("credit", "CREDIT_APPROVAL");
        },

        onLoadFraudSample: function () {
            this._loadSample("fraud", "FRAUD_DETECTION");
        },

        onLoadVendorSample: function () {
            this._loadSample("vendor", "VENDOR_RISK");
        },

        _loadSample: function (sType, sScenario) {
            var oViewModel = this.getView().getModel("view");
            oViewModel.setProperty("/payload", JSON.stringify(SAMPLES[sType], null, 2));
            oViewModel.setProperty("/scenarioName", sScenario);
            MessageToast.show("Loaded " + sType + " sample");
        }
    });
});
