sap.ui.define([
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel"
], function (UIComponent, JSONModel) {
    "use strict";
    return UIComponent.extend("decisioncore.execute.Component", {
        metadata: { manifest: "json" },
        init: function () {
            UIComponent.prototype.init.apply(this, arguments);

            // View model for UI state
            var oViewModel = new JSONModel({
                busy: false,
                scenarioName: "",
                correlationId: "",
                payload: '{\n  "amount": 5000,\n  "riskLevel": 3,\n  "customerType": "STANDARD",\n  "country": "DE"\n}',
                isSimulation: true,
                result: null,
                hasResult: false
            });
            this.setModel(oViewModel, "view");
        }
    });
});
