// ---------------------------------------------------------------------------------
//     
//  Summary view - combines listview of codeTrack items with a status bar view 
//
//  This view brings together 2 other views to create an overview of codeTracks.
//  One child view is a list of codetrack items and below that is a list footer
//  which provides feedback on collection status (e.g., total # of items).
//  So, this view does little work beyond creating/combining its child views. 
//
//  The el for this view is a div with display:flex (i.e. it uses CSS flexbox). 
//  This simplifies laying out child views and using available space: a footer 
//  of fixed height is at bottom, with the list above it filling remaining space.
//
//  This view is a bit of an exploration, definitely non-standard. That's because
//  this view is reused -- that is, it's created once and never remove()'d, just  
//  reparented and sometimes cached off-DOM (caching can happen when in singlePane 
//  layout). In general Backbone views are created/destroyed as needed and their 
//  render may be run many times. However, since this demo app displays this view   
//  so much of the time (100% of the time in dualPane layout) I wanted to have it   
//  persistent and just hide or reparent as necessary. Still, in most cases keeping 
//  views around and reusing instead of recreating and/or rerendering them is
//  probably more trouble than it's worth.
//
//  Child view handling here is minimal, vastly simplified by the fact that this view   
//  is created once per session and then reused, never re-rendered, and never remove()'d.
//  That means we don't need to worry about cleaning up child views to avoid memory leaks.
//  For more on this see the JSCT Overview post sections on Nesting Views and Zombie Views
//
// ---------------------------------------------------------------------------------------
/*global Backbone, jQuery */

(function ($) {

    'use strict';

    jsct.SummaryView = Backbone.View.extend({

        // el => no el or tagName specified here OR passed in via a constructor
        // parm so Backbone creates a default empty <div> for wrapper, el value

        className: "flexboxContainer",
 
        // Note: this id is just used to make div easier to recognize in devtools Elements view, otherwise not used 
        id: "summaryView",

        template: _.template($('#summary-template').html()),

        initialize: function () {

            if (jsct.showDiags) {
                console.log("VIEW: Summary INITIALIZE() executing");
                console.info("%cNote: Summary view contains 2 child views which display 1) the list and 2) the list footer",
                    "color:#407cc9;font-weight:bold");
            }
            this.listenTo(jsct.application, 'change:filterIsActive', this.setFilterCue);
            // This view is rendered only once. However, while not needing more renders
            // it does need to update the global msgline whenever it's displayed...
            this.listenTo(jsct.application, 'change:currentState', this.refresh);
        },

        // This render is a bit unusual, run just once per session - for details see header commment above
        render: function () {

            if (jsct.showDiags) console.log("VIEW: Summary RENDER() executing");

            // Fill el with view's markup so we can work with its elements, but note this isn't on DOM yet
            this.$el.html(this.template());

            // --------------------------------------------------------------------------------------------
            // Generate child views and put them into <div> elements defined in Summary's template. Child 
            // CodeTrackList is a list of all codeTrack items. Child StatusBar view is used as list footer.
            // NOTE: This demos 2 DIFFERENT METHODS of putting the child view in the DOM/document. In both
            // methods the child views are ignorant of their document context -- i.e. it's the parent view 
            // that determines where the child views are inserted into the DOM/document. This keeps those
            // child views loosely coupled, maximizes flexibility for how/where the child views are used.
            // --------------------------------------------------------------------------------------------

            // METHOD 1: Summary view instantiates CodeTrackList with the child's el coming via the child's
            // tagName property (i.e., BB creates the element). The render() populates this el and then the
            // result (returned by render()) is html()'d into #listMain. Bottom line: the parent determines 
            // where this child view is inserted into the DOM/document), child is ignorant of DOM context. 
            this.$("#listMain").html(new jsct.CodeTrackList().render().el);

            // METHOD 2: Summary view passes to its StatusBar child an el value (a <div> defined in this
            // view's template and created at the start of this render()). As with Method 1, this approach
            // keeps the child view ignorant of its document context.  Since the parent provides the DOM 
            // element for the child's el we need only a render() here, not any DOM manipulation.
            new jsct.StatusBar({el: this.$(".listFooter")}).render();

            // remind user when data is filtered 
            this.setFilterCue();

            return this;
        },

        // If filter is active set visual cue (yellow border) to remind user they're viewing a data subset
        setFilterCue: function () {
            this.$el.toggleClass('filterActiveIndicator', jsct.application.get("filterIsActive"));
        },

        // this just updates the global message line with status info 
        refresh: function () {
            if (jsct.application.get("currentState") === "list") {
                // passing empty string triggers default msg w/info on data status, appropriate for this view
                jsct.pubsub.trigger("setMsg", '');
            }
        }
    });
})(jQuery);