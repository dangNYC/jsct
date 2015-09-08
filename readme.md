## JavaScript Code Tracker: a Backbone demo app

> JavaScript Code Tracker (JSCT) is a simple web application that demos some basics of JavaScript Single Page Applications (SPAs) and Backbone, a JavaScript MV* lib.


### Overview of JavaScript Code Tracker (JSCT) 

JSCT is a vehicle for exploring Backbone and demonstrating its features.  It lets you see a simple Backbone application in action while also providing commented source code along with a companion doc that describes the application architecture.  It's targeted at intermediate JavaScript developers new to Backbone.  

##### Aspects of SPAs demonstrated include:
* browser-based application driven by the client, not the server — single page load
* common JS coding practices such as use of an application namespace and minimal use of global namespace, closures for privacy, use of templates, use of "use strict", etc.
* responsive design to handle browser resize and mobile browsers (incl. orientation change)
* save/restore of application state (very basic, localStorage is used)

##### Aspects of SPAs demonstrated include:
* separation of Model and View layers via Backbone classes Model, View, Collection
* loose coupling through Backbone events (including use for simple pub/sub)
* CRUD through Backbone methods create, fetch, save, destroy, etc.
* application navigation/bookmarking through Backbone Router and History classes


### JSCT documentation

The [JSCT Overview page](http://www.dlgsoftware.com/primers/JSCT_SPA_Backbone_demo_app.php) describes Backbone concepts and programming techniques and (its main purpose) it points you to implementations of these within JSCT.
 
> ==> _[Run the JSCT demo app](http://www.dlgsoftware.com/jsdemoapps/jsct/)_