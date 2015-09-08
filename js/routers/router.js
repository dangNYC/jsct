 // -----------------------------------------------------------------------------
 //
 //  Router - translates changes to the URL hashpart into an application state
 //
 //  Routers basically translate URLs into an application state -- that is, 
 //  they map URLs into methods to run and the method does the job of putting
 //  your application into a primary state. It can do this directly by creating
 //  views, manipulating DOM, etc. (that's what JSCT does to keep things simple)
 //  or indirectly by delegating state change processing to another module like 
 //  an application controller. 
 //
 //  JSCT uses the URL's hashpart for its route maps but note that Backbone 
 //  also supports pushstate/popstate.  Also note that the URL changes we're 
 //  talking about here do not trigger a page load -- all the work of changing
 //  to a new application state (e.g., displaying a different primary view) is 
 //  done via JavaScript on the client 
 // 
 //  Routes generally drive an application's top-level navigation, or primary
 //  states -- those the user would likely want to bookmark or share via URL 
 //  (e.g., the online help, detail view for an individual item, etc.)
 // 
 //  Letting users navigate to a primary state via a URL allows navigation
 //  via browser's Back/Forward buttons as well as bookmarking and sharing
 //  an application state with others via that URL. 
 //
 //  JSCT does its instantiations of all top-level views here with one exception:
 //  Summary view may be instantiated in the app controller at app init when using
 //  dualPane layout (in dualPane layout that list view always fills the left pane)
 //
 //  IMPORTANT!: this router directly sets the application state in order to make 
 //  the logic easier to follow (i.e. it creates views, removes views, manipulates
 //  the DOM, etc.). However, it's generally better to delegate that work to another  
 //  module and keep the router focused on its role of URL change handler/router. 
 //  For more on this see the JSCT Overview doc section "Router's role"  
 //
 // ------------------------------------------------------------------------------
 /*global Backbone */

 (function ($) {

     'use strict';
 
     var logCSS = " color:green";

     jsct.Router = Backbone.Router.extend({

         // Routes are a mapping of URL or hashpart to a method to execute
         routes: {
             "": "home",
             "list": "home",
             "edit/:id": "browseEdit",
             "new": "addNew",
             "help": "showHelp",
             "options": "globalOptions",
             "delete_all": "whackData", //<= for dev, no UI for this, must enter hashpart 'manually'
             "*other": "home"
         },

         initialize: function () {
             // Some applications use router's initialize() to init the app and even use a router as
             // application controller (aka 'god router'). That's probably too much functionality for
             // a router, it isn't really a router's job.  This app's uses an appController for its  
             // init tasks. However, this router still does too much work -- its replacePrimaryView()
             // really belongs in the controller but is put here to make the logic easier to follow.
         },

         //////////////////////
         //  ROUTE HANDLERS  //
         //////////////////////
         showHelp: function () {
             if (jsct.showDiags) console.log("%cROUTER: EXECUTING ROUTE METHOD: help()",logCSS);
             jsct.application.set("currentState", "help");
             this.replacePrimaryView(new jsct.HelpView());
         },

         addNew: function () {
             if (jsct.showDiags) console.log("%cROUTER: EXECUTING ROUTE METHOD: addNew()",logCSS);
             jsct.application.set("currentState", "add");
             // new item, no existing data, so pass in a new model instance w/defaults
             this.replacePrimaryView(new jsct.DetailView( {model: new jsct.CodeTrack()} ));
         },

         browseEdit: function (modelID) {
             if (jsct.showDiags) console.log("%cROUTER: EXECUTING ROUTE METHOD: browseEdit() w/parm value:" + modelID,logCSS);
             jsct.application.set("currentState", "browseEdit");
             // this route is accessing existing data so fetch it 
             var editModel = jsct.codeTrackCollection.get(modelID);
             // Important: URL may contain invalid model ID (e.g. a model that's been deleted). 
             // In that case editModel value will be undefined. Handling of this is done by the  
             // view: if passed an undefined model it uses the invalidID in its error message.
             this.replacePrimaryView(new jsct.DetailView({
                 model: editModel,
                 invalidID: modelID
             }));
         },

         globalOptions: function () {
             if (jsct.showDiags) console.log("%cROUTER: EXECUTING ROUTE METHOD: globalOptions()",logCSS);
             jsct.application.set("currentState", "globalOptions");
             this.replacePrimaryView(new jsct.GlobalOptions());
         },

         // App home always displays the Summary view (the scrollable list and its footer). 
         // Summary view handling is different from other primary views, it's created once
         // and then reused, never removed()'d.  Also: it can be displayed in #primaryPane
         // like the other primary views but it can also be reparented to #secondaryPane.
         home: function () {

             if (jsct.showDiags) console.log("%cROUTER: EXECUTING ROUTE METHOD: home()",logCSS);
             var currentLayout = jsct.application.get("currentLayout");

             // For new users the start screen is Help - essentially this does redirect from
             // default list view to display Help view. Using navigate updates the hashpart.
             if (jsct.firstUse) {
                 this.navigate("#help", {trigger: true} );
                 return;
             }

             // If there's no existing instance of Summary view we need to do the one-time    
             // creation and render.  After that the Summary instance is just reparented.
             // Note: Summary view can also be instantiated by appController at app init.
             if (!jsct.summary) {
                 jsct.summary = new jsct.SummaryView();
                 jsct.summary.render();
             }

             jsct.application.set("currentState", "list");

             if (currentLayout === "singlePane") {
                 this.replacePrimaryView(jsct.summary);
             }
             else {
                 // In dualPane layout the list-based view (SummaryView) is always parented to left/secondary pane
                 $("#secondaryPane").append(jsct.summary.$el);
                 // When the list-based Summary view is in left pane we need some view in right pane so show Help
                 this.navigate("#help", {trigger: true} );
             }
         },
         
         whackData: function() { 
             // FOR DEV -- helps you quickly restore the original sample db (JSCT loads the sample db
             // when it finds JSCT localStorage has 0 items). Avoids having to delete items individually, 
             // esp. useful on mobile where you don't have devtools to easily clear out localstorage items. 
             // Why not use _.each here, which was my original thought for this task? Answer is in this SO:
             // stackoverflow.com/questions/10858935/cleanest-way-to-destroy-every-model-in-a-collection-in-backbone
             // And no, you can't just use collection.reset(), that just clears your collection w/o updating db.
             _.invoke(jsct.codeTrackCollection.toArray(), 'destroy');
             alert("Collection and localstorage items cleared. Load JSCT w/o hashpart to restore sample db.");
          } ,


         // -----------------------------------------------------------------------------------------------
         // Below puts a top-level view into #primaryPane. Very importantly, it runs remove() on any view 
         // already in primaryPane. Goal is to remove all refs to the view so it can be garbage collected.  
         // This is critical to avoiding memory leaks. This implementation is very simple, and it doesn't
         // demo cleanup of child views which is often needed when nesting views.  For more info on this  
         // see the JSCT Overview post's section "View removal and zombies"
         // BTW, am putting this here to make things easier to follow but really it belongs in appController 
         replacePrimaryView: function (newPrimaryView) {

             // Handle existing primaryPane contents: if there's a view in the pane then run BB remove()   
             // on it before replacing it. If view is written correctly (e.g. uses BB listenTo() instead    
             // of jQuery on()) then remove() helps set it up for garbage collection, avoiding memory leaks 
             if (this.currentPrimaryView) {
                 if (this.currentPrimaryView !== jsct.summary) {
                     if (jsct.showDiags) console.log("%cROUTER: running remove() on previous primary view",logCSS);
                     this.currentPrimaryView.remove();
                 }
                 else if (jsct.application.get("currentLayout") === "singlePane") {
                     // Because Summary view and child views are instantiated once and then reused don't 
                     // want to use remove(). Detach takes DOM node off DOM w/o removing data/listeners.
                     // Note: in singlePane layout the detached Summary view shows up in Chrome devtools 
                     // Profiler as a Detached DOM Tree, that's expected, doesn't indicate a memory leak 
                     if (jsct.showDiags) console.log("%cROUTER: running detach() to take Summary view off DOM",logCSS);
                     jsct.summary.$el.detach();
                 }
             }

             // always store reference to the new view to allow later remove()
             this.currentPrimaryView = newPrimaryView;

             if (jsct.showDiags) console.log(
                 "%cROUTER: injecting into #primaryPane the primary view for application state: " 
                    + jsct.application.get("currentState"),logCSS);

             if (newPrimaryView !== jsct.summary) {
                 // fill primaryPane with HTML stored in the view's el after view render()
                 $("#primaryPane").html(newPrimaryView.render().el);
             }
             else {
                 // Here too Summary view gets special handling since it's never removed, just cached off-DOM. 
                 // That means no render needed, just put it back on DOM with parent the primary (left) pane. 
                 $("#primaryPane").append(jsct.summary.$el);
                 // Fire event when adding to DOM. Triggers scrolling list view to the <li> for "active" model
                 jsct.pubsub.trigger("summaryAdded");
             }
         }
     });

 })(jQuery);
