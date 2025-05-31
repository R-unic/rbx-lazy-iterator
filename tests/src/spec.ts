import { Assert, Fact, Theory, InlineData } from "@rbxts/runit";
import LazyIterator from "../../src";

class LazyIteratorTest {
  @Theory
  @InlineData(LazyIterator.fromArray([1, 2, 3]))
  @InlineData(LazyIterator.fromArray([-1, 0, 1, 2, 3]).filter(n => n > 0))
  public first<T extends defined>(iterator: LazyIterator<T>): void {
    Assert.equal(1, iterator.first());
  }

  @Theory
  @InlineData(LazyIterator.fromArray([1, 2, 3]))
  @InlineData(LazyIterator.fromArray([1, 2, 3, 0, -1, -2]).filter(n => n > 0))
  public last<T extends defined>(iterator: LazyIterator<T>): void {
    Assert.equal(3, iterator.last());
  }

  @Theory
  @InlineData("a", 0)
  @InlineData("b", 1)
  @InlineData("c", 2)
  @InlineData("d", -1)
  public indexOf(value: string, expectedIndex: number): void {
    const index = LazyIterator.fromArray(["a", "b", "c"]).indexOf(value);
    Assert.equal(expectedIndex, index);
  }

  @Theory
  @InlineData(-1, undefined)
  @InlineData(0, 1)
  @InlineData(1, 2)
  @InlineData(2, 3)
  @InlineData(3, 4)
  @InlineData(4, 5)
  @InlineData(5, 6)
  @InlineData(6, undefined)
  public at(index: number, expectedValue: number | undefined): void {
    const value = LazyIterator.fromArray([1, 2, 3, 4, 5, 6]).at(index);
    Assert.equal(expectedValue, value);
  }

  @Theory
  @InlineData("1, 2, 3")
  @InlineData("123", "")
  @InlineData("1.2.3", ".")
  public join(result: string, separator?: string): void {
    const iterator = LazyIterator.fromArray([1, 2, 3]);
    Assert.equal(result, iterator.join(separator));
  }

  @Theory
  @InlineData([1, 2, 3], false)
  @InlineData([1, 2, 3, 4], false)
  @InlineData([4, 5, 6], true)
  public every(set: number[], shouldMatch: boolean): void {
    const matches = LazyIterator.fromArray(set).every(n => n > 3);
    Assert.equal(shouldMatch, matches);
  }

  @Theory
  @InlineData([1, 2, 3], false)
  @InlineData([1, 2, 3, 4], true)
  public some(set: number[], shouldMatch: boolean): void {
    const matches = LazyIterator.fromArray(set).some(n => n > 3);
    Assert.equal(shouldMatch, matches);
  }

  @Fact
  public includes(): void {
    const iterator = LazyIterator.fromArray([1, 2, 3, 4]);
    Assert.true(iterator.clone().includes(3));
    Assert.false(iterator.includes(5));
  }

  @Fact
  public clone(): void {
    const iterator = LazyIterator.fromArray([1, 2, 3, 4]);
    const clonedIterator = iterator.clone();
    Assert.false(iterator.isProcessed());
    Assert.false(clonedIterator.isProcessed());
    clonedIterator.size();
    Assert.false(iterator.isProcessed());
    Assert.true(clonedIterator.isProcessed());
  }

  @Fact
  public isProcessed(): void {
    const iterator = LazyIterator.fromArray([1, 2, 3, 4]);
    Assert.false(iterator.isProcessed());
    iterator.size();
    Assert.true(iterator.isProcessed());
  }

  @Fact
  public reduce(): void {
    const value = LazyIterator.fromArray([1, 2, 3, 4]).reduce((sum, n) => sum + n);
    Assert.equal(10, value);
  }

  @Fact
  public fold(): void {
    const value = LazyIterator.fromArray([1, 2, 3, 4]).fold((sum, n) => sum + n, 5);
    Assert.equal(15, value);
  }

  @Fact
  public find(): void {
    const value = LazyIterator.fromArray([1, 2, 3, 4, 5, 6]).find(n => n > 3);
    Assert.equal(4, value);
  }

  @Fact
  public findLast(): void {
    const value = LazyIterator.fromTuple(1, 2, 3, 4, 5, 6).findLast(n => n > 3);
    Assert.equal(6, value);
  }

  @Fact
  public appendIterator(): void {
    const getNext = LazyIterator.fromTuple(1, 2, 3)
      .append(LazyIterator.fromTuple(4, 5, 6))
      .getIterator();

    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.equal(5, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public appendValues(): void {
    const getNext = LazyIterator.fromTuple(1, 2, 3)
      .append(4, 5, 6)
      .getIterator();

    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.equal(5, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public prependIterator(): void {
    const getNext = LazyIterator.fromArray([4, 5, 6])
      .prepend(LazyIterator.fromArray([1, 2, 3]))
      .getIterator();

    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.equal(5, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public prependValues(): void {
    const getNext = LazyIterator.fromArray([4, 5, 6])
      .prepend(1, 2, 3)
      .getIterator();

    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.equal(5, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public filter(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
      .filter(n => n % 2 === 0)
      .getIterator();

    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(2, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(4, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public map(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3])
      .map(n => n * 2)
      .getIterator();

    Assert.equal(2, getNext());
    Assert.equal(4, getNext());
    Assert.equal(6, getNext());
  }

  @Fact
  public skip(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
      .skip(3)
      .getIterator();

    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(4, getNext());
    Assert.equal(5, getNext());
    Assert.equal(6, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public take(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
      .take(3)
      .getIterator();

    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext()); // terminates iterator - so no Skip symbol
    Assert.undefined(getNext());
  }

  @Fact
  public size(): void {
    const iterator = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
    Assert.equal(6, iterator.size());
  }

  @Fact
  public chainedMethods(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
      .filter(n => n % 2 === 0) // 2, 4, 6, 8, 10
      .map(n => n * 2) // 4, 8, 12, 16, 20
      .skip(2) // 12, 16, 20
      .take(2) // 12, 16
      .getIterator();

    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(12, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.equal(16, getNext());
    Assert.equal(LazyIterator.Skip, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public collectIntoSet(): void {
    const [first, second, third, fourth] = LazyIterator.fromArray([1, 2, 3]).collectIntoSet();
    Assert.equal(1, first);
    Assert.equal(2, second);
    Assert.equal(3, third);
    Assert.undefined(fourth);
  }

  @Fact
  public collectIntoArray(): void {
    const [first, second, third, fourth] = LazyIterator.fromArray([1, 2, 3]).collect();
    Assert.equal(1, first);
    Assert.equal(2, second);
    Assert.equal(3, third);
    Assert.undefined(fourth);
  }

  @Fact
  public collectWithProcessor(): void {
    let i = 1;
    LazyIterator.fromArray([1, 2, 3])
      .collect(value => Assert.equal(i++, value));
  }

  @Fact
  public fromKeys(): void {
    const getNext = LazyIterator.fromKeys({ a: 1, b: 2, c: 3, d: 4 }).sort().getIterator();
    Assert.equal("a", getNext());
    Assert.equal("b", getNext());
    Assert.equal("c", getNext());
    Assert.equal("d", getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public fromValues(): void {
    const getNext = LazyIterator.fromValues({ a: 1, b: 2, c: 3, d: 4 }).sort().getIterator();
    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public fromSet(): void {
    const getNext = LazyIterator.fromSet(new Set([1, 2, 3, 4])).getIterator();
    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.undefined(getNext());
  }

  @Fact
  public fromArray(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4]).getIterator();
    Assert.equal(1, getNext());
    Assert.equal(2, getNext());
    Assert.equal(3, getNext());
    Assert.equal(4, getNext());
    Assert.undefined(getNext());
  }
}

export = LazyIteratorTest;