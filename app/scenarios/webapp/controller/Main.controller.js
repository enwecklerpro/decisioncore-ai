sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, JSONModel) {
    "use strict";

    return Controller.extend("decisioncore.scenarios.controller.Main", {

        onInit: function () {
        },

        onCreateScenario: function () {
            // Open the Template Selection Dialog
            if (!this._pTemplateDialog) {
                this._pTemplateDialog = this.loadFragment({
                    name: "decisioncore.scenarios.view.TemplateSelectDialog"
                });
            }
            this._pTemplateDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onTemplateSearch: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var oFilter = new sap.ui.model.Filter("name", sap.ui.model.FilterOperator.Contains, sValue);
            var oBinding = oEvent.getSource().getBinding("items");
            oBinding.filter([oFilter]);
        },

        onTemplateConfirm: function (oEvent) {
            var oSelectedItem = oEvent.getParameter("selectedItem");
            if (!oSelectedItem) {
                return;
            }

            var oCtx = oSelectedItem.getBindingContext();
            var oTemplate = oCtx.getObject();
            var that = this;

            // 1. We create the scenario entry in the OData model
            var oModel = this.getView().getModel();
            var oListBinding = oModel.bindList("/DecisionScenarios");

            var oNewContext = oListBinding.create({
                name: oTemplate.name + " (" + new Date().toLocaleTimeString() + ")", // Auto-name to avoid duplicates
                description: oTemplate.description,
                status: "DRAFT",
                template_ID: oTemplate.ID,
                inputSchema: oTemplate.inputSchema,
                // Set default values based on template best practices (could also come from DB)
                rulesWeight: 60,
                aiWeight: 40
            });

            oNewContext.created().then(function () {
                MessageToast.show("Scenario created successfully using template: " + oTemplate.name);
                // Optionally navigate to details here
            }).catch(function (oError) {
                MessageToast.show("Error creating scenario: " + oError.message);
            });
        },

        onTemplateCancel: function () {
            // User cancelled
        },

        onPressOpenPopover: function (oEvent) {
            MessageToast.show("System Status is online");
        }
    });
});
