// --------------------------------------------------------------------------------
//
//  CodeTrackListItem - displays data for a CodeTrack model instance in an <li>
//
//  Each instance of this view displays the data of a codeTrack model instance.
//  These codeTrackListItem views are children of the <ul>-based CodeTrackList 
//  view, each instance serving as a list item (note the  tagName:"li"  below).
//
//  Each codeTrackListItem view instance sets its own event listeners, listening 
//  for events fired from the CodeTrack model whose data it's displaying.  When 
//  its model fires events like change or destroy the parent list view doesn't   
//  handle the event, instead it's the codeTrackListItem instance displaying that
//  changed/destroyed model which responds, re-rendering when the data changes, or
//  removing itself from the list by destroying itself when its model is destroyed
//
//  Note: the model behind each codeTrackListItem is passed in as a constructor parm
//  (see CodeTrackList). Basically it's: new codeTrackListItem( {model:codeTrack} )  
//
// ----------------------------------------------------------------------------------
/*global Backbone, jQuery*/

(function ($) {

    'use strict';

    jsct.CodeTrackListItem = Backbone.View.extend({

        tagName: "li",

        template: _.template($('#listItem-template').html()),

        // Each <li> contains a "details" button (populates Detail view with the <li>'s 
        // data) and also a "star" button (lets user toggle an item's "tagged" state).
        events: {
            "click a.detailButton": "showDetails",
            "click a.toggle": "toggleTagged"
        },

        initialize: function () {
            
            // Each codeTrackListItem view listens for changes to its model, re-rendering on change.   
            // This keeps everything in sync even when the model is edited in Browse/Edit view.
            this.listenTo(this.model, 'change', this.render);

            // If its model is destroyed then the view destroys itself 
            this.listenTo(this.model, 'destroy', this.removeSelf);

            // This event comes from model but isn't a std BB model event. meetsFilterCriteriaChange
            // is a 'manually' fired change event fired by the model when a filter is applied 
            this.listenTo(this.model, "meetsFilterCriteriaChange", this.setVisibility);

            // When model's data is displayed in Browse/Edit view set a visual cue on the <li>
            this.listenTo(this.model, "activeInBrowsePane", this.setBrowseHilite);
        },

        render: function () {

            this.$el.html(this.template(this.model.toJSON()));
            // The 'tagged' CSS class applies highlighting to the <li>'s 'star' control.
            // Note that jquery function name is a bit misleading here, we aren't toggling
            // (reversing) current state, just setting it to match the stored Boolean value
            this.$el.toggleClass('tagged', this.model.get('tagged'));

            // Can set visiblity without running render but not the other way round	  
            this.setVisibility();
            return this;
        },

        setBrowseHilite: function () {
            this.$el.addClass('browsedRowIndicator');
        },

        setVisibility: function () {
            this.$el.toggleClass('hideItem', !this.model.meetsFilterCriteria);
        },

        // Note that the list isn't responsible for removing list items, instead the item handles this itself
        removeSelf: function (e) {
            if (jsct.showDiags) console.log("VIEW: CodeTrackListItem destroying itself because its model was destroyed");
            this.remove();
        },

        // Toggle "tagged" state of model. The model property change will trigger a render
        toggleTagged: function () {
            this.model.toggleTagged();
        },

        // Show model's data in Browse/Edit detail view when user clicks on details button
        showDetails: function (e) {
            jsct.router.navigate("edit/" + this.model.get('id'), {trigger: true});
        }
    });
})(jQuery);