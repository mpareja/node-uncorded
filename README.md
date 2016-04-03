# uncorded - embedded distributed store for small immutable data

**Status: Experimental**

Uncorded is a use-case specific database for applications needing to add, remove and expire small immutable documents of data across a cluster of nodes. Uncorded is not a general purpose database and it assumes the size and number of active documents is extremely small.

A few uncorded characteristics:

  + intended for very small, short-lived, immutable data
  + expires data at a given point in time
  + prefers availability over cluster consistency
  + handles add/remove centric workloads where master-slave replication doesn't help

# Architecture Overview

Uncorded exposes three operations: add, remove and get. Add and remove operations need to be replicated across the cluster. Uncorded takes advantage of the remove-wins semantics of a [2P-set CRDT](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type#State-based_2P-set) (conflict-free replicated data type) to achieve strong eventual consistency -- that is, all nodes should eventually arrive at the same state regardless of replication message ordering.

## Master-Master Replication Strategy

A state-based CRDT was chosen over an operation-based CRDT so we could forego the requirement of a reliable network ensuring idempotent message delivery. The downside of a state-based CRDT is that we always replicate a node's entire state. Uncorded's small and short-lived state is a great fit here so long as we don't hold remove-set values indefinitely.

Nodes publish changes to listeners via newline delimited JSON representations of their state. Listeners apply the state changes according to the [2P-set](https://en.wikipedia.org/wiki/Conflict-free_replicated_data_type#State-based_2P-set) merge algorithm.

## Cluster Discovery

Cluster discovery is accomplished by periodically querying AWS ELBs for healthy nodes. We'll start with polling every 5 seconds and see where we go from there. Ideally, cluster discovery becomes pluggable.

## Fault Model

### Adding a document

In order to make adding a document highly-available and fast, uncorded does not wait for any nodes, let alone a quorum, to acknowledge writes. This has two major repercussions:

  + No read-after-write consistency: it is the onus of consumers to implement adequate retries to compensate for replication lag.
  + It is possible to loose a document if the node that accepted the write fails before replicating to other nodes in the cluster.

### Removing a document

In order to make document removal highly available and fast, uncorded does not wait for any nodes, let alone a quorum, to acknowledge the removal. It is possible to remove the same document twice while a previous removal is replicated across nodes. Due to the eventually consistent nature of adding a document, it is possible to try and remove a token before it has been replicated to an uncorded node. It is important for consumers to retry token consumption for at least 1 second before declaring a token invalid.

### Replicating a document addition/removal

?

# Usage

Using uncorded requires firing up the API server and creating sets for use within your application.

```
const uncorded = require('uncorded');
const server = uncorded.createServer();
const tokens = server.createSet('tokens');

// ... now start using your replicated set
const token = tokens.add({ user: 'bob' });
const found = tokens.get(token.id);
console.log(found.doc);
tokens.remove(token.id);
```

Uncorded will [search for sibling nodes](#cluster-discovery) and connect to their APIs to listen for changes.

## Configuration

**Status: experimental**

The current configuration model is based on [rc](https://www.npmjs.com/package/rc). Configure the `port` that uncorded listens on by setting the `uncorded_port` environment variable.

Uncorded uses [bunyan](https://www.npmjs.com/package/bunyan) for logging and you can configure most elements of logging via environment variables too. Change the log level by setting the `uncorded_log__level` environment variable to `info`, `warn` or `error`.

## Security Considerations

Uncorded assumes [the network is secure](https://en.wikipedia.org/wiki/Fallacies_of_distributed_computing#The_fallacies).

# API

Each uncorded node exposes an HTTP server with the following routes.

### 2P-Set State Stream

Each set maintained by an uncorded node is exposed via an HTTP endpoint. Siblings in a cluster can listen for changes to a set's state by establishing a connection and waiting for newline-delimited (CRLF) JSON objects to appear.

    GET /sets/{set_name}

#### Request

Clients are able to request the state stream for an individual set or multiple sets. Provide a comma delimited list of set names to receive changes for multiple sets:

    GET /sets/tokens,keys,foos

#### Response

Responses are JSON objects with the root keys corresponding to set names. The initial response will contain the state of all requested sets. Streaming updates will only include state for the sets that have changed.

```json
// formatted for your viewing pleasure, normally it is unformatted on one line
{
  "tokens": {
    "adds": {
      "d8b0a6fd-d0f5-4390-be87-37d8c91d62ea": {
        "id": "d8b0a6fd-d0f5-4390-be87-37d8c91d62ea",
        "doc": { "foo": "bar" }
      }
    },
    "removals": {}
  },
  "keys": {
    "adds": {},
    "removals": {}
  },
  "foos": {
    "adds": {},
    "removals": {}
  }
}
```

# What's with the name?

If you were to guess how to pronounce the CRDT abbreviation, you might land at the word "corded". Given the master-master decentralized nature of this beast, the word `uncorded` seemed to make sense.

# License

The MIT License (MIT)
Copyright (c) 2016 Mario Pareja

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
