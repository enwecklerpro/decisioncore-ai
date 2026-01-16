sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/m/MessageToast"
], function (Controller, MessageToast) {
    "use strict";

    return Controller.extend("decisioncore.admin.controller.Main", {

        onInit: function () {
            // Controller initialized
        },

        onRefresh: function () {
            this.getView().getModel().refresh();
            MessageToast.show("Refreshed");
        }
    });
});
