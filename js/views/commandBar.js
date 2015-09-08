// --------------------------------------------------------------------------
// Command bar - app-global controls - for globalmessages and app navigation
//
//  Because this view is app-global and always visible and persists through 
//  the entire application lifecycle it's a bit different than "normal" 
//  Backbone views in the following ways:
//  - it is created just once, by appController, into an existing DOM element
//  - it does not use a template - its el and child el's are in the <header>
//    of the main HTML file index.html
//  - because of the above it doesn't need to create and cleanup child el's
//  - its simple render just hides/shows child elements. Render runs whenever 
//    the application model's currentState or currentLayout are changed
// -------------------------------------------------------------------------
/*global Backbone, jQuery */

(function ($) {

    'use strict';

    jsct.CommandBar = Backbone.View.extend({

        el: "#commandBar",

        events: {
            "click .toggleFilterVisible": "toggleFilterVisibility",
        },

        initialize: function () {

            if (jsct.showDiags) console.log("VIEW: commandBar INITIALIZE() executing");

            // The HTML for this view is in index.html, _NOT_ injected/rendered via template. That's 
            // because the commandBar is always displayed, only the visibility of its buttons varies.
            // Because this view's el and children are defined in index.html (and thus on DOM at page 
            // load) this view can fetch/cache references to its child elements at view initialization
            this.$msgLine = this.$("#msgLine");
            this.$commandButtonHome = this.$('.home');
            this.$commandButtonHelp = this.$('.help');
            this.$commandButtonAddNew = this.$('.addNew');
            this.$commandButtonGlobalOptions = this.$('.globalOptions');
            this.$commandButtonToggleFilterVisible = this.$('.toggleFilterVisible');
            this.$window = $(window);

            // this module displays global messages at top of screen
            this.listenTo(jsct.pubsub, 'setMsg', this.setMsg);
            // clear message upon user interaction to avoid stale messages 
            this.$window.click($.proxy(this.clearMsg, this));

            this.listenTo(jsct.application, 'change:currentState', this.render);
            this.listenTo(jsct.application, 'change:currentLayout', this.render);

            // ensure that correct buttons are visible at startup 
            this.render();
            // at startup display the default msgText 
            this.setMsg("") ; 
        },

        // An exploration of view persistence here: this view is always visible, it's basically the
        // app-global navigator (also displays global messages).  Markup is embedded in index.html
        // so no need to render from template. However, the view navigation options do vary based on  
        // app state so render's job here is just hiding/showing buttons in response to state changes
        render: function () {

            if (jsct.showDiags) console.log("VIEW: commandBar RENDER() executing");

            var currentState = jsct.application.get("currentState");
            var currentLayout = jsct.application.get("currentLayout");
            if (currentLayout === "dualPane" || currentState === "list") {
                this.$commandButtonHome.hide();
                this.$commandButtonToggleFilterVisible.show();
                this.$commandButtonAddNew.show();
                this.$commandButtonGlobalOptions.show();
                this.$commandButtonHelp.show();
            }
            // remainder only apply to singlePane layout
            else if (currentState === "browseEdit") {
                this.$commandButtonHome.show();
                this.$commandButtonToggleFilterVisible.hide();
                this.$commandButtonAddNew.show();
                this.$commandButtonGlobalOptions.hide();
                this.$commandButtonHelp.show();
            }
            else if (currentState === "add" || currentState === "globalOptions") {
                this.$commandButtonHome.show();
                this.$commandButtonToggleFilterVisible.hide();
                this.$commandButtonAddNew.hide();
                this.$commandButtonGlobalOptions.hide();
                this.$commandButtonHelp.show();
            }
            else if (currentState === "help") {
                this.$commandButtonHome.show();
                this.$commandButtonToggleFilterVisible.hide();
                this.$commandButtonAddNew.hide();
                this.$commandButtonGlobalOptions.hide();
                this.$commandButtonHelp.hide();
            }

            return this;
        },

        toggleFilterVisibility: function () {
            jsct.application.set("showFilterBar", !jsct.application.get("showFilterBar"));
        },

        // Display text on the global messageline. Can accept either 
        // string or object. ShortMsgText is used for portrait phones
        setMsg: function (newMsgText) {

            var msgText, shortMsgText;

            if (newMsgText === "") {
                this.setDefaultMsg();
                return;
            }

            if (typeof newMsgText === "string") {
                msgText = newMsgText;
                shortMsgText = newMsgText;
            }
            else if ($.isPlainObject(newMsgText)) {
                msgText = newMsgText.msgText;
                shortMsgText = newMsgText.shortMsgText || newMsgText.msgText;
            }

            // arbitrary hardcode breakpoint for displaying shorter msg text
            if (this.$window.width() < 350) {
                this.msgText = shortMsgText;
            }
            else {
                this.msgText = msgText;
            }
            this.$msgLine.html(this.msgText);
        },

        clearMsg: function (msgText) {

            // this clears stale messsages upon any interaction with window
            if (this.msgText === this.prevMsgText) {
                this.msgText = '';
                this.setDefaultMsg();
            }
            this.prevMsgText = this.msgText;
        },

        setDefaultMsg: function () {
            if (jsct.application.get("filterIsActive")) {
                this.setMsg("Filtered: " + jsct.codeTrackCollection.satisfyFilter().length);
            }
            else {
                this.setMsg("Total: " + jsct.codeTrackCollection.length);
            }
        },
    });

})(jQuery);