"use strict";

class WitnessWebIterator {

    // create an iterator which is like a set of rotating wheels
    // if rotation is -1 then this does all the possible iterations
    // if rotation is not - 1 then this locks the first 'cog' in that position and iterates the remaining cogs.  This allows parallel processing based on the position of the first 'cog'
    constructor(pe, allCoveredTiles, rotation) {

        console.log("Creating Iterator");

        this.sample = [];  // int array

        this.location = [];  // list of locations

        this.cogs = []; // array of cogs
        this.squareOffset = [];  // int array
        this.mineOffset = [];   // int array

        this.iterationsDone = 0;

        this.top;
        this.bottom;

        this.done = false;

        this.probabilityEngine = pe;

        // if we are setting the position of the top cog then it can't ever change
        if (rotation == -1) {
            this.bottom = 0;
        } else {
            this.bottom = 1;
        }

        //cogs = new SequentialIterator[this.probabilityEngine..size() + 1];
        //squareOffset = new int[web.getIndependentWitnesses().size() + 1];
        //mineOffset = new int[web.getIndependentWitnesses().size() + 1];
 
        var loc = [];  // array of locations

        var indWitnesses = this.probabilityEngine.independentWitness;

        var cogi = 0;
        var indSquares = 0;
        var indMines = 0;

        // create an array of locations in the order of independent witnesses
        for (var i = 0; i < indWitnesses.length; i++) {

            var w = indWitnesses[i];

            this.squareOffset.push(indSquares);
            this.mineOffset.push(indMines);
            this.cogs.push(new SequentialIterator(w.minesToFind, w.tiles.length));
 
            indSquares = indSquares + w.tiles.length;
            indMines = indMines + w.minesToFind;

            loc.push(...w.tiles);

        }

        //System.out.println("Mines left = " + (mines - indMines));
        //System.out.println("Squrs left = " + (web.getSquares().length - indSquares));

        // the last cog has the remaining squares and mines

        //add the rest of the locations
        for (var i = 0; i < allCoveredTiles.length; i++) {

            var l = allCoveredTiles[i];

            var skip = false;
            for (var j = 0; j < loc.length; j++) {

                var m = loc[j];

                if (l.isEqual(m)) {
                    skip = true;
                    break;
                }
            }
            if (!skip) {
                loc.push(l);
            }
        }

        this.location = loc;

        console.log("Mines left " + this.probabilityEngine.minesLeft);
        console.log("Independent Mines " + indMines);
        console.log("Tiles left " + this.probabilityEngine.tilesLeft);
        console.log("Independent tiles " + indSquares);


        // if there are more mines left then squares then no solution is possible
        // if there are not enough mines to satisfy the minimum we know are needed
        if (this.probabilityEngine.minesLeft - indMines > this.probabilityEngine.tilesLeft - indSquares
            || indMines > this.probabilityEngine.minesLeft) {
            this.done = true;
            this.top = 0;
            console.log("Nothing to do in this iterator");
            return;
        }

        // if there are no mines left then no need for a cog
        if (this.probabilityEngine.minesLeft > indMines) {
            this.squareOffset.push(indSquares);
            this.mineOffset.push(indMines);
            this.cogs.push(new SequentialIterator(this.probabilityEngine.minesLeft - indMines, this.probabilityEngine.tilesLeft - indSquares));
        }

        this.top = this.cogs.length - 1;

        this.sample = new Array(this.probabilityEngine.minesLeft);  // make the sample array the size of the number of mines

        // if we are locking and rotating the top cog then do it
        //if (rotation != -1) {
        //    for (var i = 0; i < rotation; i++) {
        //        this.cogs[0].getSample(0);
        //    }
        //}

        // now set up the initial sample position
        for (var i = 0; i < this.top; i++) {
            var s = this.cogs[i].getNextSample();
            for (var j = 0; j < s.length; j++) {
                this.sample[this.mineOffset[i] + j] = this.squareOffset[i] + s[j];
            }
        }




        //for (var i=0; i < this.sample.length; i++) {
        //   Console.log(sample[i] + " ");
        //}

    }


    getSample() {


        if (this.done) {
            console.log("**** attempting to iterator when already completed ****");
            return null;
        }
        var index = this.top;

        var s = this.cogs[index].getNextSample();

        while (s == null && index != this.bottom) {
            index--;
            s = this.cogs[index].getNextSample();
        }

        if (index == this.bottom && s == null) {
            this.done = true;
            return null;
        }

        for (var j = 0; j < s.length; j++) {
            this.sample[this.mineOffset[index] + j] = this.squareOffset[index] + s[j];
        }
        index++;
        while (index <= this.top) {
            this.cogs[index] = new SequentialIterator(this.cogs[index].numberBalls, this.cogs[index].numberHoles);
            s = this.cogs[index].getNextSample();
            for (var j = 0; j < s.length; j++) {
                this.sample[this.mineOffset[index] + j] = this.squareOffset[index] + s[j];
            }
            index++;
        }

        /*
        for (int i: sample) {
            System.out.print(i + " ");
        }
        System.out.println();
        */

        console.log(...this.sample);

        this.iterationsDone++;

        return this.sample;

        //return Arrays.copyOf(sample, sample.length);

        //}

    }

    getLocations() {
        return location;
    }

    getIterations() {
        return iterationsDone;
    }

    // if the location is a Independent witness then we know it will always
    // have exactly the correct amount of mines around it since that is what
    // this iterator does
    witnessAlwaysSatisfied(location) {

        for (var i = 0; i < this.probabilityEngine.independentWitness.length; i++) {
            if (this.probabilityEngine.independentWitness[i].equals(location)) {
                return true;
            }
        }

        return false;

    }

}


class SequentialIterator {


    // a sequential iterator that puts n-balls in m-holes once in each possible way
    constructor (n, m) {

        this.numberHoles = m;
        this.numberBalls = n;

        this.sample = [];  // integer

        this.more = true;

        this.index = n - 1;

        for (var i = 0; i < n; i++) {
            this.sample.push(i);
        }

        // reduce the iterator by 1, since the first getSample() will increase it
        // by 1 again
        this.sample[this.index]--;

        console.log("Sequential Iterator has " + this.numberBalls + " mines and " + this.numberHoles + " squares");

    }

    getNextSample() {

        if (!this.more) {
            console.log("****  Trying to iterate after the end ****");
            return null;
        }

        this.index = this.numberBalls - 1;

        // add on one to the iterator
        this.sample[this.index]++;

        // if we have rolled off the end then move backwards until we can fit
        // the next iteration
        while (this.sample[this.index] >= this.numberHoles - this.numberBalls + 1 + this.index) {
            if (this.index == 0) {
                this.more = false;
                return null;
            } else {
                this.index--;
                this.sample[this.index]++;
            }
        }

        // roll forward 
        while (this.index != this.numberBalls - 1) {
            this.index++;
            this.sample[this.index] = this.sample[this.index - 1] + 1;
        }

        return this.sample;

    }

}