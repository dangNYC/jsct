// -------------------------------------------------------------------------------------
// 
//  FilterBar - manages applying/clearing subsetting criteria on codeTrack collection
//
//  Like CommandBar view this view persists for the life of the app and its markup is in 
//  index.html. Because of this it doesn't use a template, its el and its child elements 
//  are already on the DOM at init. This means its render is a bit unusual, render just 
//  hides/shows the el based on the application model's currentState and currentLayout. 
//  Using existing elements like this can be useful for a persistent view but it does
//  have a potential downside of more tightly coupling the view to the DOM. 
//
//  Evaluating filter criteria is done only in this module, so if the criteria collected 
//  change in future this is the only place that needs mods. When a filter is applied this
//  view evaluates criteria on each model and sets a Boolean meetsFilterCriteria on each.
//
//  SUMMARY: 
//  * this view is created just once, by appController at app init
//  * it doesn't use a template, its el and children are defined in index.html
//  * though it persists through the life of the app it's sometimes set to display:none
//  * because it's never removed it doesn't need to track and cleanup its child el's
//  * its simple render just hides/shows its el
//
// -------------------------------------------------------------------------------------
/*global Backbone, jQuery */

(function ($) {

    'use strict';

    jsct.FilterBar = Backbone.View.extend({

        // The el here is an existing DOM element from index.html. More info about this above
        el: "#filterBar",

        events: {
            "click #clearFilter": "clearFilter",
            // Head's Up: listeners below apply filter criteria upon ANY change IMMEDIATELY, including 
            // on individual keystroke. This is ok for this small collection but it wouldn't scale for 
            // very large collections. In that case better to exec applyFilter() via an APPLY button. 
            //XX replaced keyup event w/input event for Android 2.3 Firefox  
            //XX "keyup  #filterText": "applyFilter" , 
            "input  #filterText": "applyFilter",
            "change #filterType": "applyFilter",
            "click  #filterStar": "toggleStar"
        },

        initialize: function (options) {

            if (jsct.showDiags) console.log("VIEW: filterBar INITIALIZE() executing");

            // Boolean passed to constructor controls restoring prev session's filter
            this.restorePrevFilter = options.initFilter;

            // This view's el and child elements are embedded in the core html (index.html).
            // Because of this it's safe to fetch and cache child elements at initialization
            this.$filterText = this.$("#filterText");
            this.$filterFeedback = this.$('#filterFeedback');
            this.$filterType = this.$('#filterType');
            this.$filterStar = this.$('#filterStar');

            this.filterActive = false;
            this.filterCriteria = {};

            // ensure we always get a render at startup
            this.render();

            this.listenTo(jsct.application, 'change:currentState', this.render);
            this.listenTo(jsct.application, 'change:currentLayout', this.render);
            // FilterBar visibliity can be set via a button on CommandBar. That's a different view, 
            // and don't want views communicating directly thru refs to each other, so keep things
            // loosely coupled through an application state var (so it's event-based communication)
            this.listenTo(jsct.application, "change:showFilterBar", this.setVisibility);

            // Important: whenever they edit a model we must update its meetsFilterCriteria Boolean.
            // Note: change events come from models, but collection passes these on - a big benefit
            // of collections, letting you set one listener instead of one listener on each model.
            this.listenTo(jsct.codeTrackCollection, 'change', this.filterOnEdit);
            // Similar to above for when they add a new item 
            this.listenTo(jsct.codeTrackCollection, 'add', this.filterOnEdit);

            // If prev session had a filter active then appController read those criteria in from 
            // localStorage. To restore we fill filter fields from these criteria then apply them
            if (this.restorePrevFilter) {
                this.$filterText.val(jsct.application.get("filterText"));
                this.$filterType.val(jsct.application.get("filterType"));
                if (jsct.application.get("filterStar")) {
                    this.$filterStar.addClass("selected");
                }
                this.applyFilter();
            }
        },

        // This isn't a "normal" BB render that creates DOM elements. That's because FilterBar's markup  
        // including children is all defined in index.html. Moreover, this view is never destroyed, it 
        // persists the entire application lifecycle. So all this render needs to do is show/hide the el	
        render: function () {

            if (jsct.showDiags) console.log("VIEW: filterBar RENDER() executing");

            // The filter view shows/hides itself based on application state and user preference  
            if ( (jsct.application.get("currentState") === "list" || jsct.application.get("currentLayout") === "dualPane" ) 
                  && jsct.application.get("showFilterBar") ) {
                this.$el.show();
            }
            else {
                this.$el.hide();
            }
            return this;
        },

        // FilterBar can be hidden by the user through a commandBar button (the magnifying-glass icon).  
        // This method responds to a user request to show/hide the filterBar thru a simple jquery effect
        setVisibility: function (model, showFilterBar) {
            if (showFilterBar) {
                this.$el.slideDown();
            }
            else {
                this.$el.slideUp();
            }
        },

        toggleStar: function () {
            this.$filterStar.toggleClass("selected");
            this.applyFilter();
        },

        applyFilter: function () {

            this.filterCriteria = {
                filterText: this.$filterText.val().toLowerCase(),
                filterType: this.$filterType.val(),
                filterByStar: this.$filterStar.hasClass("selected")
            };

            // First check if the change to filter criteria was a "manual" clearing of filter criteria by 
            // the user (i.e., they cleared cleared the text field, set <select> to ALL, deselected star)
            if ( this.filterCriteria.filterText.trim().length === 0 && this.filterCriteria.filterType === "" 
                  && !this.$filterStar.hasClass("selected") ) {
                this.clearFilter();
                return;
            }

            this.filterActive = true;

            jsct.application.set("filterIsActive", this.filterActive);
            // Put selected info into application model to allow session restore
            jsct.application.set("filterText", this.filterCriteria.filterText);
            jsct.application.set("filterType", this.filterCriteria.filterType);
            jsct.application.set("filterStar", this.filterCriteria.filterByStar);

            // this does the real work
            this.filterAll();

            jsct.pubsub.trigger("setMsg", '');
        },

        filterOnEdit: function (codeTrack) {

            // This event handler runs whenever they edit a model, is needed to refresh  
            // model's meetsCriteria value - BUT need only when filter is actually active
            if (!this.filterActive) {
                return;
            }

            if (jsct.showDiags) console.log("VIEW: FilterBar applying filter criteria on edited model");

            // if they edit a model need to refresh its meetsFilterCritera Boolean	
            this.filterOne(codeTrack);
            // always broadcast an event when applying filter  
            jsct.pubsub.trigger('filterApplied');

        },

        filterOne: function (codeTrack) {

            var titleMeetsCriteria = true,
                descripMeetsCriteria = true,
                typeMeetsCriteria = true,
                taggedMeetsCriteria = true;

            if (this.filterCriteria.filterText && this.filterCriteria.filterText.trim() !== "") {
                titleMeetsCriteria = codeTrack.get("title").toLowerCase().indexOf(this.filterCriteria.filterText) < 0 ? false : true;
                descripMeetsCriteria = codeTrack.get("descrip").toLowerCase().indexOf(this.filterCriteria.filterText) < 0 ? false : true;
            }

            if (this.filterCriteria.filterType !== "") {
                typeMeetsCriteria = (codeTrack.get("type") === this.filterCriteria.filterType);
            }

            if (this.filterCriteria.filterByStar) {
                taggedMeetsCriteria = (codeTrack.get("tagged") === this.filterCriteria.filterByStar);
            }

            codeTrack.setMeetsFilterCriteria((titleMeetsCriteria || descripMeetsCriteria) && typeMeetsCriteria &&
                taggedMeetsCriteria);
        },

        filterAll: function () {

            if (jsct.showDiags) console.log("VIEW: FilterBar applying filter criteria (sets meetsCriteria Boolean on all models)");
            jsct.codeTrackCollection.each(this.filterOne, this);
            // broadcast each time a filter has been fully applied 
            jsct.pubsub.trigger('filterApplied');
        },

        clearFilter: function () {

            // if no filter is active then there's no work to do
            if (this.filterActive === false) {
                return;
            }

            this.filterActive = false;
            jsct.codeTrackCollection.each(function (codeTrack) {
                codeTrack.setMeetsFilterCriteria(true);
            });

            jsct.application.set("filterIsActive", this.filterActive);

            this.$filterText.val('');
            this.$filterType.val('');
            this.$filterStar.removeClass("selected");
            jsct.pubsub.trigger("setMsg", 'Filter cleared');
            if (jsct.showDiags) console.log("VIEW: FilterBar clearing filter (sets meetsCriteria to TRUE on all models)");
        }
    });

})(jQuery);