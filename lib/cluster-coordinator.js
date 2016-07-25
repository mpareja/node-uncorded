'use strict';
module.exports = (log, connectToPeer, sets) => {
  const peers = {};

  return {
    register(hostUrl) {
      const setNames = Object.keys(sets);
      const url = hostUrl + '/sets/' + setNames.join(',');
      const peer = connectToPeer(url);
      peer.on('connect', onConnect);
      peer.on('connectionError', onConnectionError);
      peer.on('data', onData);
      peers[hostUrl] = { connection: peer, cleanup };

      log.info({ url }, 'peer registered');

      function onConnect() {
        log.info({ url: url }, 'peer connection established');
      }

      function onConnectionError(err) {
        log.warn({ err, url }, 'peer connection failure');
      }

      // ASSUMPTION: peer only sends data for the requested sets
      function onData(data) {
        Object.keys(data).forEach(key => {
          sets[key].write(data[key]);
        });
      }

      function cleanup() {
        peer.removeListener('connect', onConnect);
        peer.removeListener('connectionError', onConnectionError);
        peer.removeListener('data', onData);
      }

      /*
      I considered doing the following. As much as I like
      streams, I'm not sure we're gaining much here by using them.
      (It's not like our set-stream implementation applies backpressure.)
      We would need to be careful not to end the set-stream.

      setNames.forEach(set => {
        function transform(chunk) {
          const state = chunk[set];
          if (state) {
            this.queue(state);
          }
        }
        peer.pipe(through(transform)).pipe(sets[set]);
      });
      */
    },

    unregister(hostUrl) {
      const peer = peers[hostUrl];
      if (!peer) {
        const err = new Error('peer not found');
        err.url = hostUrl;
        throw err;
      }

      log.info({ url: hostUrl }, 'peer unregistered');

      delete peers[hostUrl];
      peer.connection.stop();
      peer.cleanup();
    }
  };
};

