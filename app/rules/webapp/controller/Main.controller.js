sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("decisioncore.rules.controller.Main", {

        onInit: function () {
        },

        onOpenCreateRuleDialog: function () {
            var oView = this.getView();

            // Initialize model for the new rule form
            var oNewRuleModel = new JSONModel({
                ruleCode: "",
                ruleName: "",
                description: "",
                condition: "",
                action: "REJECT",
                scoreModifier: -10,
                priority: 10
            });
            oView.setModel(oNewRuleModel, "newRule");

            if (!this._pRuleDialog) {
                this._pRuleDialog = this.loadFragment({
                    name: "decisioncore.rules.view.CreateRuleDialog"
                });
            }
            this._pRuleDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCreateRuleConfirm: function () {
            var oView = this.getView();
            var oNewRuleData = oView.getModel("newRule").getData();

            // Access controls inside the fragment using byId
            var oScenarioSelect = this.byId("scenarioSelect");
            var sScenarioId = oScenarioSelect ? oScenarioSelect.getSelectedKey() : null;

            if (!sScenarioId) {
                MessageToast.show("Please select a target Scenario.");
                return;
            }
            if (!oNewRuleData.ruleCode || !oNewRuleData.condition) {
                MessageToast.show("Rule Code and Condition are required.");
                return;
            }

            // Create via OData v4 list binding
            var oListBinding = oView.getModel().bindList("/DecisionRules");
            var oContext = oListBinding.create({
                scenario_ID: sScenarioId,
                ruleCode: oNewRuleData.ruleCode,
                ruleName: oNewRuleData.ruleName,
                description: oNewRuleData.description,
                condition: oNewRuleData.condition,
                action: oNewRuleData.action,
                scoreModifier: oNewRuleData.scoreModifier,
                priority: oNewRuleData.priority,
                status: "ACTIVE"
            });

            oContext.created().then(function () {
                MessageToast.show("Rule '" + oNewRuleData.ruleCode + "' created successfully.");
                this.byId("createRuleDialog").close();
                oView.getModel().refresh(); // Refresh table
            }.bind(this)).catch(function (err) {
                MessageToast.show("Error creating rule: " + err.message);
            });
        },

        onCreateRuleCancel: function () {
            this.byId("createRuleDialog").close();
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            MessageToast.show("Refreshed");
        },

        onSearch: function (oEvent) {
            MessageToast.show("Search: " + oEvent.getParameter("query"));
        },

        onFilter: function () {
            MessageToast.show("Filter Dialog not implemented yet");
        }
    });
});
