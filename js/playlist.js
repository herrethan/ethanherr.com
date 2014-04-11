//YAY PLAYLIST!
function playlist(o){
  
  var o = o || {};

  soundManager.setup({
    url: 'js/',
    debugMode: false,
    preferFlash: false, // false = use 100% HTML5 mode where available
    onready: function() {
      getTracks(function(xml){
        soundManager.xml = xml;
        soundManager.playAll = false;
        makeGenres(xml);
        makeTagSearch();
        //makePlaylist('genre','score');
        //makePlaylist('tags',['cool','lame','dwarf-like']);
      })

      //options
      o.dropdown = $(o.dropdown) || $('#genre');
      o.search = $(o.search) || $('#tags');
      o.searchbutt = $(o.searchbutt) || $('button[name="search"]');
      o.playall = $(o.playall) || $('#playall');
      o.tracks = $(o.tracks) || $('.tracks');


    },
    ontimeout: function() {
      //console.log('could not load soundmanager. try harder.')
    }
  })


function getTracks(callback){
	$.ajax({
		type: 'GET',
		url: 'tracks.xml',
		datatype: 'xml',
		async: true,
    error: function(){ },
    success: function(data){ callback(data) }
	})
}

function makeGenres(xml){//fill options with genres that exist in xml
  var genres = [],
      genre, 
      hash = window.location.hash.replace('#','');
  $(xml).find('genre').each(function(){
    genre = $(this).text()
    if (genres.indexOf(genre) == -1){
      genres.push(genre)
      o.dropdown.append('<option>'+genre+'</option>')
    }
  })
  
  if (hash.length > 1 && genres.indexOf(hash) > -1){
    o.dropdown.val(hash)
  } 

  //bind change to genre dropdown and make a playlist!
  o.dropdown.change(function(e){
    var g = $(this).val()
    makePlaylist('genre', g)
    window.location.hash = '#'+g;
    e.preventDefault();
  }).change();

  //bind click to playall button
  o.playall.click(function(){
    if ($(this).hasClass('off')) { $(this).removeClass('off').addClass('on') }
    else { $(this).removeClass('on').addClass('off') }
    soundManager.playAll = soundManager.playAll? false : true;
  })

  if(o.playall.hasClass('on')) soundManager.playAll = true;

}

function makeTagSearch(){//tag search box submit behavior
  
  //bind click to search button
  o.searchbutt.click(function(){
    var tags = o.search.val();
    if (tags.length > 1) makePlaylist('tags', cleanText(tags));
  })

  //bind return key to search input
  o.search.keyup(function(e){
    var key = e.keyCode || e.keyWhich;
    if( key == 13 && $(this).val().length > 1 ){
      makePlaylist('tags', cleanText($(this).val()));
    }
  })
}


function makePlaylist(type, filter){
  o.tracks.html(''); //clear out any existing playlist and sound objects
  for (s=soundManager.soundIDs.length;s>0;s--) {
	  soundManager.destroySound(soundManager.soundIDs[0]);
  }

  //check the type of filter we are using to get tracks
  switch(type){
    case 'tags' : var anyresults = false;
                  var tags=[];
				  var x = 0;
                  $(soundManager.xml).find('tags')
                  .filter(function(){ 
				    
                    for(f in filter){
						var matches = false;
                      if ($(this).text().indexOf(filter[f]) > -1){ 
                        anyresults = true;
						matches = true;
						console.log(filter, x)
						tags[x] = tags[x] || $(this).text();
                        tags[x] = String(tags[x]).replace(
                          new RegExp(filter[f], 'gi'), 
                          '<span>$&</span>');                   
					  }
					  if (matches && f == filter.length-1) {
						  x++;
						  return true;
					  }
                    }
                    return false;
                  })
                  .parent('track')
                  .each(function(i){
                    var t = $(this);
                    var html = makeHTML(t.find('title').text(), t.find('description').text(), tags[i]);
                    $(html).appendTo(o.tracks);
                    makeBehavior(i, t.find('url').text());
                  })
                  if(!anyresults){
                    o.tracks.append('<div class="no-results">'+
                                      '<h4>Sorry no results have been found</h4>'+
                                      '<p>Please try some different search terms or select a genre.</p>'+
                                    '</div>')
                  }
    break;
    case 'genre' : $(soundManager.xml).find('genre')
                  .filter(function(){ return $(this).text() == filter })
                  .parent('track')
                  .each(function(i){
                    var t = $(this);
                    var html = makeHTML(t.find('title').text(), t.find('description').text(), t.find('tags').text());
                    $(html).appendTo(o.tracks);
                    makeBehavior(i, t.find('url').text());     
                  })
    break;
    default : console.log('no filter, show all?');
  }


  function makeHTML(title, desc, tags){
    return '<div class="track">'+
              '<h4>'+title+'</h4>'+
              '<button class="stopped" title="play"><div class="carrot"></div></button>'+
              '<div class="progress-hit">'+
                '<div class="progress-wrap">'+
                  '<div class="progress"></div>'+
                '</div>'+
              '</div>'+
              '<div class="counter">0:00</div>'+
              '<p class="desc">'+desc+'</p>'+
              '<p class="tags">TAGS: '+tags+'</p>'
            '</div>'
  }

  function makeBehavior(i, url){
    var id = 's'+i;
    var track = $('.track').eq(i)
    var butt = track.find('button')
    var counter = track.find('.counter')
    var proghit = track.find('.progress-hit')
    var progbar = track.find('.progress')
    var progwidth = track.find('.progress-wrap').width()

    //create the sound object
    var sound = soundManager.createSound({
          id: id,
          url: url,
          onplay: function(){ 
            butt.data('played',true)
            butt.removeClass().addClass('playing');
          },
          onresume: function(){
            butt.removeClass().addClass('playing');
          },
          onstop: function(){
            butt.removeClass().addClass('stopped');
            counter.html(formatTime(0))
            progbar.css('width',0)
          },
          onpause: function(){
            butt.removeClass().addClass('paused');
          },
          whileplaying: function(){ //update timecode and progress bar
            counter.html(formatTime(this.position));
            progbar.css('width', this.position/this.duration * 100 + '%');
          },
          onfinish: function(){
            butt.removeClass('playing').addClass('stopped');
            counter.html(formatTime(0))
            progbar.css('width',0)
            if(soundManager.playAll){
              var nextid = 's'+ (i+1)
              if(soundManager.soundIDs.indexOf(nextid) > -1){
                var eh = soundManager.getSoundById(nextid).play();
                //ug sorry for this
                //$('.track').eq(i).find('button[title="play"]').addClass('playing')
              }

            }
          }
          });

    //bind clicks
    butt.click(function(){
      if(butt.hasClass('stopped')){
        soundManager.stopAll();
        sound.play();
      } else if (butt.hasClass('paused')){
        sound.resume();
      }
        else if (butt.hasClass('playing')){
        sound.pause();
      }
    })

    //bind touch events - make progress bar scrubbable
    proghit.on('touchstart mousedown', function(e){
      
        proghit.data({
          'pressed': true,
          'left': $(e.target).offset().left,
          'speed': progbar.css('transition-duration')
        })
        progbar.css({
          '-moz-transition-duration':'0s',
          '-webkit-transition-duration':'0s',
          'transition-duration':'0s'
        })
        if(butt.data('played')){
          progbar.css('width', e.pageX - proghit.data('left'))
        }
      })
      .on('touchmove mousemove', function(e){
        if(proghit.data('pressed') && butt.data('played')){
          sound.pause();
          progbar.css('width', e.pageX - proghit.data('left') )
        } 
      })
      .on('touchend mouseup', function(e){
        if(proghit.data('pressed') ){
          sound.setPosition(sound.duration / (progwidth/(e.pageX - proghit.data('left')) ) );
        }
        progbar.css({
          '-moz-transition-duration': progbar.data('speed'),
          '-webkit-transition-duration': progbar.data('speed'),
          'transition-duration': progbar.data('speed')
        })
        proghit.data('pressed', false)
      })
  }

}

}//end playlist()



// UTILITIES
//format time to 00:00
function formatTime(m){
    var secs = Math.floor((m / 1000) % 60);
    var mins = Math.floor((m / (60 * 1000)) % 60);
    secs = secs < 10? '0'+secs : secs;
    return mins + ":" + secs;
};

//get rid of all extraneous white space and punctuation
function cleanText(tags){
  tags = tags.replace(/\W/g, ' ').toLowerCase().replace(/\s+/g, ' ').split(' ');
  return tags;
}
