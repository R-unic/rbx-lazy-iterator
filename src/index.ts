type Maybe<T> = T | undefined;
declare const newproxy: <T extends symbol = symbol>(addMetatable: boolean) => T;

/** Create a unique symbol */
function createSymbol<T extends symbol = symbol>(name: string): T {
  const symbol = newproxy<T>(true);
  const mt = <Record<string, unknown>>getmetatable(<never>symbol);
  mt.__tostring = () => name;
  return symbol;
}

type SkipSymbol = symbol & {
  readonly __skip?: undefined;
};

function keys<K extends string | number | symbol = string | number | symbol>(object: Record<K, unknown> | Map<K, unknown>) {
  let k: K;

  return () => {
    [k] = next(<Record<K, unknown>>object, k);
    return k;
  };
}

function keysOfSet<V>(set: Set<V>) {
  let v: V;

  return () => {
    [v] = next(set, v);
    return v;
  };
}

function values<V = unknown>(object: Record<string | number | symbol, V> | Map<string | number | symbol, V> | V[]) {
  let k: string | number | symbol;
  let v: V;

  return () => {
    [k, v] = next(<Record<string | number | symbol, V>>object, k);
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
  public static fromKeys<K extends string | number | symbol>(object: Record<K, unknown> | Map<K, unknown>): LazyIterator<K> {
    return new LazyIterator(keys(object));
  }

  /** Creates an iterator from the values of a record/map */
  public static fromValues<V extends defined>(object: Record<string | number | symbol, V> | Map<string | number | symbol, V>): LazyIterator<V> {
    return new LazyIterator(values(object));
  }

  /** Creates an iterator from an array */
  public static fromArray<T extends defined>(array: T[]): LazyIterator<T> {
    return new LazyIterator(values(array));
  }

  /** Creates an iterator from a set */
  public static fromSet<T extends defined>(set: Set<T>): LazyIterator<T> {
    return new LazyIterator(keysOfSet(set));
  }

  public toIterator(): () => T | SkipSymbol | undefined {
    return this.nextItem;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public equals(other: LazyIterator<T>): boolean {
    return this.every((item, i) => item === other.clone().at(i))
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public indexOf(value: T): number {
    let currentIndex = 0;
    while (!this.finished) {
      const currentValue = this.nextItem();
      if (currentValue === undefined) break;
      if (currentValue !== LazyIterator.Skip) {
        if (currentValue === value)
          return currentIndex;

        currentIndex++;
      }
    }

    return -1;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public first(): Maybe<T> {
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip)
        return <T>value;
    }
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public last(): Maybe<T> {
    let lastValue: Maybe<T> = undefined;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break
      if (value !== LazyIterator.Skip)
        lastValue = <T>value;
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
      if (value !== LazyIterator.Skip)
        if (currentIndex++ === index)
          return <T>value;
    }
  }

  public append(element: T): LazyIterator<T> {
    const oldNext = this.nextItem;
    let exhausted = false;

    this.nextItem = () => {
      if (exhausted) return undefined!;

      const value = oldNext();
      if (value === undefined) {
        exhausted = true;
        return element;
      }

      return value;
    };

    return this;
  }

  public prepend(element: T): LazyIterator<T> {
    const oldNext = this.nextItem;
    let yielded = false;

    this.nextItem = () => {
      if (!yielded) {
        yielded = true;
        return element;
      }

      return oldNext();
    };

    return this;
  }

  /** **Note:** This method clones the iterator and allocates a table into memory to sort */
  public sort(comparator: (a: T, b: T) => boolean): LazyIterator<T> {
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

        if (value !== LazyIterator.Skip) {
          const transformed = transform(<T>value);
          if (transformed !== LazyIterator.Skip)
            return <never>transformed; // hack
        } else
          return LazyIterator.Skip;
      }
    };

    return <never>this; // hack
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
          return predicate(<T>value) ? value : LazyIterator.Skip;
        else
          return LazyIterator.Skip;
      }

      return undefined!;
    };

    return this;
  }

  public find<S extends T>(predicate: (value: T) => value is S): Maybe<S>
  public find(predicate: (value: T) => boolean): Maybe<T>
  public find(predicate: (value: T) => boolean): Maybe<T> {
    return this.filter(predicate).first();
  }

  public take(amount: number): LazyIterator<T> {
    let index = 0;
    const oldNext = this.nextItem;
    this.nextItem = () => {
      if (index >= amount) {
        this.finished = true;
        return undefined!;
      }

      while (true) {
        const value = oldNext();
        if (value === LazyIterator.Skip) continue;
        if (value === undefined) return undefined!;

        index++;
        return value;
      }
    };

    return this;
  }

  public skip(amount: number): LazyIterator<T> {
    let index = 0;
    const oldNext = this.nextItem;
    this.nextItem = () => {
      if (index < amount) {
        const value = oldNext();
        if (value === LazyIterator.Skip) return value;
        index++;
      }

      return oldNext();
    };

    return this;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public reduce(reducer: (accumulation: T, value: T) => T): Maybe<T> {
    let accumulation: Maybe<T> = undefined;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip) {
        if (accumulation === undefined)
          accumulation = <T>value
        else
          accumulation = reducer(accumulation, <T>value);
      }
    }

    return accumulation;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public fold(reducer: (accumulation: T, value: T) => T, initial: T): Maybe<T> {
    let accumulation = initial;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip)
        accumulation = reducer(accumulation, <T>value);
    }

    return accumulation;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public some(predicate: (value: T, index: number) => boolean): boolean {
    let index = 0;
    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip && predicate(<T>value, index++))
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
      if (value !== LazyIterator.Skip && !predicate(<T>value, index++))
        return false;
    }

    return true;
  }

  /** **Note:** This method processes the iterator, meaning you will not be able to apply any more operations after calling this */
  public join(separator: string): string {
    const result: string[] = [];
    let isFirstValue = true;

    while (!this.finished) {
      const value = this.nextItem();
      if (value === undefined) break;
      if (value !== LazyIterator.Skip)
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
          process(<T>value);
        else
          results!.push(<T>value);
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