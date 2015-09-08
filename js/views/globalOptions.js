// -------------------------------------------------------------------------
// 
//  Global options/preferences - lets user customize aspects of environment
//
//  This is largely a placeholder, not many 'real' options here and one of 
//  these is targeted to developers (the hide/show console diagnostics),  
//  not something you'd have in a "real" application
//
// ------------------------------------------------------------------------
/*global Backbone, jQuery*/

(function ($) {

    'use strict';

    jsct.GlobalOptions = Backbone.View.extend({

        // el => no el or tagName specified here OR passed in via a constructor
        // parm so Backbone creates a default empty <div> for wrapper, el value

        className: "flexboxContainer",

        optionsTemplate: _.template($('#globalOptions-template').html()),

        events: {
            "click #optionsUseDualPane": "setUseDualPane",
            "click .dualPanePreset": "setSplitterPreset",
            "click #optionsShowDiagnostics": "setDiags"
        },

        render: function () {

            if (jsct.showDiags) console.log("VIEW: globalOptions RENDER() executing");

            jsct.pubsub.trigger("setMsg", '<strong>Options</strong>');

            var optionsData = ""; // future use 
            this.$el.html(this.optionsTemplate({
                optionsData: ""
            }));

            // set screen values to reflect their saved state
            if (jsct.application.get("useDualPane")) {
                this.$("#optionsUseDualPane").prop('checked', true);
            }
            else {
               this.$(".dualPanePreset").prop("disabled",true);
            }

            if (jsct.showDiags) {
                this.$("#optionsShowDiagnostics").prop('checked', true);
            }

            return this;
        },

        setUseDualPane: function () {
            var isChecked = this.$("#optionsUseDualPane").is(':checked');
            jsct.application.set("useDualPane", isChecked);
            $(".dualPanePreset").prop("disabled", !isChecked );
        },

        setSplitterPreset: function (e) {
            // Value we need is stored in a data- attrib on each SplitterPreset button - see template
            var leftWidth = $(e.currentTarget).attr('data-value');
            jsct.pubsub.trigger("setMsg", 'Panes divider set to ' + leftWidth + "0%");
            jsct.application.set("splitterLocation", leftWidth);
            // This module just fires event, appController (which is responsible for all 
            // primary/secondary pane layout) will catch this event and make the change.
            jsct.pubsub.trigger("splitterLocationChange");
        },

        setDiags: function () {
            var isChecked = this.$("#optionsShowDiagnostics").is(':checked');
            // save in application model so state will be stored/restored between sessions
            jsct.application.set("showDiagnostics", isChecked);
            // and for performance also put in app-global var, this is what's used at runtime
            jsct.showDiags = isChecked;
            // and give some console feedback -- this displays unconditionally
            if (isChecked) {
                console.log("VIEW: globalOptions - developer diagnostics to console ENABLED");
            }
            else {
                console.log("VIEW: globalOptions - developer diagnostics to console DISABLED");
            }
        }
    });
})(jQuery);
