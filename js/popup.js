  (function() {
    // AJAX loader with Promise wrapper
    function httpGet(url, responseType) {
      return new Promise(function(resolve, reject) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        if (responseType) {
          xhr.responseType = responseType;
        }
        xhr.onload = function() {
          if (this.status == 200) {
            resolve(this.response);
          } else {
            var error = new Error(this.statusText);
            error.code = this.status;
            reject(error);
          }
        };
        xhr.onerror = function() {
          reject(new Error("Network Error"));
        };
        xhr.send();
      });
    }
    // Timer with Promise wrapper
    function delay(interval) {

    }
    // Popup object
    var popup = {
        init: function(data) {
          var self = this;
          self.data = data;

          function getData() {
            return Date.now();
          }

          function resetTimer() {
            initialTime = getData();
          }
          document.addEventListener('mousemove', resetTimer);
          var initialTime = getData();
          var maxDelay = self.data.config.delayInterval;
          var timer = setInterval(timerIncrease, 1000);
          var currentTime;

          function timerIncrease() {
            currentTime = getData() - initialTime;
            console.log((currentTime / maxDelay * 100).toFixed(0) + '% of total delay before popup shows');
            if (currentTime >= maxDelay) {
              initialTime = getData();
              clearInterval(timer);
              document.removeEventListener('mousemove', resetTimer);
              self.playVideo();
            }
          }
        },
        next: function() {
          var self = this;
          console.log('Pause between videos ', self.data.config.pauseInterval)
          setTimeout(function() {
            self.playVideo()
          }, self.data.config.pauseInterval);
        },
        playVideo: function() {
          var self = this;
          var currentUrl = self.getUrlFromPlaylist(self.data.config.isRandom, self.data.playlist);
          httpGet(currentUrl, 'blob')
            .then(
              function(response) {
                // console.log(response);
                var playerHtml = self.insertPlayer();
                playerHtml.wrapper.style.display = 'flex';
                self.videoInit(response, playerHtml, self);
              }
            )
        },
        getUrlFromPlaylist: function(isRandom, playlist) {
          function randomInteger(min, max) {
            var rand = min + Math.random() * (max + 1 - min);
            rand = Math.floor(rand);
            return rand;
          }
          var currentNum;
          var currentUrl;
          if (playlist.length > 1) {
            if (isRandom) {
              do {
                currentNum = randomInteger(0, playlist.length - 1);
              } while (currentNum === self.currentNum);
            } else {
              currentNum = self.currentNum + 1 < playlist.length ? self.currentNum + 1 : 0;
            }
          } else {
            currentNum = 0;
          }
          self.currentNum = currentNum;
          self.currentUrl = playlist[currentNum];
          console.log('Now is playing video number = ', self.currentNum + 1, ' by url: ', self.currentUrl);
          return self.currentUrl;
        },
        insertPlayer: function() {
          if (!self.player) {
            var videoWrapper = document.createElement('div');
            videoWrapper.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; margin: 0; padding: 0; background-color: black;';
            videoWrapper.id = 'video__wrapper';
            var videoInner = document.createElement('div');
            videoInner.id = 'video__inner';
            videoInner.style.width = '100%';
            videoInner.style.margin = 'auto';
            videoWrapper.appendChild(videoInner);
            self.player = {
              'wrapper': videoWrapper,
              'inner': videoInner
            }
          }
          var video = document.createElement('video');
          video.className = 'video-js vjs-default-skin';
          video.id = 'my-video';
          self.player.video = video;
          self.player.inner.appendChild(self.player.video);
          document.body.appendChild(self.player.wrapper);
          return self.player;
        },
        videoInit: function(response, playerHtml, self) {
          var player = videojs('my-video', {
            // "width": 600,
            // "height": 300,
            "controls": false,
            "autoplay": false,
            "preload": "auto",
            "fluid": true
          }, function() {
            player.src({
              type: response.type,
              src: URL.createObjectURL(response)
            });
            player.enterFullWindow();
            player.play();
            player.on('ended', function() {
              console.log('end');
              player.dispose();
              playerHtml.wrapper.style.display = 'none';
              self.next();
            })
            player.on('click', function() {
              console.log('click');
              player.dispose();
              playerHtml.wrapper.style.display = 'none';
              window.location = self.data.config.actionLink;
            })
          })

        }
      }
      // Chained calls for config and playlist JSON
    var config = {};
    var playlist = [];
    httpGet('json/popup.config.json')
      .then(
        function(response) {
          config = JSON.parse(response);
          console.log(config);
          return httpGet(config.playlistUrl);
        },
        function(error) {
          console.log('Error loading popup config');
          throw error;
        }
      )
      .then(
        function(response) {
          playlist = JSON.parse(response);
          console.log(playlist);
          if (playlist.length) {
            return {
              "config": config,
              "playlist": playlist
            };
          } else {
            throw 'Error: Playlist is empty!';
          }
        },
        function(error) {
          console.log('Error loading popup playlist');
          throw error;
        }
      )
      .then(
        function(data) {
          console.log('Initializing the popup', data);
          popup.init(data);
        }
      )
      .catch(
        function(error) {
          console.log(error);
        }
      )


  })()
