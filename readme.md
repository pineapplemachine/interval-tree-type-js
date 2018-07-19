# IntervalTree

[![MIT License][license-image]][license] [![Build Status][travis-image]][travis-url] [![NPM version][npm-version-image]][npm-url]

This package implements a stable, well-tested **IntervalTree** type.
It's licensed according to the permissive
[zlib/libpng license](LICENSE).

The purpose of an [interval tree](https://en.wikipedia.org/wiki/Interval_tree)
is to map values to intervals represented as low and high bounds.
An interval tree makes it possible to efficiently query all intervals
which intersect a point or another interval.
One common use of an interval tree is to index and query data by
time intervals.

Querying methods are implemented as
[generators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/function*),
meaning that the output is computed lazily, as it is demanded,
rather than eagerly added to an array all at once.

Be aware that this implementation supports numeric intervals only.
The result of `input.valueOf()` is what is actually queried and stored.
This means, for example, that an IntervalTree can be used with `Date`
objects without needing to explicitly call `getTime` or `valueOf` to
convert them to numeric timestamps.

[license-image]: https://img.shields.io/badge/License-Zlib-lightgrey.svg
[license]: https://github.com/pineapplemachine/sorted-array-type-js/blob/master/LICENSE

[travis-url]: https://travis-ci.org/pineapplemachine/interval-tree-type-js
[travis-image]: https://travis-ci.org/pineapplemachine/interval-tree-type-js.svg?branch=master

[npm-url]: https://www.npmjs.com/package/interval-tree-type
[npm-version-image]: https://badge.fury.io/js/interval-tree-type.svg

## Example

``` js
// Populate an interval tree with the names of some remarkable figures in
// math and computer science, mapped to intervals representing lifetimes.
const tree = new IntervalTree();
tree.insert(1815, 1852, "Ada Lovelace");
tree.insert(1889, 1951, "Ludwig Wittgenstein");
tree.insert(1890, 1962, "Sir Ronald Fisher");
tree.insert(1903, 1957, "John von Neumann");
tree.insert(1906, 1992, "Grace Hopper");
tree.insert(1912, 1954, "Alan Turing");
tree.insert(1913, 1985, "Mary Kenneth Keller");
tree.insert(1917, 2001, "Betty Holberton");

// Who was alive in 1990?
for(let interval of tree.queryPoint(1990)){
    // {low: 1906, high: 1992, value: "Grace Hopper"},
    // {low: 1917, high: 2001, value: "Betty Holberton"}
}

// Who died in or before 1954?
for(let interval of tree.queryBeforePoint(1954)){
    // {low: 1815, high: 1852, value: "Ada Lovelace"},
    // {low: 1889, high: 1951, value: "Ludwig Wittgenstein"},
    // {low: 1912, high: 1954, value: "Alan Turing"},
}

// Who was born in or after 1913?
for(let interval of tree.queryAfterPoint(1913)){
    // {low: 1913, high: 1985, value: "Mary Kenneth Keller"},
    // {low: 1917, high: 2001, value: "Betty Holberton"}
}

// Who was either deceased or not yet born in 1915?
for(let interval of tree.queryExcludePoint(1915)){
    // {low: 1815, high: 1852, value: "Ada Lovelace"},
    // {low: 1917, high: 2001, value: "Betty Holberton"}
}

// Who was alive at any time from 1850 through 1910?
for(let interval of tree.queryInterval(1850, 1910)){
    // {low: 1815, high: 1852, value: "Ada Lovelace"},
    // {low: 1889, high: 1951, value: "Ludwig Wittgenstein"},
    // {low: 1890, high: 1962, value: "Sir Ronald Fisher"},
    // {low: 1903, high: 1957, value: "John von Neumann"},
    // {low: 1906, high: 1992, value: "Grace Hopper"}
}

// Whose lifetime was fully within the span of 1900 through 1960?
for(let interval of tree.queryWithinInterval(1900, 1960)){
    // {low: 1903, high: 1957, value: "John von Neumann"},
    // {low: 1912, high: 1954, value: "Alan Turing"}
}

// Who was deceased or not yet born for all of 1900 through 1910?
for(let interval of tree.queryExcludeInterval(1900, 1910)){
    // {low: 1815, high: 1852, value: "Ada Lovelace"},
    // {low: 1912, high: 1954, value: "Alan Turing"},
    // {low: 1913, high: 1985, value: "Mary Kenneth Keller"},
    // {low: 1917, high: 2001, value: "Betty Holberton"}
}
```

## Installation

You can add the IntervalTree type to your JavaScript project by using a
package manager to install the `interval-tree-type` package. For example:

``` text
npm install --save interval-tree-type
```

Import the IntervalTree type into your project with `require` or an ES6 import.

``` js
const IntervalTree = require("interval-tree-type");
```

``` js
import IntervalTree from "interval-tree-type";
```

## Documentation

**What is the backing data structure?**
The **IntervalTree** type is a
[red-black](https://en.wikipedia.org/wiki/Red%E2%80%93black_tree)
[augmented interval tree](https://en.wikipedia.org/wiki/Interval_tree#Augmented_tree).
That means that the tree is self-balancing.
It has one node per unique low interval bound in the tree.
Each node contains a list of intervals with the same low bound.
Nodes are ordered, left-to-right, from least to greatest low bound.

**How is interval equality determined?**
You can pass a custom value equality function to the IntervalTree
constructor, but by default a
[SameValueZero](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
function is used to determine equality. (This is probably what you want!)
This applies, for example, to the `contains` and `remove` methods.
These methods match intervals with strictly-equal bounds (`===`) and
values found to be equal according to the value equality function.

**When do intervals intersect?**
Intervals are inclusive on both low and high bounds except where otherwise
specified.
This means, for example, that the interval `[1, 2]` intersects both `[0, 1]`
and `[2, 3]`. Similarly, the point `1` intersects both `[0, 1]` and `[1, 2]`.

**What inputs are accepted for interval boundaries?**
The implementation attempts to convert interval boundaries and queried points
to numbers by calling `point.valueOf()` for relevant arguments.
This means that numbers,
[Date](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date)
objects, and any other input with a `valueOf` method returning a number can be
inserted, removed, queried, etc. out of the box.
Inputs for which `value.valueOf()` does not return a number cannot be used
as interval bounds. They must be converted to numbers some other way before
being passed to IntervalTree methods.

**How does the implementation handle invalid intervals?**
It is not allowed to insert an interval where either boundary is **NaN**,
or where the boundaries do not satisfy the condition `low <= high`.
Violating these constraints will cause an insertion attempt to produce a
[RangeError](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RangeError).
When querying or removing intervals already in the tree, interval inputs
that violate these constraints will cause the method to not match or apply
to any intervals in the tree.
For example, `intervalTree.contains(0, NaN, "value")` will _always_ return a
falsey value because it is impossible for any interval in the tree to have
**NaN** as a boundary.

**How are contained intervals represented?**
Methods which return an interval from the tree return an `Interval` object.
Methods which enumerate intervals in the tree enumerate `Interval` objects.
The package's `Interval` type is accessible via `IntervalTree.Interval`.
An `Interval` object has `low`, `high`, and `value` attributes. These
attributes correspond to the arguments passed in a call to
`intervalTree.insert(low, high, value)`.

**Is it safe to modify interval objects?**
It is unsafe to modify the `Interval` objects returned or enumerated by any
`IntervalTree` method.
Doing so may invalidate the assumptions that the tree is normally able
to make about its contents; this can cause the tree to behave incorrectly.
If you want to change an interval in the tree, you must separately
`remove` that interval with the old values and then `insert` it with the
updated values.
It is not safe to modify arrays of intervals returned by IntervalTree
methods, either.
Note that although there are in fact places where modifying these intervals
or arrays of intervals won't affect the behavior of the tree, this may
change from one package version to the next without notice.

**In what order are intervals enumerated?**
Except when otherwise specified, methods which enumerate intervals in an
interval tree do so in no particular order.
Think of it like enumerating the keys in a JavaScript Object:
The implementation makes no guarantees about the order of the enumerated
items, only that all of the relevant items will be present and will occur
exactly once.

**Is it safe to use methods not documented here?**
Types, methods, and attributes not specifically documented in this readme
are liable to change from one version to the next without notice, even
between patch versions. (e.g. *1.0.0* => *1.0.1*)
You should use only the documented API or, if it's really important for you to
use undocumented parts of the API, then you should be careful when upgrading to
a newer version of the package.

**How do I represent unbounded intervals?**
The IntervalTree type is fully able to handle intervals with `+Infinity`
and `-Infinity` bounds. You can use these values to indicate an
unbounded interval, e.g. `[-Infinity, 1]` or `[1, +Infinity]`.

**What is SortedArray?**
The interval tree implementation uses a
[SortedArray type](https://github.com/pineapplemachine/sorted-array-type-js)
type to keep track of intervals.
Some functions may return a SortedArray of intervals. When this is the case,
the documentation will clearly mention it.
Modifying operations like `push` or index assignment can cause a SortedArray's
other functions to no longer behave correctly. However, operations that do not
modify the array should behave exactly like you would expect from any
normal Array.
(You should refer to the SortedArray package documentation for more detail.)

## API

Each method is accompanied by a description of its
[computational complexity](https://rob-bell.net/2009/06/a-beginners-guide-to-big-o-notation/).
In this notation, `n` is the total number of intervals in the tree and
`k` is the number of intervals in the tree that match an input query.
(I'm not a computer scientist, and some of these operations are not
completely standard, so please don't take the complexity stated
here as absolute truth. They should all be at least roughly correct, though.)

#### constructor — O(1)

``` js
const IntervalTree = require("interval-tree-type");
const intervalTree = new IntervalTree()
```

It initializes a new, empty interval tree.

The **IntervalTree** constructor accepts an optional value equality
function as its single argument.
This function is used by methods like `contains` and `remove` to
determine whether a given interval matches the arguments:
An interval is said to match some input interval when the low and high bounds
are strictly equal and when `valuesEqual(a, b)` returns a truthy value.

When no value equality function is explicitly given,
[SameValueZero](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Equality_comparisons_and_sameness)
is used by default when determining value equality.

``` js
const intervalTree = new IntervalTree((a, b) => a == b)
```

#### isEmpty — O(1)

``` js
const empty = intervalTree.isEmpty();
```

Returns `true` when the interval tree is empty and `false` when it contains
at least one interval.

#### getIntervalCount — O(n)

``` js
const count = intervalTree.getIntervalCount();
```

Returns the number of intervals that are currently in the tree.

#### intervals — O(n)

``` js
for(let interval of intervalTree.intervals()){
    doStuffWith(interval);
}
```

``` js
for(let interval of intervalTree){
    doStuffWith(interval);
}
```

Enumerate all of the intervals in the tree, in no particular order.
This is the behavior for both `for(interval of intervalTree.intervals())`
and `for(interval of intervalTree)`.
You should expect this to be the most performant way to enumerate all
the intervals in the tree.

#### ascending — O(n)

``` js
for(let interval of intervalTree.ascending()){
    doStuffWith(interval);
}
```

Enumerate all of the intervals in the tree, first in ascending order of
the low boundary and then in ascending order of the high boundary.
This enumeration will always visit intervals in the exact reverse-order
of `intervalTree.descending()`.

``` js
{low: 0, high: 20, value: "first"},
{low: 1, high: 2, value: "second"},
{low: 1, high: 200, value: "third"},
{low: 2, high: 20, value: "fourth"}
```

#### descending — O(n)

``` js
for(let interval of intervalTree.descending()){
    doStuffWith(interval);
}
```

Enumerate all of the intervals in the tree, first in descending order of
the low boundary and then in descending order of the high boundary.
This enumeration will always visit intervals in the exact reverse-order
of `intervalTree.ascending()`.

``` js
{low: 2, high: 20, value: "first"}
{low: 1, high: 200, value: "second"},
{low: 1, high: 2, value: "third"},
{low: 0, high: 20, value: "fourth"},

```

#### insert — O(log n)

``` js
intervalTree.insert(low, high, value);
```

Add a new interval to the tree. If an interval with the same boundaries
and value already exists, then another will be added.

#### contains — O(log n)

``` js
const containedInterval = intervalTree.contains(low, high, value);
```

When the tree contains any interval matching the input, the method returns
one of those intervals.
When the tree contains no matching intervals, the method returns `null`.

#### getContained — O(k + log n)

``` js
const containedIntervals = intervalTree.getContained(low, high, value);
```

Returns a SortedArray of matching intervals from the tree.
When there were no matching intervals, the method returns `null`.

#### remove — O(log n)

``` js
const removedInterval = intervalTree.remove(low, high, value);
```

Remove the first matching interval from the tree.
If a matching interval was found in the tree, the method returns that interval
as an `Interval` object.
If no matching interval was found, then the method returns `null`.

When removing an interval from the tree, only the first matching interval
to be found is removed.
This means that if there were two matching intervals in the tree
before calling `remove`, there will still be one such interval left in the
tree after calling `remove`.

If you need to remove every matching interval, then you should use the
`removeAll` method.
A single call to `removeAll` should be more performant than repeated
calls to `remove`.

#### removeAll — O(k + log n)

``` js
const removedCount = intervalTree.removeAll(low, high, value);
```

Remove all matching intervals from the tree.
Returns a SortedArray of removed intervals.
When there were no matching intervals, the method returns `null`.

The behavior of `removeAll` is the same as invoking
`intervalTree.remove(low, high, value)` with the same arguments until it
returns `null`, but a single call to `removeAll` is more efficient than
repeated calls to `remove`.

#### queryPoint — O(k + log n)

``` js
for(let interval of intervalTree.queryPoint(point)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which intersect the given point,
in no particular order.

#### queryBeforePoint — O(k + log n)

``` js
for(let interval of intervalTree.queryBeforePoint(point)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which have a high boundary equal to
or less than the input point,
i.e. that precede or end on the input point.

#### queryAfterPoint — O(k + log n)

``` js
for(let interval of intervalTree.queryAfterPoint(point)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which have a low boundary equal to
or greater than the input point,
i.e. that follow or begin on the input point.

#### queryExcludePoint — O(k + log n)

``` js
for(let interval of intervalTree.queryExcludePoint(point)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which do not contain the given point.
The output _does_ include intervals which have a low or high boundary equal
to the input point.

#### queryInterval — O(k + log n)

``` js
for(let interval of intervalTree.queryInterval(low, high)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which intersect the input interval.

#### queryWithinInterval — O(k + log n)

``` js
for(let interval of intervalTree.queryWithinInterval(low, high)){
    doStuffWith(interval);
}
```

Enumerates all intervals in the tree which are completely contained within
the input interval. This does include intervals with a low bound equal
to the inputted low bound, or a high bound equal to the inputted high bound.

#### queryExcludeInterval — O(k + log n)

``` js
for(let interval of intervalTree.queryExcludeInterval(low, high)){
    doStuffWith(interval);
}
```

Enumerates all of the intervals which do not intersect the input interval.
The output _does_ include intervals with a high boundary that is equal to
the low input boundary, and intervals with a low boundary that is equal
to the high input boundary.
