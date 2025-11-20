# SpatialMap2D

2D spatial map for radius-based queries on arbitrary keys in unbounded space.

## Usage

SpatialMap2D is conceptually a Map that accepts a key and coordinate pair value. The only new method is `query(x, y, radius)` which yields keys within a target radius.

```ts
const sm = new SpatialMap2D<string>(24);

// add keys at x, y positions
sm.set("a", 0, 0);
sm.set("b", 2, 3);
sm.set("c", -48, 96);

// query around an arbitrary x, y point and radius
const nearby = [...sm.query(5, 6, 32)]; // ["a", "b"]

// remove keys
sm.delete("b");

const everything = [...sm.query(-32, 48, Infinity)]; // ["a", "c"]

// standard map operations
sm.has("a"); // true
sm.has("b"); // false

sm.get("a"); // [0, 0]
sm.get("b"); // undefined
```

## Algorithm

- A sparse map is created
- Adding a key adds it to its cell bucket
- Deleting a key removes it from its cell bucket
- Cells are dynamically created and destroyed
- Querying sweeps intersecting cells around a target radius
  - Yields all keys if inscribed, otherwise yields keys within radius
  - Traversal is bound by real cells, adjusting range to whichever is smaller
