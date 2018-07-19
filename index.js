// Credit to these implementations for serving as a reference:
// https://github.com/IvanPinezhaninov/IntervalTree
// https://github.com/stanislavkozlovski/Red-Black-Tree

const SortedArray = require("sorted-array-type");

const Red = true;
const Black = false;

const SameValueZero = (a, b) => a === b || (a !== a && b !== b);

const IntervalComparator = (a, b) => b.high - a.high;

class IntervalTree{
    constructor(valuesEqual){
        this.valuesEqual = valuesEqual || SameValueZero;
        this.root = null;
        if(typeof(this.valuesEqual) !== "function"){
            throw new TypeError("Value equality argument must be a function.");
        }
    }
    // Helper to validate numeric inputs and throw helpful
    // errors when the inputs are invalid.
    static validate(point, description, nanok){
        const value = point.valueOf();
        if(typeof(value) !== "number"){
            throw new TypeError(`${description} must be a number.`);
        }
        if(!nanok && value !== value){
            throw new RangeError(`${description} must not be NaN.`);
        }
        return value;
    }
    // Returns true when the tree is empty and false otherwise.
    isEmpty(){
        return !this.root;
    }
    // Get the total number of intervals in the tree.
    getIntervalCount(){
        return this.root ? this.root.getIntervalCount() : 0;
    }
    // Insert a node into the tree associating a value with an interval.
    insert(low, high, value){
        // Validate input interval
        low = IntervalTree.validate(low, "Low bound", false);
        high = IntervalTree.validate(high, "High bound", false);
        if(high < low) throw new RangeError(
            `Invalid interval [${low}, ${high}]. ` + 
            "The high bound must be greater than or equal to the low bound."
        );
        // Handle the case where the tree is currently empty
        if(!this.root){
            this.root = new IntervalTreeNode(
                this.valuesEqual, low, high, null, Black
            );
            this.root.addInterval(low, high, value);
            return this.root;
        }
        // Otherwise, search for the place where this interval should be added
        let node = this.root;
        while(true){
            if(low < node.low){
                if(node.left){
                    node = node.left;
                }else{ // Add the interval to a new left child of this node
                    node.addLeftChild(this, low, high, value);
                    break;
                }
            }else if(low > node.low){
                if(node.right){
                    node = node.right;
                }else{ // Add the interval to a new right child of this node
                    node.addRightChild(this, low, high, value);
                    break;
                }
            }else{
                // Add the interval to this node (same low boundary)
                node.addInterval(low, high, value);
                node.addIntervalUpdateLimits();
                break;
            }
        }
    }
    // Remove the first matching interval from the tree.
    // Value equality checks use SameValueZero.
    remove(low, high, value){
        // Immediately abort if the tree is empty
        if(!this.root) return null;
        // Validate interval bounds
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Get the node that should contain this interval
        const node = this.root.getNodeWithInterval(low, high, value);
        // Abort if the interval wasn't found anywhere in the tree
        if(!node) return null;
        // Try to remove the interval
        const removedInterval = node.removeInterval(low, high, value);
        // No matching interval? Abort with null return value
        if(!removedInterval) return null;
        // If there are no more instances in the node, then remove the node
        if(node.intervals.length === 0) node.remove(this);
        // Return the removed interval
        return removedInterval;
    }
    // Remove all matching intervals from the tree.
    removeAll(low, high, value){
        // Immediately abort if the tree is empty
        if(!this.root) return null;
        // Validate interval bounds
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Get the node that should contain this interval
        const node = this.root.getNodeWithInterval(low, high, value);
        // Abort if the interval wasn't found anywhere in the tree
        if(!node) return null;
        // Try to remove all instances of the interval
        const removedIntervals = node.removeAllIntervals(low, high, value);
        // If there are no more instances in the node, then remove the node
        if(node.intervals.length === 0) node.remove(this);
        // Return the number of removed intervals
        return removedIntervals.length ? removedIntervals : null;
    }
    // Get whether a matching interval is contained in the tree.
    contains(low, high, value){
        // Immediately abort if the tree is empty
        if(!this.root) return null;
        // Validate interval bounds
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Get the node that should contain this interval
        const node = this.root.getNodeWithInterval(low, high, value);
        // Count the number of matching intervals
        return node && node.contains(low, high, value);
    }
    // Get an array of matching intervals in the tree.
    getContained(low, high, value){
        // Immediately abort if the tree is empty
        if(!this.root) return null;
        // Validate interval bounds
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Get the node that should contain this interval
        const node = this.root.getNodeWithInterval(low, high, value);
        // Handle the case where there was no matching node
        if(!node) return null;
        // Count the number of matching intervals
        const contained = node.getContainedIntervals(low, high, value);
        return contained.length ? contained : null;
    }
    // Enumerate all intervals that intersect a point
    *queryPoint(point){
        if(!this.root) return;
        point = IntervalTree.validate(point, "Point", true);
        // Exit immediately if the point input was NaN
        if(point !== point) return;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(point >= node.low && point <= node.high){
                for(let interval of node.intervals){
                    if(interval.high >= point) yield interval;
                    else break;
                }
            }
            if(node.left &&
                point <= node.left.maximumHigh && point >= node.left.minimumLow
            ){
                stack.push(node.left);
            }
            if(node.right &&
                point <= node.right.maximumHigh && point >= node.right.minimumLow
            ){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that end before or on a point
    *queryBeforePoint(point){
        if(!this.root) return;
        point = IntervalTree.validate(point, "Point", true);
        // Exit immediately if the point input was NaN
        if(point !== point) return;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(point >= node.low){
                for(let i = node.intervals.length - 1; i >= 0; i--){
                    const interval = node.intervals[i];
                    if(interval.high <= point) yield interval;
                    else break;
                }
            }
            if(node.left && point >= node.left.minimumHigh){
                stack.push(node.left);
            }
            if(node.right && point >= node.right.minimumHigh){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that begin after or on a point
    *queryAfterPoint(point){
        if(!this.root) return;
        point = IntervalTree.validate(point, "Point", true);
        // Exit immediately if the point input was NaN
        if(point !== point) return;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(point <= node.low){
                for(let interval of node.intervals) yield interval;
            }
            if(node.left && point <= node.left.maximumLow){
                stack.push(node.left);
            }
            if(node.right && point <= node.right.maximumLow){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that do NOT intersect a point
    // Intervals with a boundary exactly equal to the point are included
    // in the output.
    *queryExcludePoint(point){
        if(!this.root) return;
        point = IntervalTree.validate(point, "Point", true);
        // Exit immediately if the point input was NaN
        if(point !== point) return;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(point <= node.low){
                for(let interval of node.intervals) yield interval;
            }else{
                for(let i = node.intervals.length - 1; i >= 0; i--){
                    const interval = node.intervals[i];
                    if(interval.high <= point) yield interval;
                    else break;
                }
            }
            if(node.left && (
                point >= node.left.minimumHigh || point <= node.left.maximumLow
            )){
                stack.push(node.left);
            }
            if(node.right && (
                point >= node.right.minimumHigh || point <= node.right.maximumLow
            )){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that intersect another interval
    *queryInterval(low, high){
        if(!this.root) return;
        // Validate interval bounds
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(low <= node.high && high >= node.low){
                for(let interval of node.intervals){
                    if(interval.high >= low) yield interval;
                    else break;
                }
            }
            if(node.left &&
                high >= node.left.minimumLow && low <= node.left.maximumHigh
            ){
                stack.push(node.left);
            }
            if(node.right &&
                high >= node.right.minimumLow && low <= node.right.maximumHigh
            ){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that are entirely contained within the input.
    *queryWithinInterval(low, high){
        if(!this.root) return;
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(node.low >= low){
                for(let i = node.intervals.length - 1; i >= 0; i--){
                    const interval = node.intervals[i];
                    if(interval.high <= high) yield interval;
                    else break;
                }
            }
            if(node.left &&
                node.left.maximumLow >= low && node.left.minimumHigh <= high
            ){
                stack.push(node.left);
            }
            if(node.right &&
                node.right.maximumLow >= low && node.right.minimumHigh <= high
            ){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all intervals that do NOT intersect another interval
    // Intervals with a low bound exactly equal to the high input bound,
    // or with a high bound exactly equal to the low input bound, are included
    // in the output.
    *queryExcludeInterval(low, high){
        if(!this.root) return;
        low = IntervalTree.validate(low, "Low bound", true);
        high = IntervalTree.validate(high, "High bound", true);
        // Exit immediately if the input interval isn't valid
        if(high !== high || low !== low || high < low) return null;
        // Search the tree, starting with the root
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(high <= node.low){
                for(let interval of node.intervals) yield interval;
            }else{
                for(let i = node.intervals.length - 1; i >= 0; i--){
                    const interval = node.intervals[i];
                    if(interval.high <= low) yield interval;
                    else break;
                }
            }
            if(node.left && (
                low >= node.left.minimumHigh || high <= node.left.maximumLow
            )){
                stack.push(node.left);
            }
            if(node.right && (
                low >= node.right.minimumHigh || high <= node.right.maximumLow
            )){
                stack.push(node.right);
            }
        }
    }
    // Enumerate all nodes in the tree (in no particular order)
    *nodes(){
        if(!this.root) return;
        let stack = [this.root];
        while(stack.length){
            const node = stack.pop();
            if(node.left) stack.push(node.left);
            if(node.right) stack.push(node.right);
            yield node;
        }
    }
    // Enumerate all the nodes in the tree (in ascending order)
    *nodesAscending(){
        let i = 0;
        let node = this.root && this.root.getLeftmostChild();
        while(node){
            yield node;
            node = node.getSuccessor();
        }
    }
    // Enumerate all the nodes in the tree (in descending order)
    *nodesDescending(){
        let node = this.root && this.root.getRightmostChild();
        while(node){
            yield node;
            node = node.getPredecessor();
        }
    }
    // Enumerate all intervals in the tree (in no particular order)
    *intervals(){
        for(let node of this.nodes()){
            // Note: for...of is about 40% as performant as of node v10.7.0
            // for(let interval of node.intervals) yield interval;
            for(let i = 0; i < node.intervals.length; i++){
                yield node.intervals[i];
            }
        }
    }
    // Enumerate all intervals in the tree (in ascending order)
    *ascending(){
        for(let node of this.nodesAscending()){
            for(let i = node.intervals.length - 1; i >= 0; i--){
                yield node.intervals[i];
            }
        }
    }
    // Enumerate all intervals in the tree (in descending order)
    *descending(){
        for(let node of this.nodesDescending()){
            // Note: for...of is about 40% as performant as of node v10.7.0
            // for(let interval of node.intervals) yield interval;
            for(let i = 0; i < node.intervals.length; i++){
                yield node.intervals[i];
            }
        }
    }
    // Enumerate intervals (in no particular order)
    [Symbol.iterator](){
        return this.intervals();
    }
}

// An IntervalTree contains IntervalTreeNodes
class IntervalTreeNode{
    static getIntervalsArray(valuesEqual){
        return new SortedArray(IntervalComparator, (
            (a, b) => a.high === b.high && valuesEqual(a.value, b.value)
        ));
    }
    constructor(valuesEqual, low, high, parent, color){
        this.valuesEqual = valuesEqual;
        this.intervals = IntervalTreeNode.getIntervalsArray(valuesEqual);
        // The color of the node, for balancing
        this.color = color;
        // The interval bounds for this node
        this.low = low;
        this.high = high;
        // The interval bounds for this entire subtree
        this.minimumLow = low;
        this.maximumLow = low;
        this.minimumHigh = high;
        this.maximumHigh = high;
        // The node's parent and children
        this.parent = parent;
        this.left = null;
        this.right = null;
    }
    
    // Add a new interval to the node.
    // Typically a boundary limit correcting method needs to be called after
    // this one, like insertUpdateLimits (for newly-added nodes) or
    // addIntervalUpdateLimits (when adding to existing nodes).
    addInterval(low, high, value){
        const interval = new Interval(low, high, value);
        this.intervals.insert(interval);
        if(interval.high < this.minimumHigh) this.minimumHigh = interval.high;
        if(interval.high > this.maximumHigh) this.maximumHigh = interval.high;
        if(interval.high > this.high) this.high = interval.high;
    }
    // Remove an interval from the node. Returns the interval
    // if one was removed, or null if there was no matching interval.
    // The caller should check if this was the last interval and,
    // if it was, should then remove the node from the tree entirely.
    removeInterval(low, high, value){
        const interval = new Interval(low, high, value);
        const index = this.intervals.indexOf(interval);
        if(index < 0) return null;
        const removedInterval = this.intervals.splice(index, 1)[0];
        if(this.intervals.length &&
            (index === 0 || index === this.intervals.length)
        ){
            this.high = this.intervals[0].high;
            this.removeUpdateLimits();
        }
        return removedInterval;
    }
    // Remove all matching intervals from the node.
    // Returns an array of the removed intervals.
    // The caller should check if there are no remaining intervals and,
    // if not, should then remove the node from the tree entirely.
    removeAllIntervals(low, high, value){
        const interval = new Interval(low, high, value);
        const removedIntervals = this.intervals.removeAll(interval);
        // TODO: This should not have to be done in every case
        if(removedIntervals.length && this.intervals.length){
            this.removeUpdateLimits();
        }
        return removedIntervals;
    }
    // Get whether the node contains a matching interval
    // Assumes that the interval low bound is already known to match this node.
    contains(low, high, value){
        const interval = new Interval(low, high, value);
        const index = this.intervals.indexOf(interval);
        return index < 0 ? null : this.intervals[index];
    }
    // Get all matching intervals
    // Assumes that the interval low bound is already known to match this node.
    getContainedIntervals(low, high, value){
        const interval = new Interval(low, high, value);
        return this.intervals.getEqualValues(interval);
    }
    
    // Get the parent's opposite child node.
    getSibling(){
        if(!this.parent) return null;
        if(this === this.parent.left) return this.parent.right;
        else return this.parent.left;
    }
    // Get the leftmost node in the subtree
    // for which this node is the root.
    getLeftmostChild(){
        let node = this;
        while(node.left) node = node.left;
        return node;
    }
    // Get the rightmost node in the subtree
    // for which this node is the root.
    getRightmostChild(){
        let node = this;
        while(node.right) node = node.right;
        return node;
    }
    // Get the next node in the sort order.
    getSuccessor(){
        if(this.right) return this.right.getLeftmostChild();
        let node = this;
        while(node){
            if(node.parent && node === node.parent.left) return node.parent;
            node = node.parent;
        }
    }
    // Get the next node in the sort order.
    getPredecessor(){
        if(this.left) return this.left.getRightmostChild();
        let node = this;
        while(node){
            if(node.parent && node === node.parent.right) return node.parent;
            node = node.parent;
        }
    }
    // Remove the parent node's reference to this one as a child node.
    makeOrphan(){
        if(!this.parent) return;
        if(this === this.parent.left) this.parent.left = null;
        else this.parent.right = null;
    }
    
    // Compute the height of this subtree. Requires a complete traversal.
    // A node with no children has a subtree height of 0.
    getHeight(){
        let maxHeight = 0;
        const stack = [{node: this, height: 0}];
        while(stack.length){
            const next = stack.pop();
            if(next.height > maxHeight){
                maxHeight = next.height;
            }
            if(next.node.left){
                stack.push({node: next.node.left, height: next.height + 1});
            }
            if(next.node.right){
                stack.push({node: next.node.right, height: next.height + 1});
            }
        }
        return maxHeight;
    }
    // Get the number of intervals in the subtree.
    getIntervalCount(){
        let intervalCount = 0;
        const stack = [this];
        while(stack.length){
            const node = stack.pop();
            if(node.left) stack.push(node.left);
            if(node.right) stack.push(node.right);
            intervalCount += node.intervals.length;
        }
        return intervalCount;
    }
    
    // Add a child on the left side.
    addLeftChild(tree, low, high, value){
        this.left = new IntervalTreeNode(
            this.valuesEqual, low, high, this, Red
        );
        this.left.addInterval(low, high, value);
        this.left.insertUpdateLimits();
        this.left.insertionFix(tree);
        return this.left;
    }
    // Add a child on the right side.
    addRightChild(tree, low, high, value){
        this.right = new IntervalTreeNode(
            this.valuesEqual, low, high, this, Red
        );
        this.right.addInterval(low, high, value);
        this.right.insertUpdateLimits();
        this.right.insertionFix(tree);
        return this.right;
    }
    // Ensure that the tree retains valid red-black structure following
    // the insertion of a new node.
    insertionFix(tree, child){
        let node = this;
        // While node and parent are both Red
        while(node.color === Red && node.parent.color === Red){
            const parent = node.parent;
            const uncle = parent.getSibling();
            if(uncle && uncle.color === Red){ // Parent's sibling is Red
                uncle.color = Black;
                parent.color = Black;
                parent.parent.color = Red;
                node = parent.parent;
            }else{
                if((parent.left === node) !== (parent.parent.left === parent)){
                    node.rotate(tree);
                    node.rotate(tree);
                }else{
                    parent.rotate(tree);
                    node = parent;
                }
            }
            if(!node.parent){
                break;
            }
        }
        if(!node.parent){
            node.color = Black;
        }
    }
    
    // Get the node containing a given interval, if any exists.
    getNodeWithInterval(low, high, value){
        let node = this;
        while(node){
            if(low < node.low){
                if(!node.left) return null;
                node = node.left;
            }else if(low > node.low){
                if(!node.right) return null;
                node = node.right;
            }else{
                return node;
            }
        }
        return null;
    }
    // Delete this node from the tree.
    // This method may swap information with another node (the successor)
    // and delete that node instead of this one.
    remove(tree){
        let replaceWith;
        if(this.left && this.right){
            const next = this.right.getLeftmostChild();
            this.low = next.low;
            this.high = next.high;
            this.intervals = next.intervals;
            this.removeUpdateLimits();
            next.handleRemoval(tree); 
        }else{
            this.handleRemoval(tree);
        }
    }
    // Delete a node with one child or no children from the tree.
    // This helper is called by the `remove` method.
    handleRemoval(tree){
        // Get the one child node, if there is one.
        const child = this.left || this.right;
        // Handle the case where this node is the root
        if(!this.parent){
            tree.root = child;
            if(child){
                child.parent = null;
                child.color = Black;
            }
        // Delete a red node (which by implication has no children)
        }else if(this.color === Red){
            this.makeOrphan();
        // Delete a black node with a red child
        }else if(child && child.color === Red){
            this.intervals = child.intervals;
            this.low = child.low;
            this.high = child.high;
            this.minimumLow = child.minimumLow;
            this.maximumLow = child.maximumLow;
            this.minimumHigh = child.minimumHigh;
            this.maximumHigh = child.maximumHigh;
            this.left = child.left;
            this.right = child.right;
        // Delete a black node with a black child
        // Note: This case should not actually be reachable?
        }else if(child){
            this.swapWithChild(child);
            child.removalFix(tree);
            this.makeOrphan();
        // Delete a black node with no children
        }else{
            this.removalFix(tree);
            this.makeOrphan();
        }
        // Update interval information
        if(this.parent){
            this.parent.removeUpdateLimits();
            // Note: A reference implementation used this behavior instead.
            // This change did not cause issues during extensive testing.
            // Still, if bugs occur, it may be because of this change.
            // this.parent.immediateUpdateLimits();
            // if(this.parent.parent) this.parent.parent.removeUpdateLimits();
        }
    }
    // Ensure that the tree retains valid red-black structure following
    // the removal of a node that may have disrupted the structure.
    removalFix(tree){
        let node = this;
        while(node.color === Black && node.parent){
            let sibling = node.getSibling();
            if(sibling.color === Red){
                sibling.rotate(tree);
                sibling = node.getSibling();
            }
            if(
                (!sibling.left || sibling.left.color === Black) &&
                (!sibling.right || sibling.right.color === Black)
            ){
                sibling.color = Red;
                node = node.parent;
            }else{
                if(sibling === sibling.parent.left && (
                    !sibling.left || sibling.left.color === Black
                )){
                    sibling = sibling.rotateLeft(tree);
                }else if(sibling === sibling.parent.right && (
                    !sibling.right || sibling.right.color === Black
                )){
                    sibling = sibling.rotateRight(tree);
                }
                sibling.rotate(tree);
                node = node.parent.getSibling();
            }
        }
        node.color = Black;
    }
    
    // Rotate right if this is the left child of the parent, or rotate
    // left if this is the right child.
    rotate(tree){
        if(this === this.parent.left){
            this.parent.rotateRight(tree);
        }else{
            this.parent.rotateLeft(tree);
        }
    }
    // Effectively switch places for this node and its right child.
    rotateLeft(tree){
        const child = this.right;
        this.swapWithChild(tree, child);
        this.parent = child;
        this.right = child.left;
        if(child.left) child.left.parent = this;
        child.left = this;
        this.rotateCommon(child);
        return child;
    }
    // Effectively switch places for this node and its left child.
    rotateRight(tree){
        const child = this.left;
        this.swapWithChild(tree, child);
        this.parent = child;
        this.left = child.right;
        if(child.right) child.right.parent = this;
        child.right = this;
        this.rotateCommon(child);
        return child;
    }
    // Helper used by rotateLeft and rotateRight operations.
    rotateCommon(child){
        const swapColor = this.color;
        this.color = child.color;
        child.color = swapColor;
        this.immediateUpdateLimits();
        if(child.minimumLow > this.minimumLow){
            child.minimumLow = this.minimumLow;
        }
        if(child.maximumLow < this.maximumLow){
            child.maximumLow = this.maximumLow;
        }
        if(child.minimumHigh > this.minimumHigh){
            child.minimumHigh = this.minimumHigh;
        }
        if(child.maximumHigh < this.maximumHigh){
            child.maximumHigh = this.maximumHigh;
        }
    }
    // Make a child node become the child of this node's parent, instead.
    // This is one part of a rotation operation.
    swapWithChild(tree, child){
        if(child) child.parent = this.parent;
        if(!this.parent){
            tree.root = child;
        }else if(this === this.parent.left){
            this.parent.left = child;
        }else{
            this.parent.right = child;
        }
    }
    
    // Update minimumLow and maximumHigh interval bounds after inserting this node.
    // Propagates updates up to parents when needed.
    insertUpdateLimits(){
        let node = this;
        let changed = true;
        while(node.parent && changed){
            changed = false;
            if(node.parent.minimumLow > this.minimumLow){
                node.parent.minimumLow = this.minimumLow;
                changed = true;
            }
            if(node.parent.maximumLow < this.maximumLow){
                node.parent.maximumLow = this.maximumLow;
                changed = true;
            }
            if(node.parent.minimumHigh > this.minimumHigh){
                node.parent.minimumHigh = this.minimumHigh;
                changed = true;
            }
            if(node.parent.maximumHigh < this.maximumHigh){
                node.parent.maximumHigh = this.maximumHigh;
                changed = true;
            }
            node = node.parent;
        }
    }
    // Update maximumHigh interval bounds after adding a new interval to this node.
    // Propagates updates up to parents when needed.
    addIntervalUpdateLimits(){
        let node = this.parent;
        let changed = true;
        while(node && changed){
            changed = false;
            if(node.minimumHigh > this.minimumHigh){
                node.minimumHigh = this.minimumHigh;
                changed = true;
            }
            if(node.maximumHigh < this.maximumHigh){
                node.maximumHigh = this.maximumHigh;
                changed = true;
            }
            node = node.parent;
        }
    }
    // Update minimumLow and maximumHigh interval bounds after replacing a removed
    // node with this node. Propagates updates up to parents when needed.
    removeUpdateLimits(){
        let node = this;
        while(node){
            // TODO: Under what conditions can this exit without continuing
            // to traverse the rest of the nodes to the root?
            node.immediateUpdateLimits();
            node = node.parent;
        }
    }
    // Helper to determine minimumLow and maximumHigh interval bounds for the
    // entire subtree based on the information in this node and its
    // immediate children.
    immediateUpdateLimits(){
        // Since nodes are in ascending order of length left-to-right,
        // computing the extreme low interval bounds is straightforward.
        this.minimumLow = this.left ? this.left.minimumLow : this.low;
        this.maximumLow = this.right ? this.right.maximumLow : this.low;
        // Maximum interval bounds are effectively:
        // max|min(high bound for this, for left child, for right child)
        this.minimumHigh = this.intervals[this.intervals.length - 1].high;
        this.maximumHigh = this.high; // Should always equal intervals[0].high
        if(this.left){
            if(this.left.minimumHigh < this.minimumHigh){
                this.minimumHigh = this.left.minimumHigh;
            }
            if(this.left.maximumHigh > this.maximumHigh){
                this.maximumHigh = this.left.maximumHigh;
            }
        }
        if(this.right){
            if(this.right.minimumHigh < this.minimumHigh){
                this.minimumHigh = this.right.minimumHigh;
            }
            if(this.right.maximumHigh > this.maximumHigh){
                this.maximumHigh = this.right.maximumHigh;
            }
        }
    }
    
    // Extremely useful stringification tools for debugging
    // Get a string representation of this subtree to log to a CLI
    // toDebugString(indent, label){
    //     indent = indent || "";
    //     label = label || "ROOT";
    //     const istr = i => `\x1b[90m[${i.low}, ${i.high}]:\x1b[39m ${i.value}`
    //     let str = (indent + label + ":: " +
    //         `\x1b[92m${this.low}\x1b[39m ` +
    //         "\x1b[" + (this.color ? "91mRED" : "94mBLK") + "\x1b[39m : " +
    //         `(${this.intervals.map(istr).join(", ")}) ` +
    //         `\x1b[90mp.\x1b[92m${this.parent && this.parent.low}\x1b[39m ` +
    //         `[${this.minimumLow},${this.maximumLow}..${this.minimumHigh},${this.maximumHigh}]`
    //     );
    //     if(this.left) str += "\n" + this.left.toDebugString(indent + "  ", "L");
    //     if(this.right) str += "\n" + this.right.toDebugString(indent + "  ", "R");
    //     return str;
    // }
    // Log a subtree string representation to a chrome DevTools console
    // log(){
    //     for(let l of this.toDebugString().split("\n")){
    //         const p = require("ansicolor").parse(l);
    //         console.log(...p.asChromeConsoleLogArguments);
    //     }
    // }
}

// An IntervalTreeNode contains Intervals
class Interval{
    constructor(low, high, value){
        this.low = low;
        this.high = high;
        this.value = value;
    }
}

IntervalTree.Interval = Interval;
IntervalTree.Node = IntervalTreeNode;
IntervalTreeNode.Red = Red;
IntervalTreeNode.Black = Black;
IntervalTreeNode.IntervalComparator = IntervalComparator;

module.exports = IntervalTree;
