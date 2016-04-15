// import { Session } from 'meteor/session';

Websites = new Mongo.Collection("websites");

if (Meteor.isClient) {
	Router.configure({
		layoutTemplate: 'ApplicationLayout'
	});

	Router.route('/', function() {
		this.render('navbar', {
			to: "navbar"
		});
		this.render('websites', {
			to: "main"
		});
	});

	Router.route('/:_id', function() {
		this.render('navbar', {
			to: "navbar"
		});
		this.render('single_website', {
			to: "main",
			data: function() {
				var site = Websites.findOne({_id: this.params._id});
				if (site) {
					site.details = true;
					return site;
				} else {
					return null;
				}
			}
		});
	});

	/// infinite scroll

	// siteLimit for the listing page
	Session.set("siteLimit", 5);
	lastScrollTop = 0;
	$(window).scroll(function(event) {
		// if we are near bottom of the window
		if ($(window).scrollTop() + $(window).height() > $(document).height() - 100) {
			// current position
			var scrollTop = $(this).scrollTop();
			// if we are scrolling down
			if (scrollTop > lastScrollTop) {
				// load more websites 
				Session.set("siteLimit", Session.get("siteLimit") + 4);
			}

			lastScrollTop = scrollTop;
		}
	})

	// comment limit for the details page
	Session.set("commentLimit", 10);



	Accounts.ui.config({
		passwordSignupFields: "USERNAME_AND_EMAIL"
	})

	/////
	// template helpers 
	/////

	// helper function that returns all available websites
	Template.website_list.helpers({
		websites:function(){
			return Websites.find({}, {sort: {upvotes: -1}, limit: Session.get("siteLimit")});
		}
	});


	/////
	// template events 
	/////

	Template.website_item.events({
		"click .js-upvote":function(event){
			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			console.log("Up voting website with id "+website_id);
			// put the code in here to add a vote to a website!
			Websites.update({_id: website_id}, 
			          {$inc: {upvotes: 1}});
			return false;// prevent the button from reloading the page
		}, 
		"click .js-downvote":function(event){

			// example of how you can access the id for the website in the database
			// (this is the data context for the template)
			var website_id = this._id;
			console.log("Down voting website with id "+website_id);

			// put the code in here to remove a vote from a website!
			Websites.update({_id: website_id}, 
			          {$inc: {downvotes: -1}});
			return false;// prevent the button from reloading the page
		},
		"click .js-del-website":function(event) {
			if (!confirm('Delete this website.')) {
				return;
			}
			var website_id = this._id;
			console.log(website_id);
			$("#"+website_id).hide('slow', function() {
				Websites.remove({_id: website_id});
			});
		}
	})

	Template.website_form.events({
		"click .js-toggle-website-form":function(event){
			$("#website_form").toggle('slow');
		}, 
		"submit .js-save-website-form":function(event){

			// here is an example of how to get the url out of the form:
			var url = event.target.url.value;
			if (url.indexOf("http://") != 0) {
				url = "http://" + url;
			}
			console.log("The url they entered is: "+url);
			
			//  put your website saving code in here!	
			var title = event.target.title.value;
			var description = event.target.description.value;
			Meteor.call('insertWebsite', url, title, description, function(err, result) {
				if (!err) {
					// Decode escaped symbols
					var elem = document.createElement('textarea');
					elem.innerHTML = result.title;
					result.title = elem.value;
					elem.innerHTML = result.description;
					result.description = elem.value;
					Websites.insert(result);
				} else {
					console.log(err);
					event.target.url.value = "Please check the URL.";
				}
			});

			return false;// stop the form submit from reloading the page

		}
	});

	Template.comment_form.events({
		"submit .js-comment-form": function(event) {
			var user;
			if (Meteor.user()) {
				user = Meteor.user().username;
			} else {
				user = "anonymous";
			}
			var comment = {
				author: user,
				comment: event.target.comment.value,
				createdOn: new Date()
			}
			var website_id = this._id;
			// console.log(user);
			// console.log(this);
			// console.log(this._id);
			Websites.update({_id: website_id}, {$push: {comments: comment}});
			return false; // stop the form submit from reloading the page
		}
	})
}


if (Meteor.isServer) {
	// HTTP.get("http://coursera.org", {}, function(error, response) {
	// 	var content = response.content;
	// 	var start;
	// 	var end;
	// 	var metaDesc = 'meta name="description"';
	// 	var index = content.indexOf(metaDesc);
	// 	var left = content.lastIndexOf('<', index);
	// 	start = content.indexOf('content="', left) + 'content="'.length;
	// 	end = content.indexOf('"', start);
	// 	console.log(content.substring(start, end));

	// 	start = content.indexOf('<title>') + '<title>'.length;
	// 	end = content.indexOf('</title>');
	// 	console.log(content.substring(start, end));
	// });
	// start up function that creates entries in the Websites databases.
  Meteor.startup(function () {
  	// define Meteor server functions
  	Meteor.methods({
  		insertWebsite: function(url, title, description) {
  			try {
  				var response = HTTP.get(url, {});
				var content = response.content.toLowerCase();
  				var start;
  				var end;
  				if (!title) {
	  				start = content.indexOf('<title>') + '<title>'.length;
					end = content.indexOf('</title>');
					title = content.substring(start, end);
	  			}
	  			if (!description) {
					var metaDesc = 'name="description"';
					var index = content.indexOf(metaDesc);
					console.log(index);
					var left = content.lastIndexOf('<', index);
					if (index < 0) {
						description = title;
					} else {
						start = content.indexOf('content="', left) + 'content="'.length;
						end = content.indexOf('"', start);
						description = content.substring(start, end);
					}
	  			}
				// Websites.insert({
				// 	url: url,
				// 	title: title,
				// 	description: description,
				// 	createdOn: new Date()
				// });
				var result = {
					url: url,
					title: title,
					description: description,
					createdOn: new Date()
				};
				console.log(result);
				return result;
  			} catch(err) {
  				throw new Meteor.Error(404, 'Incomplete or incorrect url.');
  			}
			
  		}
  	})
    // code to run on server at startup
    if (!Websites.findOne()){
    	console.log("No websites yet. Creating starter data.");
    	  Websites.insert({
    		title:"Goldsmiths Computing Department", 
    		url:"http://www.gold.ac.uk/computing/", 
    		description:"This is where this course was developed.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"University of London", 
    		url:"http://www.londoninternational.ac.uk/courses/undergraduate/goldsmiths/bsc-creative-computing-bsc-diploma-work-entry-route", 
    		description:"University of London International Programme.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"Coursera", 
    		url:"http://www.coursera.org", 
    		description:"Universal access to the world’s best education.", 
    		createdOn:new Date()
    	});
    	Websites.insert({
    		title:"Google", 
    		url:"http://www.google.com", 
    		description:"Popular search engine.", 
    		createdOn:new Date()
    	});
    	Websites.insert({
    		title:"Goldsmiths Computing Department", 
    		url:"http://www.gold.ac.uk/computing/", 
    		description:"This is where this course was developed.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"University of London", 
    		url:"http://www.londoninternational.ac.uk/courses/undergraduate/goldsmiths/bsc-creative-computing-bsc-diploma-work-entry-route", 
    		description:"University of London International Programme.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"Coursera", 
    		url:"http://www.coursera.org", 
    		description:"Universal access to the world’s best education.", 
    		createdOn:new Date()
    	});
    	Websites.insert({
    		title:"Google", 
    		url:"http://www.google.com", 
    		description:"Popular search engine.", 
    		createdOn:new Date()
    	});
    	Websites.insert({
    		title:"Goldsmiths Computing Department", 
    		url:"http://www.gold.ac.uk/computing/", 
    		description:"This is where this course was developed.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"University of London", 
    		url:"http://www.londoninternational.ac.uk/courses/undergraduate/goldsmiths/bsc-creative-computing-bsc-diploma-work-entry-route", 
    		description:"University of London International Programme.", 
    		createdOn:new Date()
    	});
    	 Websites.insert({
    		title:"Coursera", 
    		url:"http://www.coursera.org", 
    		description:"Universal access to the world’s best education.", 
    		createdOn:new Date()
    	});
    	Websites.insert({
    		title:"Google", 
    		url:"http://www.google.com", 
    		description:"Popular search engine.", 
    		createdOn:new Date()
    	});
    }
  });
}
