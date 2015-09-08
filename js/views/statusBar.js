// -----------------------------------------------------------------------------
//
//  StatusBar.js - displays feedback on data status (all models in collection)
//
//  This view provides status on:
//  - total number of items in the collection
//  - the number of items that meet filter criteria (if filter is active)
//  - the number of tagged items (if any)
//
//  In addition it has a button to Clear All Tags (this just loops thru the
//  collection and sets each model's Boolean "tagged" property value to false)
//
//  This status view could be used anywhere in the app, but in this version it 
//  appears in Summary view below list view (basically it serves as list footer) 
//
// ------------------------------------------------------------------------------
/*global Backbone, jQuery */

(function ($) {

    'use strict';

    jsct.StatusBar = Backbone.View.extend({

        // el => the el value is passed in as parm to the constructor call 

        template: _.template($('#status-template').html()),

        events: {
            "click #clear-tagged": "clearTagged",
        },

        initialize: function () {

            if (jsct.showDiags) console.log("VIEW: StatusBar (the list's footer) INITIALIZE() executing");

            // This view provides status of tagged items so listen for those changes
            this.listenTo(jsct.codeTrackCollection, 'change:tagged', this.render);

            // ...and of course listen for any overall changes to collection 
            this.listenTo(jsct.codeTrackCollection, 'add', this.render);
            this.listenTo(jsct.codeTrackCollection, 'destroy', this.render);

            // ...and update filter status info whenever filter state (ON/OFF) changes
            this.listenTo(jsct.application, 'change:filterIsActive', this.render);

            // Need to update filter status info whenever filter criteria are changed. For this
            // we could listen for meetsFilterCriteriaChange events fired by models, but then
            // render would run multiple times, once for each model whose meetsFilterCriteria 
            // Boolean value changes. While this works, it's inefficient, drives lots of renders:
            // => this.listenTo(jsct.codeTrackCollection,'meetsFilterCriteriaChange',this.render)
            // It's more efficient to have FilterBar fire an event when it has fully applied filter
            // By listening for that you can render just once each time the filter criteria change.
            this.listenTo(jsct.pubsub, 'filterApplied', this.render);
        },

        render: function () {

            if (jsct.showDiags) console.log("VIEW: StatusBar (the list's footer) RENDER() executing");
            var total = jsct.codeTrackCollection.length;
            var tagged = jsct.codeTrackCollection.tagged().length;
            var meetsFilter = jsct.application.get("filterIsActive") ? jsct.codeTrackCollection.satisfyFilter().length : -1;
            this.$el.html(this.template({
                total: total,
                tagged: tagged,
                meetsFilter: meetsFilter
            }));
            return this;
        },

        clearTagged: function () {
            // toggle the Boolean 'tagged' property for each currently tagged codeTrack item
           if (jsct.showDiags) console.log("VIEW: StatusBar (the list's footer) resetting all CodeTrack models" +
               " with property tagged=TRUE to tagged=FALSE");

            // For efficiency temporarily stop listening for individual models 'tagged' property change events.
            // W/o this StatusBar render would run for each change (10 item 'resets' would trigger 10 renders).
            // The approach below resets all items tagged state but results in just one StatusBar render.  
            this.stopListening(jsct.codeTrackCollection, 'change:tagged', this.render);
            _.invoke(jsct.codeTrackCollection.tagged(), 'toggleTagged');
            this.render();
            this.listenTo(jsct.codeTrackCollection, 'change:tagged', this.render);
            jsct.pubsub.trigger("setMsg", "All tags cleared");
            return false;
        }
    });
})(jQuery);