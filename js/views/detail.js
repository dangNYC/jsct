// --------------------------------------------------------------------------------
// 
//  Detail View - form-like view for adding new item OR browse/edit existing item
//
//  To keep things DRY this is used for both adding a new entry and editing an 
//  existing entry. The cost of this dual responsibility is slightly more complex  
//  code with branching based on mode="ADDNEW" v. mode="BROWSE/EDIT" 
//
//  This does its CRUD through Backbone built-in functionality - methods like save,
//  create, set, etc. While BB apps generally use a RESTful backend note that this 
//  demo app uses localStorage as its dataStore (via Backbone-localStorage adapter).
//  This simplified creating this demo app but does have side effects -- e.g., the
//  datastore is device- and browser-specific. See JSCT Overview post for more info
//
//  See router code for the linkage between this view and its model (for browse/edit
//  the router fetches the model and passes it into Detail view's constructor)
//
//  Notes: 
//  - I call this a "form-like" view -- distinction is that this view doesn't really
//    use HTML form, there's no need for form features like a submit button to handle
//    sending data to the server, instead JS is used for more control, getting    
//    values and submitting them to the backend using Backbone features like save()
//  - as usual in JSCT this module has TONS of comments
//  - as elsewhere in this app I'm using some verbose string values in order to 
//    make the code a bit easier to grok - for example: this.mode==="BROWSE/EDIT"
//  - am being lazy here, have some embedded HTML markup for injecting full screen
//    user feedback, quick and dirty tho generally you should avoid HTML in your JS
//
// --------------------------------------------------------------------------------
(function ($) {

    'use strict';

    jsct.DetailView = Backbone.View.extend({

        // el => no el or tagName specified here OR passed in via a constructor
        // parm so Backbone creates a default empty <div> for wrapper, el value

        className: "flexboxContainer",

        template: _.template($('#detail-template').html()),

        events: {
            "click #addNewItem": "addNewItem",
            "click #saveItem": "saveEdits",
            "click #deleteItem": "deleteItem",
            "click #listViewBtn": "cancel",
            "click #prevItemBtn": "navUpDown",
            "click #nextItemBtn": "navUpDown",
            "click #detailStar": "toggleStar",
            // Let user open the item's URL in a new page/tab
            "click  #openDetailURL": "showPage",
            // When they make any edit we set visual cue to remind them they need to SAVE.
            // Using keyup isn't perfect for this but good enough for a simple demo app.
            "change #detailType": "highlightSaveButton",
            "keyup .detailFieldContainer": "highlightSaveButton"
        },
    
        initialize: function (options) {

            // The model to display is always passed into this view's constructor.
            // Conditional below used to handle case where passed model doesnt exist
            // (e.g. they used Back button to return to a model that's been deleted)
            if (this.model === undefined) {
                this.invalidID = options.invalidID;
            }
            else {
                this.listenTo(this.model, "invalid", this.showValidationError);
                this.listenTo(this.model, "meetsFilterCriteriaChange", this.render);
            }
            this.listenTo(jsct.application, 'change:filterIsActive', this.setFilterHighlight);
            this.listenTo(jsct.application, 'change:currentLayout', this.adjustLayout);

            // used for visual cue on SAVE button to remind them they have edits to be saved
            this.highlightOn = false;
        },

        render: function () {

            if (jsct.showDiags) console.log("VIEW: Detail RENDER() executing");
            
            var modelIDInvalidMsg,
                detailData = {};

            // CASE: Invalid Model (happens when URL hashpart parm held invalid modelID) 
            if (this.model === undefined) {

                jsct.pubsub.trigger("setMsg","Item not in database");
                // For simple messages this direct-injection of markup is ok, no template 
                // required, but in general it's best to avoid putting markup in your js.
                modelIDInvalidMsg = "<div class=detailMsg><h1>Selected item does not exist</h1>" +
                    "<h2>Possibly it was deleted since last accessed.<br/> " + 
                    "The invalid item ID was:<br/>" + this.invalidID + "</h2></div>";
                this.$el.html(modelIDInvalidMsg);
                jsct.application.set("lastBrowsedModelID", "");
                return this;
            }

            // CASE: Creating/adding a new item to db (this case is dead simple)
            if (!this.model.id) {                
                this.mode = "ADDNEW";
                jsct.pubsub.trigger("setMsg", '<strong>Add New</strong>');
                // from model get object with data values (new model has default values)
                detailData = this.model.toJSON();
            }
            // CASE: Browsing/Editing an existing item (less simple, e.g. honors data filter)
            else {

                // First store the id so future session can pick up at the same place 
                jsct.application.set("lastBrowsedModelID", this.model.get("id"));
                
                // Now look for data filter -- Browse/Edit honors any active filter criteria
                var filterIsActive = jsct.application.get("filterIsActive");
                // Set filter-is-active visual cue on the pane to match filter's current state
                this.setFilterHighlight();
                // check if model meets filter criteria (not a BB attrib so no get(), it's a normal object property
                var modelMeetsCriteria = this.model.meetsFilterCriteria;
                // If this item doesn't meet filter criteria tell them and don't render its data  
                if (filterIsActive && !modelMeetsCriteria) {

                    // Retain any unsaved edits so can restore them when filter is cleared 
                    this.inProgressEdits = this.getScreenValues();
                    this.$el.html("<div class='detailMsg detailMsgNoFilter'>" +
                        "<h1>Selected item does not meet filter criteria</h1>" + 
                        "<h2>Item title: " + this.model.get('title') + "</h2></div>");
                    jsct.pubsub.trigger("setMsg", "Item doesn't meet filter criteria");
                    return this;
                }

                // get the data to be passed to template and displayed in screen fields 
                if (this.inProgressEdits) {
                    detailData = this.inProgressEdits;
                }
                else {
                    // FYI, either of the below work to get the model's data. The difference 
                    // is that model.attributes is a direct ref to the live data, while toJSON()  
                    // will return a copy of the attributes object. Best to use the latter
                    // detailData = this.model.attributes;
                    detailData = this.model.toJSON();                                       
                }

                // If user changes "starred" state in listView syncStar() updates detailView's star
                this.listenTo(this.model, 'change:tagged', this.syncStar);

                this.mode = "BROWSE/EDIT";
                jsct.pubsub.trigger("setMsg", '<strong>Browse/Edit<strong>');
            }

            // Ok, at this point we have all the data needed to render the template
            this.$el.html(this.template( {detailData: detailData} ));

            // Now that we've rendered we can fetch and cache refs to the view's child elements.
            // However, note that this view (and thus its child elements) isn't on the DOM at this point
            //* ------------------------------------------------------------------------------------------
            //* SIDEBAR: Selecting off-DOM child elements: For performance you want to build your views  
            //* before putting them on the DOM, this avoids expensive paint and reflow operations. *BUT*  
            //* be aware that jQuery by default 'sees' only on-DOM elements, so a std selector won't work.  
            //* Solution: use Backbone's selector syntax or provide jQuery search context (examples below)
            //* ------------------------------------------------------------------------------------------
            //* the Backbone shortcut selector syntax used below WILL work for selecting off-DOM elemnts
            this.$newTitle = this.$("#detailTitle"); 
            //* BUT selector below won't work b/c node isn't on DOM yet, jQuery won't "see" the element:
            //*    this.$newTitle = $("#detailTitle");     
            //* jQuery solution: you can use jQuery selectors for off-DOM elements if context is provided: 
            //*    this.$newTitle = this.$el.find("#detailTitle"); 
            //*    this.$newTitle = $("#detailTitle",this.$el);
            this.$newDescrip = this.$("#detailDescrip");
            this.$newURL = this.$("#detailURL");
            this.$newType = this.$("#detailType");
            this.$newStarTag = this.$("#detailStar");

            // Set the value for the <select> 
            this.$newType.val(detailData.type);

            // Visibility of buttons varies between AddNew mode and Browse/Edit mode
            this.setCmdButtonVisibility();

            // if re-rendering in-progress edits need to set SAVE button's visual cue
            this.highlightSaveButton(this.highlightOn);

            return this;
        },

        // Visibility of command buttons (docked to view bottom) is context-based 
        setCmdButtonVisibility: function () {

            if (this.mode === "BROWSE/EDIT") {
                this.$(".detailEdit").show();
                this.$(".detailAddNew").hide();
            }
            else {
                this.$(".detailEdit").hide();
                this.$(".detailAddNew").show();
            }

            // In dualPane layout hide ListView button since that view always visible in left pane 
            if (jsct.application.get("currentLayout") === "dualPane") {
                this.$("#listViewBtn").hide();
            }
            else {
                this.$("#listViewBtn").show();
            }
        },

        // For editing current state within the detail pane
        toggleStar: function () {
            this.$newStarTag.toggleClass("selected");
            this.highlightSaveButton();
        },

        // For keeping detail pane star sync'd with changes made to listview's <li> star
        syncStar: function (model) {
            this.$newStarTag.toggleClass("selected", model.get("tagged"));
        },

        saveEdits: function (e) {
            // Note: this save() works because the model is already in a collection, so the save 
            // process can obtain backend target info (URL or localStorage) from the collection
            this.model.save(this.getScreenValues(), {
                success: _.bind(this.saveSuccess, this),
                error: this.saveError
            });
        },
        saveSuccess: function () {
            if (jsct.showDiags) console.log("VIEW: Detail view edits were saved using Backbone's model.save()");
            jsct.pubsub.trigger("setMsg", "Edits saved");
            this.highlightSaveButton(false);
        },
        saveError: function (model, response) {
            if (jsct.showDiags) console.log("VIEW: Detail view edits save FAILED! Response was: " + response);
            jsct.pubsub.trigger("setMsg", "<span class=errorText><strong>ERROR:</strong> Edits save FAILED</span>");
        },

        addNewItem: function () {
            // This addNewItem processing uses 3 steps to add the new item to db and collection:
            //// 1. model.set() to populate the model with the new data and perform data validation  
            //// 2. model.save() to commit the data (if it passed validation) to the persistent datastore
            //// 3. collection.add() on successful db commit to add the new model to the collection
            // However, with this approach there's a gotcha -- for the save() you need to provide Backbone
            // with info on the backend datastore target. If the model was already on the collection then 
            // Backbone would get that info from the Collection (for JSCT it's in collection's localStorage
            // property). But a new model that isn't yet in the collection doesn't have access to this info. 
            // One solution is to provide the collection id in model's instantiation. Example:
            //   new jsct.DetailView({model:new jsct.CodeTrack(null,{collection:jsct.codeTrackCollection})})
            // However, to make this demo app's addNewItem process a bit clearer the collection property is
            // assigned 'manually' below. In any case, when you execute model's save() BB must be told where
            // to send the data else save() will fail with "Error: 'URL' property or function must be specified"
            // BTW, you could also put the datastore info in your model definition, but that's less flexible.
            // Also, you could add the model to collection before you execute save(), but that would put it on 
            // collection before you know that the db commit is successful, so a fail would require a rollback.
            // Finally, you could just use collection.create() here. Below is simple example (assumes success):
            // ALTERNATIVE FOR ADDING ITEM:  jsct.codeTrackCollection.create( newValues, { wait:true } ) ;

            //// 1. Put data into model. If validation fails bail out. See CodeTrack model for validation code.
            var newValues = this.getScreenValues();
            this.model.set(newValues);
            if (!this.model.isValid()) {
                return;
            }

             // Assign collection property so Backbone can get info on where to save data from the collection
            this.model.collection = jsct.codeTrackCollection;

            //// 2. Store the new model's data in the persistent datastore
            var self = this;
            this.model.save(null, {
                success: function (model) {

                    //// 3. on SUCCESS add the new model to the collection 
                    jsct.codeTrackCollection.add(model);
                    jsct.pubsub.trigger("setMsg", {
                        msgText: "New item added <span class=detailAddText>(title:" + newValues.title + ")</span>",
                        shortMsgText: "New item added"
                    });

                    if (jsct.showDiags) {
                        console.log("VIEW: Detail view 1) populated new model and saved to datastore using Backbone's model.save().") ;
                        console.log("VIEW: Detail view 2) used Backbone's collection.add() to add the new codetrack item to the collection") ;
                    }
                    // Store in appState model so list view will scroll to the new item 
                    jsct.application.set("lastBrowsedModelID", model.id);

                    // clear screen fields and (VERY IMPORTANT!) need to create a fresh codeTrack 
                    // model so they can add another (don't want to re-use the model just added).
                    // This also requires 'refreshing' the model listener for validation errors 
                    self.resetFields();
                    self.highlightSaveButton(false);
                    self.model = new jsct.CodeTrack();
                    self.listenTo(self.model, "invalid", self.showValidationError);

                },
                error: function (model, response) {
                    jsct.pubsub.trigger("setMsg",
                        "<span class=errorText><strong>ERROR:</strong> Add new item FAILED</span>");
                    alert("Add new item SAVE failed with response: " + response);
                }
            });
        },

        getScreenValues: function () {
            // ensure we've rendered before attempting to get screen values
            if (!this.$newTitle) {
                return;
            }
            // return values of screen fields using their cached jQuery refs
            return {
                title: this.$newTitle.val().trim(),
                descrip: this.$newDescrip.val().trim(),
                type: this.$newType.val(),
                url: this.$newURL.val().trim(),
                tagged: this.$newStarTag.hasClass("selected")
            };
        },

        resetFields: function () {
            this.$newTitle.val('');
            this.$newDescrip.val('');
            this.$newURL.val('');
            this.$newType.val('tip');
            this.$newStarTag.removeClass("selected");
        },

        deleteItem: function () {
            // for dev work
            if (!this.model) {
                alert('ooops, just tried to delete a non-existent this.model!');
                return;
            }

            // being lazy, just using the basic js confirm dialog
            var confirmed = window.confirm("Delete this item?") ;
            if ( !confirmed ) {
                return; 
            }
            this.model.destroy();
            jsct.application.set("lastBrowsedModelID", "");
            if (jsct.showDiags) console.log("VIEW: Detail view - item was deleted using Backbone's model.destroy()");
            // In dualPane layout the detail pane stays visible when they delete an item. Obviously  
            // we can't continue displaying that just-deleted info so replace with feedback msgtext 
            if (jsct.application.get("currentLayout") === "dualPane") {
                this.$el.html("<br/><br/><h1 class=detailMsg>Item deleted</h1>");
                return this;
            }
            else {
                // in single-pane mode when they delete we just display ListView 
                jsct.router.navigate("list", {trigger: true});
            }
            jsct.pubsub.trigger("setMsg", "Item deleted");
        },

        cancel: function () {
            jsct.router.navigate("", {trigger: true});
        },

        // Set visual cue that data has changed and a SAVE is needed
        highlightSaveButton: function (highlightOn) {
            this.highlightOn = (highlightOn === false) ? false : true;
            $(".detailSave").toggleClass("highlightButton", this.highlightOn);
        },

        // When a filter is active set a visual cue on the pane to remind them  
        setFilterHighlight: function () {
            this.$el.toggleClass('filterActiveIndicator', jsct.application.get("filterIsActive"));
        },

        // This lets user open an item's URL in a new browser page/tab
        showPage: function (e) {
            var newValues = this.getScreenValues();
            // note: minimal validation here...
            if (newValues.url === "") {
                return;
            }
            e.preventDefault();
            window.open(newValues.url, '_blank');
        },

        showValidationError: function (model, error) {
            if (jsct.showDiags) console.log("VIEW: Detail view - input data failed codeTrackItem model's validation (" + error + ")"); 
            jsct.pubsub.trigger("setMsg", "<span class=errorText><strong>Ooops,</strong> " + error + "</span>");
        },

        adjustLayout: function () {
            // When app switches between singlePane/dualPane layouts need to adapt visibility of command buttons
            this.setCmdButtonVisibility();
        },
    
        // This handles navButton clicks for prev/next item.  Note that this is complicated by honoring
        // any active filter - i.e. if filter is active user navs only to items meeting filter criteria
        navUpDown: function () {
           
            var length, 
                increment, 
                index, 
                navToModel,
                filterIsActive = jsct.application.get("filterIsActive") ,
                // -1 indicates not found
                currentItemPos = -1,      
                prevItemMeetsFilterPos = -1,
                // This handler used for both UP/DOWN navigation, so use button ID to discriminate between callers
                direction = (arguments[0].currentTarget.id)==="prevItemBtn" ? "UP" : "DOWN" ;

            // Find the item in the collection. If a data filter is active honor it, also affects search direction.
            // increment set to 1 when navigating UP (to previous item). In that case search from the START of list
            // b/c we're also searching for the prev item that satisfies filter criteria. DOWN is the opposite, it
            // starts from END of list so it can obtain the index of the next item in list meeting filter criteria.
            length = jsct.codeTrackCollection.models.length;
            increment = (direction === "UP") ? 1 : -1; 
            index = (increment > 0) ? 0 : length - 1;              
            for (; index >= 0 && index < length; index += increment) {
              if (jsct.codeTrackCollection.models[index].id===this.model.id) {
                 currentItemPos = index ; 
                 break; 
              }
              // prev/next buttons honor filter so keep track of predecessor meeting filter criteria
              if (jsct.codeTrackCollection.models[index].meetsFilterCriteria) {
                 prevItemMeetsFilterPos=index;
              }
            }

            // Loop should have found the item so now get the next/prev model and display in new detail view 
            if ( direction === "DOWN" ) {
               if ((currentItemPos === length-1 ) || (filterIsActive && prevItemMeetsFilterPos === -1 )) {
                  jsct.pubsub.trigger("setMsg","At Bottom");
                  return ;
               }
               navToModel = filterIsActive ? prevItemMeetsFilterPos : currentItemPos + 1 ;
            }
            else if ( direction === "UP" ) {
               if ((currentItemPos === 0 ) || (filterIsActive && prevItemMeetsFilterPos === -1 )) {
                  jsct.pubsub.trigger("setMsg","At Top");
                  return ;
               }
               navToModel = filterIsActive ? prevItemMeetsFilterPos : currentItemPos - 1 ;
            }
            // keep it simple, just use router to display the next/prev model in a new detail view 
            jsct.router.navigate("edit/" + jsct.codeTrackCollection.models[navToModel].id, {trigger: true});
        } 

    });
})(jQuery);