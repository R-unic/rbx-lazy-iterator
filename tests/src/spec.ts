import { Assert, Fact, Theory, InlineData } from "@rbxts/runit";
import LazyIterator from "../../src";

class LazyIteratorTest {
  @Theory
  @InlineData(LazyIterator.fromArray([1, 2, 3]))
  @InlineData(LazyIterator.fromArray([-1, 0, 1, 2, 3]).filter(n => n > 0))
  public first<T extends defined>(iterator: LazyIterator<T>): void {
    const value = iterator.first();
    Assert.equal(1, value);
  }

  @Theory
  @InlineData(LazyIterator.fromArray([1, 2, 3]))
  @InlineData(LazyIterator.fromArray([1, 2, 3, 0, -1, -2]).filter(n => n > 0))
  public last<T extends defined>(iterator: LazyIterator<T>): void {
    const value = iterator.last();
    Assert.equal(3, value);
  }

  @Theory
  @InlineData("1, 2, 3")
  @InlineData("123", "")
  @InlineData("1.2.3", ".")
  public join(result: string, separator?: string): void {
    const iterator = LazyIterator.fromArray([1, 2, 3]);
    Assert.equal(result, iterator.join(separator));
  }

  @Fact
  public filter(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
      .filter(n => n % 2 === 0)
      .toIterator();

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
      .toIterator();

    Assert.equal(2, getNext());
    Assert.equal(4, getNext());
    Assert.equal(6, getNext());
  }

  @Fact
  public skip(): void {
    const getNext = LazyIterator.fromArray([1, 2, 3, 4, 5, 6])
      .skip(3)
      .toIterator();

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
      .toIterator();

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
      .toIterator();

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
}

export = LazyIteratorTest;