type Maybe<T> = T | undefined;
type IndexType = string | number | symbol;
declare const newproxy: <T extends symbol = symbol>(addMetatable: boolean) => T;

/** Create a unique symbol */
function createSymbol<T extends symbol = symbol>(name: string): T {
  const symbol = newproxy<T>(true);
  const mt = getmetatable(symbol as never) as Record<string, unknown>;
  mt.__tostring = () => name;
  return symbol;
}

type SkipSymbol = symbol & {
  readonly __skip?: void;
};

function keys<K extends IndexType>(object: Record<K, unknown> | Map<K, unknown>): () => K | SkipSymbol {
  let k: K;

  return () => {
    [k] = next(object as Record<K, unknown>, k);
    return k;
  };
}

function keysOfSet<V>(set: Set<V>): () => V | SkipSymbol {
  let v: V;
  let d: boolean | undefined;
  let ended = false;

  return () => {
    [v, d] = next(set, v);
    if (ended) return undefined!;
    if (d === undefined)
      ended = true;

    return v;
  };
}

function values<V = unknown>(object: ReadonlyMap<IndexType, V> | V[] | object): () => V | SkipSymbol {
  let k: IndexType;
  let v: V;

  return () => {
    [k, v] = next(object as Record<IndexType, V>, k);
    if (v === undefined)
      return LazyIterator.Skip;

    return v;
  };
}

/** Combines multiple array operations into an iterator and only applies operations when the iterator is processed */
export default class LazyIterator<T extends defined> {
  /** Symbol used to represent a value to remove in an iterator */
  public static readonly Skip = createSymbol<SkipSymbol>("LazyIterator.Skip");

  private finished = false;

  public constructor(
    private nextItem: () => T | SkipSymbol
  ) { }

  /** Creates an iterator from the keys of a record/map */
  public static fromKeys<K extends IndexType>(object: Record<K, unknown>): LazyIterator<K>;
  public static fromKeys<K extends IndexType>(object: ReadonlyMap<K, unknown>): LazyIterator<K>;
  public static fromKeys<T extends object>(object: T): LazyIterator<keyof T & IndexType> {
    return new LazyIterator(keys(object)) as never;
  }

  /** Creates an iterator from the values of a record/map */
  public static fromValues<V>(object: Record<IndexType, V>): LazyIterator<NonNullable<V>>;
  public static fromValues<V>(object: ReadonlyMap<IndexType, V>): LazyIterator<NonNullable<V>>;
  public static fromValues<T>(object: ReadonlySet<T>): LazyIterator<true>;
  public static fromValues<T extends object>(object: T): keyof T extends never ? LazyIterator<defined> : LazyIterator<NonNullable<T[keyof T]>> {
    return new LazyIterator(values(object)) as never;
  }

  /** Creates an iterator from an array */
  public static fromArray<T extends defined>(array: T[]): LazyIterator<T> {
    return new LazyIterator(values(array));
  }

  /** Creates an iterator from a set */
  public static fromSet<T extends defined>(set: Set<T>): LazyIterator<T> {
    return new LazyIterator(keysOfSet(set));
  }

  public getIterator(): () => T | SkipSymbol | undefined {
    return this.clone().nextItem;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public equals(other: LazyIterator<T>): boolean {
    return this.every((item, i) => item === other.clone().at(i));
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public indexOf(value: T): number {
    let currentIndex = 0;
    while (!this.finished) {
      const currentValue = this.nextItem();
      if (currentValue === undefined) break;
      if (currentValue === LazyIterator.Skip) continue;
      if (currentValue === value)
        return currentIndex;

      currentIndex++;
    }

    return -1;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public first(): Maybe<T> {
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      return value as T;
    }
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public last(): Maybe<T> {
    let lastValue: Maybe<T>;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      lastValue = value as T;
    }

    return lastValue;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public at(index: number): Maybe<T> {
    if (index < 0) return;

    let currentIndex = 0;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      if (currentIndex++ !== index) continue;
      return value as T;
    }
  }

  public append(...elements: T[]): LazyIterator<T>
  public append(iterator: LazyIterator<T>): LazyIterator<T>
  public append(iterator: LazyIterator<T> | T, ...elements: T[]): LazyIterator<T> {
    const passedIterator = iterator instanceof LazyIterator;
    const iteratorNext = passedIterator ? iterator.getIterator() : undefined;
    const oldNext = this.nextItem;
    let exhausted = false;
    let i = 0;

    this.nextItem = () => {
      if (exhausted) return undefined!;

      const value = oldNext();
      if (value !== undefined)
        return value;

      if (!passedIterator)
        exhausted = i === elements.size();

      return passedIterator
        ? iteratorNext!()!
        : (i++ === 0 ? iterator as T : elements[i - 2]);
    };

    return this;
  }

  public prepend(...elements: T[]): LazyIterator<T>
  public prepend(iterator: LazyIterator<T>): LazyIterator<T>
  public prepend(iterator: LazyIterator<T> | T, ...elements: T[]): LazyIterator<T> {
    const passedIterator = iterator instanceof LazyIterator;
    const iteratorNext = passedIterator ? iterator.getIterator() : undefined;
    const oldNext = this.nextItem;
    let prepended = false;
    let i = 0;

    this.nextItem = () => {
      if (!prepended) {
        if (!passedIterator)
          prepended = i === elements.size();

        const value = passedIterator
          ? iteratorNext!()!
          : (i++ === 0 ? iterator as T : elements[i - 2]);

        if (passedIterator && value === undefined) {
          prepended = true;
          return this.nextItem();
        }

        return value;
      }

      const value = passedIterator && i < elements.size() ? iteratorNext!() : undefined;
      if (value !== undefined)
        return value;

      return oldNext();
    };

    return this;
  }

  /** **Note:** This method clones the iterator and allocates a table into memory to sort */
  public sort(comparator?: (a: T, b: T) => boolean): LazyIterator<T> {
    const collectedItems = this.clone().collect();
    collectedItems.sort(comparator);
    return LazyIterator.fromArray(collectedItems);
  }

  public map<U extends defined>(transform: (value: T) => U | SkipSymbol): LazyIterator<U> {
    const oldNext = this.nextItem;
    this.nextItem = () => {
      while (true) {
        const value = oldNext();
        if (value === undefined) return undefined!;
        if (value === LazyIterator.Skip)
          return value;

        const transformed = transform(value as T);
        return transformed as T | SkipSymbol; // hack
      }
    };

    return this as never; // hack
  }

  public filter<S extends T>(predicate: (value: T) => value is S): LazyIterator<S>
  public filter(predicate: (value: T) => boolean): LazyIterator<T>
  public filter(predicate: (value: T) => boolean): LazyIterator<T> {
    const oldNext = this.nextItem;
    this.nextItem = () => {
      while (!this.finished) {
        const value = oldNext();
        if (value === undefined) return undefined!;
        if (value !== LazyIterator.Skip)
          return predicate(value as T) ? value : LazyIterator.Skip;
        else
          return LazyIterator.Skip;
      }

      return undefined!;
    };

    return this;
  }

  /**
   * **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this
   * @returns The first element that satisfies the predicate, or `undefined` if no such element exists
   */
  public find<S extends T>(predicate: (value: T) => value is S): Maybe<S>
  public find(predicate: (value: T) => boolean): Maybe<T>
  public find(predicate: (value: T) => boolean): Maybe<T> {
    return this.filter(predicate).first();
  }

  /**
   * **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this
   * @returns The last element that satisfies the predicate, or `undefined` if no such element exists
   */
  public findLast<S extends T>(predicate: (value: T) => value is S): Maybe<S>
  public findLast(predicate: (value: T) => boolean): Maybe<T>
  public findLast(predicate: (value: T) => boolean): Maybe<T> {
    return this.filter(predicate).last();
  }

  /**
   * Yields the first `amount` of elements in the iterator.
   * @param amount The amount of elements to take.
   */
  public take(amount: number): LazyIterator<T> {
    let count = 0;
    const oldNext = this.nextItem;
    this.nextItem = () => {
      const value = oldNext();
      if (value === LazyIterator.Skip) return value;
      return count++ >= amount ? undefined! : value;
    };

    return this;
  }

  /**
   * Skips the first `amount` of elements in the iterator.
   * @param amount The amount of elements to skip.
   */
  public skip(amount: number): LazyIterator<T> {
    let count = 0;
    const oldNext = this.nextItem;
    this.nextItem = () => {
      const value = oldNext();
      if (value === LazyIterator.Skip) return value;
      return count++ < amount ? LazyIterator.Skip : value;
    };

    return this;
  }

  /**
   * Reduces the iterator with the given reducer. The initial value is the first element of the iterator.
   *
   * **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this
   * @param reducer The reducer function.
   * @returns The final value of the accumulator, or `undefined` if the iterator is empty.
   */
  public reduce(reducer: (accumulation: T, value: T) => T): Maybe<T> {
    let accumulation: Maybe<T> = undefined;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      accumulation = accumulation === undefined
        ? value as T
        : reducer(accumulation, value as T);
    }

    return accumulation;
  }

  /**reducer(accumulation, value as T)
   * Reduces the iterator with the given reducer and initial value, and returns the final value of the accumulator.
   * This method is similar to `reduce`, but it takes an initial value that is used as the first value of the accumulator.
   *
   * **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this
   * @param reducer The reducer function to use to reduce the iterator.
   * @param initial The initial value of the accumulator.
   * @returns The final value of the accumulator.
   */
  public fold(reducer: (accumulation: T, value: T) => T, initial: T): T {
    let accumulation = initial;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      accumulation = reducer(accumulation, value as T);
    }

    return accumulation;
  }

  public includes(value: T): boolean {
    return this.some(v => v === value);
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public some(predicate: (value: T, index: number) => boolean): boolean {
    let index = 0;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip && predicate(value as T, index++))
        return true;
    }

    return false;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public every(predicate: (value: T, index: number) => boolean): boolean {
    let index = 0;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip && !predicate(value as T, index++))
        return false;
    }

    return true;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public join(separator = ", "): string {
    const result: string[] = [];

    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value === LazyIterator.Skip) continue;
      result.push(tostring(value));
    }

    return result.join(separator);
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public size(): number {
    let size = 0;
    this.collect(() => size++);
    return size;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public collect(): T[];
  public collect(process: (value: T) => void): void;
  public collect(process?: (value: T) => void): Maybe<T[]> {
    let results: Maybe<T[]>;
    if (process === undefined) // don't allocate a table if we're not adding anything to it
      results = [];

    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) {
        this.finished = true;
        break;
      }

      if (value !== LazyIterator.Skip)
        if (process !== undefined)
          process(value as T);
        else
          results!.push(value as T);
    }

    return process !== undefined ? undefined : results;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public collectIntoSet(): Set<T> {
    return new Set(this.collect());
  }

  /** @returns An identical iterator */
  public clone(): LazyIterator<T> {
    return new LazyIterator(this.nextItem);
  }

  /** @returns Whether or not the iterator has been processed */
  public isProcessed(): boolean {
    return this.finished;
  }
}