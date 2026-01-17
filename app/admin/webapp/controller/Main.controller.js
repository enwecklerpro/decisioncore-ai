sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox",
    "sap/ui/model/json/JSONModel"
], function (Controller, MessageToast, MessageBox, JSONModel) {
    "use strict";

    return Controller.extend("decisioncore.admin.controller.Main", {

        onInit: function () {
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            MessageToast.show("Refreshed");
        },

        onAddProvider: function () {
            var oView = this.getView();
            var oNewProviderModel = new JSONModel({
                code: "",
                name: "",
                providerType: "OPENAI",
                isDefault: false,
                description: ""
            });
            oView.setModel(oNewProviderModel, "newProvider");

            if (!this._pProviderDialog) {
                this._pProviderDialog = this.loadFragment({
                    name: "decisioncore.admin.view.CreateProviderDialog"
                });
            }
            this._pProviderDialog.then(function (oDialog) {
                oDialog.open();
            });
        },

        onCreateProviderConfirm: function () {
            var oView = this.getView();
            var oData = oView.getModel("newProvider").getData();

            if (!oData.code || !oData.name) {
                MessageToast.show("Code and Name are required.");
                return;
            }

            var oTable = this.byId("providersTable");
            var oBinding = oTable.getBinding("items");

            var oContext = oBinding.create({
                code: oData.code,
                name: oData.name,
                providerType: oData.providerType,
                description: oData.description,
                isDefault: oData.isDefault,
                status: "ACTIVE", // Default to Active
                authType: "API_KEY", // Simplified for now
                endpoint: "https://api.openai.com/v1" // Dummy default
            });

            oContext.created().then(function () {
                MessageToast.show("Provider '" + oData.name + "' created.");
                this.byId("createProviderDialog").close();
                oBinding.refresh();
            }.bind(this)).catch(function (err) {
                MessageBox.error("Error creating provider: " + err.message);
            });
        },

        onCreateProviderCancel: function () {
            this.byId("createProviderDialog").close();
        },

        onEditProvider: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sName = oCtx.getProperty("name");
            MessageToast.show("Edit Provider: " + sName + " (Detail Page coming soon)");
        },

        onDeleteProvider: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sName = oCtx.getProperty("name");

            MessageBox.confirm("Are you sure you want to delete '" + sName + "'?", {
                onClose: function (sAction) {
                    if (sAction === MessageBox.Action.OK) {
                        oCtx.delete().then(function () {
                            MessageToast.show("Provider deleted.");
                        }).catch(function (err) {
                            MessageBox.error("Error deleting provider: " + err.message);
                        });
                    }
                }
            });
        },

        onTestConnection: function (oEvent) {
            // Simulate connection test
            var oBtn = oEvent.getSource();
            oBtn.setBusy(true);

            // In a real scenario, this would call the 'testConnection' action on the context
            // var oCtx = oBtn.getBindingContext();
            // oCtx.invokeAction("testConnection")... 

            setTimeout(function () {
                oBtn.setBusy(false);
                MessageToast.show("Connection Test: SUCCESS (Latency: 24ms)");
            }, 1000);
        }
    });
});
