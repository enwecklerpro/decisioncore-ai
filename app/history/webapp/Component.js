sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/Device",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, Device, JSONModel) {
    "use strict";

    return UIComponent.extend("decisioncore.history.Component", {

        metadata: {
            manifest: "json"
        },

        init: function () {
            // call the base component's init function
            UIComponent.prototype.init.apply(this, arguments);

            // enable routing
            // this.getRouter().initialize();

            // set the device model
            var oModel = new JSONModel(Device);
            oModel.setDefaultBindingMode("OneWay");
            this.setModel(oModel, "device");
        }
    });
});
