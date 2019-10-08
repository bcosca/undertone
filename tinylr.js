var tinylr = require('tiny-lr');

// Standard LiveReload port
var port = 35729;

tinylr().listen(port, function() {
  console.log('... Listening on %s ...', port);
})
