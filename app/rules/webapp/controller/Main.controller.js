sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator"
], function (Controller, MessageToast, JSONModel, MessageBox, Filter, FilterOperator) {
    "use strict";

    return Controller.extend("decisioncore.rules.controller.Main", {

        onInit: function () {
            this._bFiltered = false;
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
            var oListBinding = oView.getModel().bindList("/Rules");
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
            var sQuery = oEvent.getParameter("query") || oEvent.getParameter("newValue");
            var oTable = this.byId("rulesTable");
            var oBinding = oTable.getBinding("items");
            if (sQuery) {
                var oFilter = new Filter("ruleCode", FilterOperator.Contains, sQuery);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onFilter: function () {
            var oTable = this.byId("rulesTable");
            var oBinding = oTable.getBinding("items");

            if (this._bFiltered) {
                oBinding.filter([]);
                this._bFiltered = false;
                MessageToast.show("Filter off: Showing all Rules");
            } else {
                oBinding.filter([new Filter("status", FilterOperator.EQ, "ACTIVE")]);
                this._bFiltered = true;
                MessageToast.show("Filter active: Showing ACTIVE Rules only (Drafts hidden)");
            }
        },

        onDeleteRule: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sCode = oCtx.getProperty("ruleCode");
            MessageBox.confirm("Permanently delete rule " + sCode + "?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show("Rule deleted");
                        }).catch(function (e) {
                            MessageToast.show("Error: " + e.message);
                        });
                    }
                }
            });
        },

        onDeleteSelectedRules: function () {
            var oTable = this.byId("rulesTable");
            var aSelectedItems = oTable.getSelectedItems();

            if (aSelectedItems.length === 0) {
                MessageToast.show("No rules selected.");
                return;
            }

            MessageBox.confirm("Delete " + aSelectedItems.length + " rules?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        var aPromises = [];
                        aSelectedItems.forEach(function (oItem) {
                            aPromises.push(oItem.getBindingContext().delete());
                        });

                        // Wait for all deletes
                        Promise.all(aPromises).then(function () {
                            MessageToast.show("Selected rules deleted");
                            oTable.removeSelections();
                        }).catch(function (e) {
                            MessageBox.error("Error during deletion: " + e.message);
                        });
                    }
                }
            });
        }
    });
});
