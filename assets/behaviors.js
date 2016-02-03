(function ( window, document, undefined ) {
	var map

	// smallest possible ajax get https://gist.github.com/segdeha/5601610/
	function g(u,c){with(new XMLHttpRequest){open('GET',u);onreadystatechange=function(){3<readyState&&c(this)};send()}}

	// simple templates https://gist.github.com/segdeha/b73384e01c48c002c1bd
	function Template(str) {
		this.rgx = /{{([^{}]*)}}/g
		this.str = str || ''
	}

	Template.prototype.evaluate = function (vals) {
		vals = vals || {}
		function repr(str, match) {
			return 'string' === typeof vals[match] || 'number' === typeof vals[match] ? vals[match] : str
		}
		return this.str.replace(this.rgx, repr)
	}

	var tmpls = {
		date : new Template( '{{month}} {{date}}, {{year}}, {{hour}}:{{minute}}{{ampm}}' ),
		info : new Template( '<div class="map-info-title">{{title}}</div><div class="map-info-addr">{{addr}}</div><div class="map-info-time">{{start}} to {{end}}</div>' )
	}

	function fetchIcs( u ) {
		g( u, handleResponse )
	}

	function handleResponse( xhr ) {
		var response = xhr.responseText
		parseIcs( response )
	}

	function parseIcs( ics ) {
		var jcal = ICAL.parse( ics )
		var comp = new ICAL.Component( jcal )
		comp.jCal[ 2 ] && geocodeLocations( comp.jCal[ 2 ] )
	}

	function geocodeLocations( events ) {
		var u = 'https://maps.googleapis.com/maps/api/geocode/json?key=AIzaSyBmwsLlHbyJwL0nZtpW28mBcuUUHnVzhrI&address='
		var promises = []
		events.forEach(function ( event ) {
			var addr = event[ 1 ][  7 ][ 3 ]
			promises.push(new Promise(function ( resolve, reject ) {
				g( u + encodeURIComponent( addr ), function ( xhr ) {
					var json = JSON.parse( xhr.responseText )
					event.addr = addr
					event.location = {
						lat : json.results[ 0 ].geometry.location.lat,
						lng : json.results[ 0 ].geometry.location.lng
					}
					resolve( event )
				})
			}))
		})
		Promise
			.all( promises )
			.then(function ( values ) {
				displayEvents( values )
			})
	}

	function displayEvents( events ) {
		events.forEach(function ( event ) {
			var data = {
				start    : formatDate( new Date( event[ 1 ][  0 ][ 3 ] ) ),
				end      : formatDate( new Date( event[ 1 ][  1 ][ 3 ] ) ),
				addr     : event[ 1 ][  7 ][ 3 ],
				title    : event[ 1 ][ 10 ][ 3 ],
				location : event.location
			}
			createMarker( data )
		})
	}

	// TODO fix the display of 12am
	function formatDate( dateObj ) {
		var hours24 = dateObj.getHours()
		var minutes = dateObj.getMinutes()
		var months = [ 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec' ]
		var month  = months[ dateObj.getMonth() ]
		var date   = dateObj.getDate()
		var year   = dateObj.getFullYear()
		var hour   = hours24 > 12 ? hours24 - 12 : hours24
		var minute = minutes < 10 ? '0' + minutes : minutes
		var ampm   = hours24 < 12 ? 'am' : 'pm'
		return tmpls.date.evaluate({
			month : month,
			date : date,
			year : year,
			hour : hour,
			minute : minute,
			ampm : ampm
		})
	}

	function createMarker( data ) {
		var infowindow = new google.maps.InfoWindow({
			content : tmpls.info.evaluate( data )
		})

		var marker = new google.maps.Marker({
			position : data.location,
			map : map,
			title : data.title
		})

		marker.addListener( 'click', function () {
			infowindow.open( map, marker )
		})
	}

	function init() {
		map = new google.maps.Map(document.getElementById( 'map' ), {
			zoom: 14,
			center: { lat: 45.523452, lng: -122.676207 }
		})

		document.querySelector( '.close-modal' ).addEventListener( 'click', function ( evt ) {
			var url = document.querySelector( 'input[name=url]' ).value
			this.parentNode.parentNode.classList.add( 'hide' )
			fetchIcs( url )
			evt.preventDefault()
		})
	}

	document.addEventListener( 'DOMContentLoaded', init )
}).call( this, this, this.document )
