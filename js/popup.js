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
    // Popup object
    var popup = {
        current: {},
        init: function(data) {
          var self = this;
          if (!self.data) {
            self.data = data;
          }

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
          function randomInteger(min, max) {
            var rand = min + Math.random() * (max + 1 - min);
            rand = Math.floor(rand);
            return rand;
          };
          // console.log(self.data.config.pauseIntervalMin, self.data.config.pauseIntervalMax);
          var pause = randomInteger(self.data.config.pauseIntervalMin, self.data.config.pauseIntervalMax);
          console.log('Pause between videos ', pause)
          setTimeout(function() {
            self.playVideo()
          }, pause);
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
              },
              function(error) {
                console.log('Error source video loading. Trying next from the list');
                self.next();
              }
            )
        },
        getUrlFromPlaylist: function(isRandom, playlist) {
          var self = this;
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
              } while (currentNum === self.current.num);
            } else {
              currentNum = self.current.num + 1 < playlist.length ? self.current.num + 1 : 0;
            }
          } else {
            currentNum = 0;
          }
          self.current.num = currentNum;
          self.current.url = playlist[currentNum].url;
          self.current.actionLink = playlist[currentNum].actionLink;
          console.log('Now is playing video number = ', self.current.num + 1, ' by url: ', self.current.url, ' and action link = ', self.current.actionLink);
          return self.current.url;
        },
        insertPlayer: function() {
          var self = this;
          if (!self.player) {
            var videoWrapper = document.createElement('div');
            videoWrapper.style.cssText = 'display: none; position: absolute; top: 0; left: 0; width: 100%; height: 100%; margin: 0; padding: 0; background-color: black;';
            videoWrapper.id = 'video__wrapper';
            var videoInner = document.createElement('div');
            videoInner.id = 'video__inner';
            videoInner.style.width = '100%';
            videoInner.style.margin = 'auto';
            var close = document.createElement('img');
            close.src = "img/close.png";
            close.style.cssText = "position: absolute; top: 10px; right: 10px; width: 128px; height: 128px; z-index: 999; cursor: pointer;"
            close.addEventListener('click', function() {
              self.reset(self);
            });
            videoWrapper.appendChild(videoInner);
            videoWrapper.appendChild(close);
            self.player = {
              'wrapper': videoWrapper,
              'inner': videoInner,
              'close': close
            }
            document.body.appendChild(self.player.wrapper);
          }
          var video = document.createElement('video');
          video.className = 'video-js vjs-default-skin';
          video.id = 'my-video';
          self.player.video = video;
          self.player.inner.appendChild(self.player.video);
          return self.player;
        },
        reset: function(self) {
          console.log('reset');
          self.current.player.dispose();
          self.player.wrapper.style.display = 'none';
          self.current = {};
          self.init();
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
            var close = playerHtml.close;
            // console.log(playerHtml);
            player.src({
              type: response.type,
              src: URL.createObjectURL(response)
            });
            player.enterFullWindow();
            player.play();
            function playerDestroy() {
              player.dispose();
              playerHtml.wrapper.style.display = 'none';
            }
            player.on('ended', function() {
              console.log('end');
              playerDestroy()
              self.next();
            })
            player.on('click', function() {
              console.log('click');
              playerDestroy()
              window.location = self.current.actionLink;
            });
            player.on('error', function() {
              playerDestroy()
              console.log('Error loading source. Trying next from list');
              self.next();
            });
          })
          self.current.player = player;
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
