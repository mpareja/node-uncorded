'use strict';
module.exports = (log, connectToPeer, sets) => {
  const setNames = Object.keys(sets);

  return {
    register(hostUrl) {
      const url = hostUrl + '/sets/' + setNames.join(',');
      const peer = connectToPeer(url);
      peer.on('connect', () => {
        log.info({ url: url }, 'peer connection established');
      });
      peer.on('connectionError', err => {
        log.warn({ err, url }, 'peer connection failure');
      });

      // ASSUMPTION: peer only sends data for the requested sets
      peer.on('data', data => {
        Object.keys(data).forEach(key => {
          sets[key].write(data[key]);
        });
      });

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
    }
  };
};

