sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast",
    "sap/m/MessageBox"
], function (Controller, MessageToast, MessageBox) {
    "use strict";

    return Controller.extend("decisioncore.admin.controller.Main", {

        onInit: function () {
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            MessageToast.show("Refreshed");
        },

        onAddProvider: function () {
            // Future: Open Dialog
            MessageToast.show("Add Provider Dialog: Coming Soon");
        },

        onEditProvider: function (oEvent) {
            var oCtx = oEvent.getSource().getBindingContext();
            var sName = oCtx.getProperty("name");
            MessageToast.show("Edit Provider: " + sName);
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
            setTimeout(function () {
                oBtn.setBusy(false);
                MessageToast.show("Connection Test: SUCCESS (Latency: 24ms)");
            }, 1000);
        }
    });
});
