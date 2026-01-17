sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/ui/model/json/JSONModel",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/ui/model/Sorter",
    "sap/m/MessageBox"
], function (Controller, MessageToast, JSONModel, Filter, FilterOperator, Sorter, MessageBox) {
    "use strict";

    return Controller.extend("decisioncore.scenarios.controller.Main", {

        onInit: function () {
            this._bDescendingSort = false;
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
            var oFilter = new Filter("name", FilterOperator.Contains, sValue);
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

            // USE TABLE BINDING TO CREATE (Ensures UI update)
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            var oNewContext = oBinding.create({
                name: oTemplate.name + " " + new Date().getSeconds(), // Simple unique suffix
                displayName: oTemplate.name,
                description: oTemplate.description,
                status: "DRAFT",
                template_ID: oTemplate.code, // Code is the key for template
                inputSchema: oTemplate.inputSchema,
                rulesWeight: 60,
                aiWeight: 40
            });

            oNewContext.created().then(function () {
                MessageToast.show("Scenario '" + oTemplate.name + "' created successfully.");
                oTable.getBinding("items").refresh(); // Forced refresh just in case
            }).catch(function (oError) {
                MessageBox.error("Error creating scenario: " + oError.message);
            });
        },

        onTemplateCancel: function () {
            // User cancelled
        },

        onSearch: function (oEvent) {
            var sQuery = oEvent.getParameter("query");
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            if (sQuery) {
                var oFilter = new Filter("name", FilterOperator.Contains, sQuery);
                oBinding.filter([oFilter]);
            } else {
                oBinding.filter([]);
            }
        },

        onSort: function () {
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");
            this._bDescendingSort = !this._bDescendingSort;
            var oSorter = new Sorter("name", this._bDescendingSort);
            oBinding.sort(oSorter);
            MessageToast.show("Sorted by Name " + (this._bDescendingSort ? "Descending" : "Ascending"));
        },

        onFilter: function () {
            // Simple filter toggle for Active status
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");

            if (this._bFiltered) {
                oBinding.filter([]);
                this._bFiltered = false;
                MessageToast.show("Filter cleared");
            } else {
                var oFilter = new Filter("status", FilterOperator.EQ, "ACTIVE");
                oBinding.filter([oFilter]);
                this._bFiltered = true;
                MessageToast.show("Filtered by Status: ACTIVE");
            }
        },

        onGroup: function () {
            var oTable = this.byId("scenariosTable");
            var oBinding = oTable.getBinding("items");
            var oSorter = new Sorter("status", false, true); // Group enabled
            oBinding.sort(oSorter);
            MessageToast.show("Grouped by Status");
        },

        onEditScenario: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            this._oConfigContext = oCtx; // Keep reference to OData Context

            var oData = oCtx.getObject();
            var oEditModel = new JSONModel({
                name: oData.name,
                displayName: oData.displayName || oData.name,
                description: oData.description,
                rulesWeight: oData.rulesWeight,
                aiWeight: oData.aiWeight,
                approvalThreshold: oData.approvalThreshold,
                reviewThreshold: oData.reviewThreshold
            });
            this.getView().setModel(oEditModel, "editScenario");

            if (!this._pEditDialog) {
                this._pEditDialog = this.loadFragment({
                    name: "decisioncore.scenarios.view.EditScenarioDialog"
                });
            }
            this._pEditDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onEditScenarioSave: function () {
            var oData = this.getView().getModel("editScenario").getData();

            // Update OData Context fields
            this._oConfigContext.setProperty("displayName", oData.displayName);
            this._oConfigContext.setProperty("description", oData.description);
            this._oConfigContext.setProperty("rulesWeight", oData.rulesWeight);
            this._oConfigContext.setProperty("aiWeight", oData.aiWeight);
            this._oConfigContext.setProperty("approvalThreshold", parseInt(oData.approvalThreshold));
            this._oConfigContext.setProperty("reviewThreshold", parseInt(oData.reviewThreshold));

            this.byId("editScenarioDialog").close();
            MessageToast.show("Configuration saved.");
        },

        onEditScenarioCancel: function () {
            this.byId("editScenarioDialog").close();
        },

        onDeleteScenario: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sName = oCtx.getProperty("name");

            MessageBox.confirm("Permanently delete scenario '" + sName + "'? This will remove all associated rules.", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show("Scenario deleted");
                        }).catch(function (e) {
                            MessageBox.error("Delete failed: " + e.message);
                        });
                    }
                }
            });
        },

        onGenericAction: function () {
            MessageBox.information("This action is reserved for future workflow extensions.");
        },

        onPressOpenPopover: function (oEvent) {
            MessageToast.show("System Status is online. Connected to SAP BTP.");
        }
    });
});
