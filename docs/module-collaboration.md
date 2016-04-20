# Module Collaboration

### tolerant-json-stream

  + knows the endpoint URL
  + establishes HTTP connection with endpoint URL
  + manages reconnection to the endpoint
  + handles backoff when connections fail
  + deserializes data stream into JSON documents

### cluster-coordinator

  + knows about nodes in the cluster
  + reacts to the addition/removal of a node
  + delegates to `tolerant-json-stream` for connecting to a node
  + delegates to `set-stream` for applying changes from a node

### cluster-monitor

  + interfaces with underlying cluster-discovery mechanism
  + publishes events for the addition/removal of a node

### cluster

  + initializes the cluster-coordinator
  + initializes cluster-monitoring
  + connects `cluster-coordinator` to `cluster-monitoring`
  + logs cluster changes
