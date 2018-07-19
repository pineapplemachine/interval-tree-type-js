function testIntervalTree(IntervalTree){
    const canary = require("canary-test").Group("IntervalTree");
    const assert = require("assert").strict;
    
    function assertEmpty(iter){
        for(let item of iter) throw new Error("Iterable isn't empty.");
    }
    function assertSeqEqual(actual, expected){
        actual = Array.isArray(actual) ? actual : Array.from(actual);
        expected = Array.isArray(expected) ? expected : Array.from(expected);
        function fail(){throw new Error(
            `Sequences not equal:\n` +
            `Expected: ${JSON.stringify(expected, null, " ")}\n` +
            `Actual: ${JSON.stringify(actual, null, " ")}`
        );}
        if(actual.length !== expected.length) fail();
        for(let i = 0; i < expected.length; i++){
            if(actual[i] !== expected[i]) fail();
        }
    }
    function assertIntervalPermutation(actual, expected, message){
        actual = Array.isArray(actual) ? actual : Array.from(actual);
        expected = Array.isArray(expected) ? expected : Array.from(expected);
        const actualSorted = actual.slice();
        actualSorted.sort(cmp);
        const expectedSorted = expected.slice();
        expectedSorted.sort(cmp);
        function cmp(a, b){
            return (a.low - b.low) || (b.high - a.high) || (a.value - b.value);
        }
        function str(intervals){
            if(!intervals || !intervals.length) return "[]";
            return "[\n" + intervals.map(
                i => `  [${i.low}, ${i.high}]: ${i.value},`
            ).join("\n") + "\n]";
        }
        function fail(){throw new Error(
            (message ? message + " " : "") +
            `Not a permutation:\n` +
            `Expected: ${str(expectedSorted)}\n` +
            `Actual: ${str(actualSorted)}`
        );}
        if(actual.length !== expected.length) fail();
        for(let i = 0; i < expected.length; i++){
            if(actualSorted[i].low !== expectedSorted[i].low) fail();
            if(actualSorted[i].high !== expectedSorted[i].high) fail();
            if(actualSorted[i].value !== expectedSorted[i].value) fail();
        }
    }
    
    // Helper to validate the internal structure of the tree
    // to make sure that invariants still hold true after each
    // insertion or removal.
    function assertStructure(node){
        if(!node) return;
        try{
            assertStructureHelper(node);
        }catch(error){
            if(!error.logged){
                let debugNode = node.parent || node;
                if(debugNode.toDebugString) console.log(
                    "Local tree at error time:\n" +
                    debugNode.toDebugString()
                );
                error.logged = true;
            }
            throw error;
        }
    }
    function assertStructureHelper(node){
        if(!node) return;
        if(node.color === IntervalTree.Node.Red){
            assert((node.left && node.right) || (!node.left && !node.right),
                "Red parent has only one child: " + node.low
            );
            if(node.left) assert(node.left.color === IntervalTree.Node.Black,
                "Red parent has a red left child: " + node.low
            );
            if(node.right) assert(node.right.color === IntervalTree.Node.Black,
                "Red parent has a red right child: " + node.low
            );
        }
        assert.equal(node.high, node.intervals[0].high,
            "High bound doesn't match intervals content: " + node.low
        );
        if(node.left && node.right){
            const lastInterval = node.intervals[node.intervals.length - 1];
            assert.equal(node.minimumHigh, Math.min(
                lastInterval.high, node.left.minimumHigh, node.right.minimumHigh
            ), "Minimum high bound issue: " + node.low);
            assert.equal(node.maximumHigh, Math.max(
                node.high, node.left.maximumHigh, node.right.maximumHigh
            ), "Maximum high bound issue: " + node.low);
        }else if(node.left){
            const lastInterval = node.intervals[node.intervals.length - 1];
            assert.equal(node.minimumHigh,
                Math.min(lastInterval.high, node.left.minimumHigh),
                "Minimum high bound issue: " + node.low
            );
            assert.equal(node.maximumHigh,
                Math.max(node.high, node.left.maximumHigh),
                "Maximum high bound issue: " + node.low
            );
        }else if(node.right){
            const lastInterval = node.intervals[node.intervals.length - 1];
            assert.equal(node.minimumHigh,
                Math.min(lastInterval.high, node.right.minimumHigh),
                "Minimum high bound issue: " + node.low
            );
            assert.equal(node.maximumHigh,
                Math.max(node.high, node.right.maximumHigh),
                "Maximum high bound issue: " + node.low
            );
        }else{
            const lastInterval = node.intervals[node.intervals.length - 1];
            assert.equal(node.minimumHigh, lastInterval.high,
                "Minimum high bound issue: " + node.low
            );
            assert.equal(node.maximumHigh, node.high,
                "Maximum high bound issue: " + node.low
            );
        }
        if(node.left){
            assert(node.left.parent === node, "Bad parent/child structure.");
            assert(node.low > node.left.low, "Bad ordering");
            assert.equal(node.minimumLow, node.left.minimumLow,
                "Mismatched minimumLow: " + node.low
            );
            assertStructure(node.left);
        }else{
            assert.equal(node.minimumLow, node.low);
        }
        if(node.right){
            assert(node.right.parent === node, "Bad parent/child structure.");
            assert(node.low < node.right.low, "Bad ordering");
            assert.equal(node.maximumLow, node.right.maximumLow,
                "Mismatched maximumLow: " + node.low
            );
            assertStructure(node.right);
        }else{
            assert.equal(node.maximumLow, node.low);
        }
    }
    
    canary.test("empty tree", function(){
        const tree = new IntervalTree();
        assert.equal(tree.isEmpty(), true);
        assert.equal(tree.getIntervalCount(), 0);
        assertEmpty(tree);
        assertEmpty(tree.ascending());
        assertEmpty(tree.descending());
        assertEmpty(tree.queryPoint(0));
        assertEmpty(tree.queryBeforePoint(0));
        assertEmpty(tree.queryAfterPoint(0));
        assertEmpty(tree.queryExcludePoint(0));
        assertEmpty(tree.queryInterval(0, 1));
        assertEmpty(tree.queryWithinInterval(0, 1));
        assertEmpty(tree.queryExcludeInterval(0, 1));
        assert.equal(tree.remove(0, 1, "nope"), null);
        assert.equal(tree.removeAll(0, 1, "nope"), null);
        assert.equal(tree.contains(0, 1, "nope"), null);
        assert.equal(tree.getContained(0, 1, "nope"), null);
    });
    
    canary.test("tree with one interval", function(){
        const tree = new IntervalTree();
        tree.insert(0, 1, "hello");
        assert.equal(tree.isEmpty(), false);
        assert.equal(tree.getIntervalCount(), 1);
        for(let getIntervals of [
            () => tree,
            () => tree.ascending(),
            () => tree.descending(),
            () => tree.queryPoint(0),
            () => tree.queryPoint(1),
            () => tree.queryInterval(0, 1),
            () => tree.queryInterval(-Infinity, 0),
            () => tree.queryInterval(1, +Infinity),
        ]){
            const intervals = Array.from(getIntervals());
            assert.equal(intervals.length, 1);
            assert.equal(intervals[0].low, 0);
            assert.equal(intervals[0].high, 1);
            assert.equal(intervals[0].value, "hello");
        }
        for(let getIntervals of [
            () => tree.queryPoint(-1),
            () => tree.queryPoint(2),
            () => tree.queryInterval(2, 3),
            () => tree.queryInterval(-Infinity, -1),
            () => tree.queryInterval(+2, +Infinity),
        ]){
            const intervals = Array.from(getIntervals());
            assert.equal(intervals.length, 0);
        }
        assert.equal(tree.remove(0, 1, "nope"), null);
        assert.equal(tree.getIntervalCount(), 1);
        assert.equal(tree.remove(1, 1, "hello"), null);
        assert.equal(tree.getIntervalCount(), 1);
        assert.equal(tree.remove(0, 2, "hello"), null);
        assert.equal(tree.getIntervalCount(), 1);
        const root = tree.root;
        const interval = root.intervals[0];
        assert.equal(root.color, IntervalTree.Node.Black);
        assert.equal(tree.remove(0, 1, "hello"), interval);
        assert.equal(tree.isEmpty(), true);
        assert.equal(tree.getIntervalCount(), 0);
    });
    
    canary.series("tree with many intervals", function(){
        const InsertCount = 500;
        const tree = new IntervalTree();
        const intervals = [];
        this.test("insert " + InsertCount + " intervals", function(){
            for(let i = 0; i < InsertCount; i++){
                const x = ((5471 + i) * 7541) % InsertCount;
                const y = ((1933 + i) * 5807) % InsertCount;
                const add = {
                    low: Math.min(x, y),
                    high: Math.max(x, y),
                    value: i,
                };
                tree.insert(add.low, add.high, add.value);
                intervals.push(add);
                assertStructure(tree.root);
                assert(!tree.isEmpty());
                assert.equal(tree.root.getIntervalCount(), intervals.length);
            }
            assert(tree.root.getHeight() <= 1 + Math.ceil(Math.log2(intervals.length)));
        });
        this.test("enumerate intervals in any order", function(){
            const visitedValues = {};
            for(let interval of tree){
                assert(!visitedValues[interval.value],
                    "Repeated node with value: " + interval.value
                );
                visitedValues[interval.value] = true;
            }
            for(let interval of tree.intervals()){
                assert(visitedValues[interval.value],
                    "Repeated node with value: " + interval.value
                );
                visitedValues[interval.value] = false;
            }
        });
        this.test("enumerate intervals in ascending order", function(){
            const visitedValues = {};
            let lastLow = -Infinity;
            let lastHigh = -Infinity;
            for(let interval of tree.ascending()){
                assert(!visitedValues[interval.value],
                    "Repeated node with value: " + interval.value
                );
                visitedValues[interval.value] = true;
                if(interval.low < lastLow || (
                    interval.low === lastLow && interval.high < lastHigh
                )) throw new Error(
                    `Not in ascending order: ` +
                    `[${lastLow}, ${lastHigh}] > ` +
                    `[${interval.low}, ${interval.high}]`
                );
                lastLow = interval.low;
                lastHigh = interval.high;
            }
        });
        this.test("enumerate intervals in descending order", function(){
            const visitedValues = {};
            let lastLow = +Infinity;
            let lastHigh = +Infinity;
            for(let interval of tree.descending()){
                assert(!visitedValues[interval.value],
                    "Repeated node with value: " + interval.value
                );
                visitedValues[interval.value] = true;
                if(interval.low > lastLow || (
                    interval.low === lastLow && interval.high > lastHigh
                )) throw new Error(
                    `Not in descending order: ` +
                    `[${lastLow}, ${lastHigh}] < ` +
                    `[${interval.low}, ${interval.high}]`
                );
                lastLow = interval.low;
                lastHigh = interval.high;
            }
        });
        // Used by query tests
        const points = [
            0, 1, 2, 5, 17, 50, 100, 110, 121, 150, 160, 180, 195, 199,
            250, 300, 400, 420, 452, 480, 498, 499
        ];
        this.test("queryPoint", function(){
            for(let point of points){
                const actual = Array.from(tree.queryPoint(point));
                const expected = intervals.filter(
                    i => i.low <= point && i.high >= point
                );
                assertIntervalPermutation(actual, expected,
                    `Incorrect queryPoint output for point: ${point}.`
                );
            }
        });
        this.test("queryBeforePoint", function(){
            for(let point of points){
                const actual = Array.from(tree.queryBeforePoint(point));
                const expected = intervals.filter(
                    i => i.high <= point
                );
                assertIntervalPermutation(actual, expected,
                    `Incorrect queryBeforePoint output for point: ${point}.`
                );
            }
        });
        this.test("queryAfterPoint", function(){
            for(let point of points){
                const actual = Array.from(tree.queryAfterPoint(point));
                const expected = intervals.filter(
                    i => i.low >= point
                );
                assertIntervalPermutation(actual, expected,
                    `Incorrect queryAfterPoint output for point: ${point}.`
                );
            }
        });
        this.test("queryExcludePoint", function(){
            for(let point of points){
                point = point || 250;
                const actual = Array.from(tree.queryExcludePoint(point));
                const expected = intervals.filter(
                    i => i.low >= point || i.high <= point
                );
                assertIntervalPermutation(actual, expected,
                    `Incorrect queryExcludePoint output for point: ${point}.`
                );
            }
        });
        this.test("queryInterval", function(){
            for(let i = 0; i < points.length; i++){
                for(let j = i; j < points.length; j++){
                    const low = points[i];
                    const high = points[j];
                    const actual = Array.from(tree.queryInterval(low, high));
                    const expected = intervals.filter(
                        i => i.low <= high && i.high >= low
                    );
                    assertIntervalPermutation(actual, expected,
                        `Incorrect queryInterval output for interval: ` +
                        `[${low}, ${high}].`
                    );
                }
            }
        });
        this.test("queryWithinInterval", function(){
            for(let i = 0; i < points.length; i++){
                for(let j = i; j < points.length; j++){
                    const low = points[i];
                    const high = points[j];
                    const actual = Array.from(tree.queryWithinInterval(low, high));
                    const expected = intervals.filter(
                        i => i.low >= low && i.high <= high
                    );
                    assertIntervalPermutation(actual, expected,
                        `Incorrect queryInterval output for interval: ` +
                        `[${low}, ${high}].`
                    );
                }
            }
        });
        this.test("queryExcludeInterval", function(){
            for(let i = 0; i < points.length; i++){
                for(let j = i; j < points.length; j++){
                    const low = points[i];
                    const high = points[j];
                    const actual = Array.from(tree.queryExcludeInterval(low, high));
                    const expected = intervals.filter(
                        i => i.low >= high || i.high <= low
                    );
                    assertIntervalPermutation(actual, expected,
                        `Incorrect queryExcludeInterval output for interval: ` +
                        `[${low}, ${high}].`
                    );
                }
            }
        });
        this.test("remove intervals", function(){
            // Keep removing stuff in a (sort of) random order
            let removed = 0;
            for(let i = 0; i < intervals.length; i++){
                const interval = intervals[(3529 + i * 2857) % intervals.length];
                const intervalRemoved = tree.remove(
                    interval.low, interval.high, interval.value
                );
                assert(intervalRemoved);
                removed++;
                assertStructure(tree.root);
                assert.equal(tree.getIntervalCount(), intervals.length - removed,
                    "Interval count mismatch."
                );
                assertStructure(tree.root);
            }
        });
    });

    canary.series("containment and removal", function(){
        let tree;
        const intervals = [
            new IntervalTree.Interval(1, 2, "a"),
            new IntervalTree.Interval(1, 2, "a"),
            new IntervalTree.Interval(1, 2, "b"),
            new IntervalTree.Interval(2, 3, "d"),
            new IntervalTree.Interval(2, 3, "d"),
            new IntervalTree.Interval(2, 3, "e"),
            new IntervalTree.Interval(2, 2, "x"),
            new IntervalTree.Interval(2, 2, "x"),
            new IntervalTree.Interval(2, 2, "x"),
            new IntervalTree.Interval(2, 8, "y"),
            new IntervalTree.Interval(2, 8, "y"),
            new IntervalTree.Interval(2, 8, "y"),
        ];
        this.onBegin("initialize interval tree", function(){
            tree = new IntervalTree();
            for(let interval of intervals){
                tree.insert(interval.low, interval.high, interval.value);
            }
        });
        this.test("contains", function(){
            assert.equal(tree.contains(1, 2, "no"), null);
            assert.equal(tree.contains(2, 3, "f"), null);
            assert.deepEqual(tree.contains(1, 2, "a"), intervals[0]);
            assert.deepEqual(tree.contains(2, 3, "e"), intervals[5]);
        });
        this.test("getContained", function(){
            // Negative case: same low bound as any node
            const negative1 = tree.getContained(1, 2, "no");
            assert.equal(negative1, null);
            // Negative case: different low bound from any node
            const negative2 = tree.getContained(10, 11, "no");
            assert.equal(negative2, null);
            // Positive case
            const positive = tree.getContained(2, 3, "d");
            assert(Array.isArray(positive));
            assert.equal(positive.length, 2);
            assert.deepEqual(positive[0], intervals[3]);
            assert.deepEqual(positive[1], intervals[3]);
        });
        this.test("remove", function(){
            assert.equal(tree.remove(1, 2, "no"), null);
            assert.equal(tree.remove(2, 3, "f"), null);
            assert.deepEqual(tree.remove(1, 2, "a"), intervals[0]);
            assert.deepEqual(tree.remove(2, 3, "e"), intervals[5]);
            assert.deepEqual(tree.remove(2, 2, "x"), intervals[6]);
            assert.deepEqual(tree.remove(2, 8, "y"), intervals[9]);
        });
        this.test("removeAll", function(){
            // Negative case: same low bound as any node
            const negative1 = tree.removeAll(1, 2, "no");
            assert.equal(negative1, null);
            // Negative case: different low bound from any node
            const negative2 = tree.removeAll(10, 11, "no");
            assert.equal(negative2, null);
            // Positive case
            const positive = tree.removeAll(2, 3, "d");
            assert(Array.isArray(positive));
            assert.equal(positive.length, 2);
            assert.deepEqual(positive[0], intervals[3]);
            assert.deepEqual(positive[1], intervals[3]);
            // Hit different removal logic cases
            assert.equal(tree.removeAll(2, 2, "x").length, 2);
            assert.equal(tree.removeAll(2, 8, "y").length, 2);
        });
        this.test("contains invalid boundaries", function(){
            assert.equal(tree.contains(NaN, 0, "ok"), null);
            assert.equal(tree.contains(0, NaN, "ok"), null);
            assert.equal(tree.contains(NaN, NaN, "ok"), null);
            assert.equal(tree.contains(3, 0, "ok"), null);
        });
        this.test("getContained invalid boundaries", function(){
            assert.equal(tree.getContained(NaN, 0, "ok"), null);
            assert.equal(tree.getContained(0, NaN, "ok"), null);
            assert.equal(tree.getContained(NaN, NaN, "ok"), null);
            assert.equal(tree.getContained(3, 0, "ok"), null);
        });
        this.test("remove invalid boundaries", function(){
            assert.equal(tree.remove(NaN, 0, "ok"), null);
            assert.equal(tree.remove(0, NaN, "ok"), null);
            assert.equal(tree.remove(NaN, NaN, "ok"), null);
            assert.equal(tree.remove(3, 0, "ok"), null);
        });
        this.test("removeAll invalid boundaries", function(){
            assert.equal(tree.removeAll(NaN, 0, "ok"), null);
            assert.equal(tree.removeAll(0, NaN, "ok"), null);
            assert.equal(tree.removeAll(NaN, NaN, "ok"), null);
            assert.equal(tree.removeAll(3, 0, "ok"), null);
        });
    });

    canary.group("readme lifetimes example", function(){
        let tree;
        this.onBegin("initialize interval tree", function(){
            tree = new IntervalTree();
            tree.insert(1815, 1852, "Ada Lovelace");
            tree.insert(1889, 1951, "Ludwig Wittgenstein");
            tree.insert(1890, 1962, "Sir Ronald Fisher");
            tree.insert(1903, 1957, "John von Neumann");
            tree.insert(1906, 1992, "Grace Hopper");
            tree.insert(1912, 1954, "Alan Turing");
            tree.insert(1913, 1985, "Mary Kenneth Keller");
            tree.insert(1917, 2001, "Betty Holberton");
        });
        this.test("queryPoint", function(){
            // Who was alive in 1990?
            assertIntervalPermutation(tree.queryPoint(1990), [
                {low: 1906, high: 1992, value: "Grace Hopper"},
                {low: 1917, high: 2001, value: "Betty Holberton"}
            ]);
        });
        this.test("queryBeforePoint", function(){
            // Who died in or before 1954?
            assertIntervalPermutation(tree.queryBeforePoint(1954), [
                {low: 1815, high: 1852, value: "Ada Lovelace"},
                {low: 1889, high: 1951, value: "Ludwig Wittgenstein"},
                {low: 1912, high: 1954, value: "Alan Turing"},
            ]);
        });
        this.test("queryAfterPoint", function(){
            // Who was born in or after 1913?
            assertIntervalPermutation(tree.queryAfterPoint(1913), [
                {low: 1913, high: 1985, value: "Mary Kenneth Keller"},
                {low: 1917, high: 2001, value: "Betty Holberton"}
            ]);
        });
        this.test("queryExcludePoint", function(){
            // Who was either deceased or not yet born in 1915?
            assertIntervalPermutation(tree.queryExcludePoint(1915), [
                {low: 1815, high: 1852, value: "Ada Lovelace"},
                {low: 1917, high: 2001, value: "Betty Holberton"}
            ]);
        });
        this.test("queryInterval", function(){
            // Who was alive at any time from 1850 through 1910?
            assertIntervalPermutation(tree.queryInterval(1850, 1910), [
                {low: 1815, high: 1852, value: "Ada Lovelace"},
                {low: 1889, high: 1951, value: "Ludwig Wittgenstein"},
                {low: 1890, high: 1962, value: "Sir Ronald Fisher"},
                {low: 1903, high: 1957, value: "John von Neumann"},
                {low: 1906, high: 1992, value: "Grace Hopper"}
            ]);
        });
        this.test("queryWithinInterval", function(){
            // Whose lifetime was fully within the span of 1900 through 1960?
            assertIntervalPermutation(tree.queryWithinInterval(1900, 1960), [
                {low: 1903, high: 1957, value: "John von Neumann"},
                {low: 1912, high: 1954, value: "Alan Turing"}
            ]);
        });
        this.test("queryExcludeInterval", function(){
            // Who was deceased or not yet born for all of 1900 through 1910?
            assertIntervalPermutation(tree.queryExcludeInterval(1900, 1910), [
                {low: 1815, high: 1852, value: "Ada Lovelace"},
                {low: 1912, high: 1954, value: "Alan Turing"},
                {low: 1913, high: 1985, value: "Mary Kenneth Keller"},
                {low: 1917, high: 2001, value: "Betty Holberton"}
            ]);
        });
    });
    
    canary.test("custom value equality function", function(){
        const tree = new IntervalTree((a, b) => a == b);
        tree.insert(1, 2, 100);
        tree.insert(1, 2, "100");
        tree.insert(1, 2, "+100");
        assert(tree.contains(1, 2, "100").value == 100);
        const all = tree.getContained(1, 2, 100);
        assert(all);
        assert(Array.isArray(all));
        assert.equal(all.length, 3);
    });
    
    canary.test("use Date objects as interval bounds", function(){
        const tree = new IntervalTree();
        tree.insert(new Date("2018-01-01"), new Date("2019-01-01"), 2018);
        tree.insert(new Date("2019-01-01"), new Date("2020-01-01"), 2019);
        tree.insert(new Date("2020-01-01"), new Date("2021-01-01"), 2021);
        assertIntervalPermutation(tree.queryPoint(new Date("2019-06-01")), [{
            low: (new Date("2019-01-01")).getTime(),
            high: (new Date("2020-01-01")).getTime(),
            value: 2019
        }]);
    });
    
    canary.test("use NaN as an interval value", function(){
        const tree = new IntervalTree();
        tree.insert(1, 2, NaN);
        tree.insert(2, 3, NaN);
        tree.insert(1, 2, NaN);
        tree.insert(1, 2, NaN);
        assert.equal(tree.getIntervalCount(), 4);
        assert(Number.isNaN(tree.contains(1, 2, NaN).value));
        assert(Number.isNaN(tree.contains(2, 3, NaN).value));
        assert.equal(tree.getContained(1, 2, NaN).length, 3);
        tree.remove(1, 2, NaN);
        assert.equal(tree.getIntervalCount(), 3);
        tree.removeAll(1, 2, NaN);
        assert.equal(tree.getIntervalCount(), 1);
        tree.remove(2, 3, NaN);
        assert.equal(true, tree.isEmpty());
    });
    
    canary.test("index and query unbounded intervals", function(){
        const tree = new IntervalTree();
        tree.insert(-1, +1, "finite");
        tree.insert(-Infinity, 0, "left");
        tree.insert(0, +Infinity, "right");
        tree.insert(-Infinity, +Infinity, "all");
        tree.insert(-Infinity, -Infinity, "none-left");
        tree.insert(+Infinity, +Infinity, "none-right");
        assert.equal(tree.getIntervalCount(), 6);
        assertIntervalPermutation(tree.queryPoint(0), [
            {low: -1, high: +1, value: "finite"},
            {low: -Infinity, high: 0, value: "left"},
            {low: 0, high: +Infinity, value: "right"},
            {low: -Infinity, high: +Infinity, value: "all"},
        ]);
        assertIntervalPermutation(tree.queryExcludePoint(0), [
            {low: -Infinity, high: 0, value: "left"},
            {low: 0, high: +Infinity, value: "right"},
            {low: -Infinity, high: -Infinity, value: "none-left"},
            {low: +Infinity, high: +Infinity, value: "none-right"},
        ]);
        assertIntervalPermutation(tree.queryInterval(-2, -1), [
            {low: -1, high: +1, value: "finite"},
            {low: -Infinity, high: 0, value: "left"},
            {low: -Infinity, high: +Infinity, value: "all"},
        ]);
        assertIntervalPermutation(tree.queryInterval(-Infinity, -1), [
            {low: -1, high: +1, value: "finite"},
            {low: -Infinity, high: 0, value: "left"},
            {low: -Infinity, high: +Infinity, value: "all"},
            {low: -Infinity, high: -Infinity, value: "none-left"},
        ]);
    });
    
    canary.group("querying with invalid intervals", function(){
        let tree;
        this.onBegin("initialize interval tree", function(){
            tree = new IntervalTree();
            tree.insert(0, 1, "hello");
            tree.insert(1, 2, "world");
            tree.insert(2, 3, "!");
        });
        this.test("queryPoint", function(){
            assertEmpty(tree.queryPoint(NaN));
        });
        this.test("queryBeforePoint", function(){
            assertEmpty(tree.queryBeforePoint(NaN));
        });
        this.test("queryAfterPoint", function(){
            assertEmpty(tree.queryAfterPoint(NaN));
        });
        this.test("queryExcludePoint", function(){
            assertEmpty(tree.queryExcludePoint(NaN));
        });
        this.test("queryInterval", function(){
            assertEmpty(tree.queryInterval(0, NaN));
            assertEmpty(tree.queryInterval(NaN, 0));
            assertEmpty(tree.queryInterval(NaN, NaN));
            assertEmpty(tree.queryInterval(1, 0));
        });
        this.test("queryWithinInterval", function(){
            assertEmpty(tree.queryWithinInterval(0, NaN));
            assertEmpty(tree.queryWithinInterval(NaN, 0));
            assertEmpty(tree.queryWithinInterval(NaN, NaN));
            assertEmpty(tree.queryWithinInterval(1, 0));
        });
        this.test("queryExcludeInterval", function(){
            assertEmpty(tree.queryExcludeInterval(0, NaN));
            assertEmpty(tree.queryExcludeInterval(NaN, 0));
            assertEmpty(tree.queryExcludeInterval(NaN, NaN));
            assertEmpty(tree.queryExcludeInterval(1, 0));
        });
    });
    
    canary.group("degenerate cases", function(){
        let tree;
        this.onBegin("initialize interval tree", function(){
            tree = new IntervalTree();
            tree.insert(0, 1, "hello");
            tree.insert(1, 2, "world");
            tree.insert(2, 3, "!");
        });
        this.test("invalid value equality input", function(){
            assert.throws(() => new IntervalTree("nope"),
                TypeError, "Value equality argument must be a function."
            );
        });
        this.test("insert interval with NaN boundary", function(){
            assert.throws(() => tree.insert(NaN, 0, "nope"),
                RangeError, "Low bound must not be NaN."
            );
            assert.throws(() => tree.insert(0, NaN, "nope"),
                RangeError, "High bound must not be NaN."
            );
            assert.throws(() => tree.insert(NaN, NaN, "nope"),
                RangeError, "Low bound must not be NaN."
            );
        });
        this.test("insert interval with non-numeric boundary", function(){
            assert.throws(() => tree.insert("?", 0, "nope"),
                TypeError, "Low bound must be a number."
            );
            assert.throws(() => tree.insert(0, "?", "nope"),
                TypeError, "High bound must be a number."
            );
            assert.throws(() => tree.insert("!", "?", "nope"),
                TypeError, "Low bound must be a number."
            );
        });
        this.test("insert interval with invalid boundary", function(){
            assert.throws(() => tree.insert(1, 0, "nope"), RangeError,
                "Invalid interval [1, 0]. " +
                "The high bound must be greater than or equal to the low bound."
            );
        });
        this.test("contains non-numeric boundaries", function(){
            assert.throws(() => tree.contains("?", 0, "ok"),
                TypeError, "Low bound must be a number."
            );
            assert.throws(() => tree.contains(0, "?", "ok"),
                TypeError, "High bound must be a number."
            );
            assert.throws(() => tree.contains("!", "?", "ok"),
                TypeError, "Low bound must be a number."
            );
        });
        this.test("getContained non-numeric boundaries", function(){
            assert.throws(() => tree.getContained("?", 0, "ok"),
                TypeError, "Low bound must be a number."
            );
            assert.throws(() => tree.getContained(0, "?", "ok"),
                TypeError, "High bound must be a number."
            );
            assert.throws(() => tree.getContained("!", "?", "ok"),
                TypeError, "Low bound must be a number."
            );
        });
        this.test("remove non-numeric boundaries", function(){
            assert.throws(() => tree.remove("?", 0, "ok"),
                TypeError, "Low bound must be a number."
            );
            assert.throws(() => tree.remove(0, "?", "ok"),
                TypeError, "High bound must be a number."
            );
            assert.throws(() => tree.remove("!", "?", "ok"),
                TypeError, "Low bound must be a number."
            );
        });
        this.test("removeAll non-numeric boundaries", function(){
            assert.throws(() => tree.removeAll("?", 0, "ok"),
                TypeError, "Low bound must be a number."
            );
            assert.throws(() => tree.removeAll(0, "?", "ok"),
                TypeError, "High bound must be a number."
            );
            assert.throws(() => tree.removeAll("!", "?", "ok"),
                TypeError, "Low bound must be a number."
            );
        });
    });
    
    return canary;
}

testIntervalTree(require("./index")).doReport();
