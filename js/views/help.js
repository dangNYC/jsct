//---------------------------------------------------------------------
//
//  HELP screen
// 
//  This doesn't use a template, it displays markup that it pulls via  
//  ajax when Helpview is first displayed. Once that content is pulled 
//  it's cached and then the cache is used for the rest of the session. 
//
//---------------------------------------------------------------------
/*global Backbone, jQuery*/

(function ($) {

    'use strict';

    jsct.HelpView = Backbone.View.extend({

        // el => no el or tagName specified here OR passed in via a constructor
        // parm so Backbone creates a default empty <div> for wrapper, el value

        id: "help",

        className: "flexboxContainer",

        render: function () {

            if (jsct.showDiags) console.log("VIEW: Help RENDER() executing");
            jsct.pubsub.trigger("setMsg", '<strong>Help</strong>');

            if (!jsct.helpContent) {
                // if the Help content isn't in cache then fetch it
                $.get("help.html", _.bind(this.loadHelp, this), "text");
            }
            else {
                // once Help content is in the cache display is dead simple  
                if (jsct.showDiags) console.log("VIEW: Help content served from local cache");
                this.$el.html(jsct.helpContent);
            }

            return this;
        },

        loadHelp: function (data) {

            if (jsct.showDiags) {
               console.log("VIEW: Help fetching (and caching) help content");
               console.info("%cNote: Help view's initial render does a one-time fetch of help content, then caches it.",
                  "color:#407cc9;font-weight:bold");
            }
            jsct.helpContent = data;
            this.$el.html(jsct.helpContent);

            // Below is mostly for new users on phones (which show only HelpView at app init).
            // It highlights the home button at upper left so new user knows what to do next.
            if (jsct.application.get("currentLayout") === "singlePane" && !jsct.listView) {
                jsct.pubsub.trigger("setMsg", '<strong><span class=startText>&#8666; <i>home view</i></span></strong>');
            }

            if (jsct.firstUse) {
                // New user so do one-time unhide of first-use instructions
                $("#firstUseContent").css("display", "block");
                jsct.firstUse = false;
            }
        }
    });
})(jQuery);
