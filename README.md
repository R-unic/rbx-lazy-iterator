# LazyIterator
Combines multiple array operations into an iterator and only applies operations when the iterator is processed

## Example
```ts
import LazyIterator from "@rbxts/lazy-iterator";

const sum = LazyIterator.fromArray([1,2,3,4,5,6,7,8])
  .map(n => n * 3) // triple all numbers
  .filter(n => n % 2 === 0) // filter out odd numbers
  .reduce((sum, n) => sum + n); // apply all operations then add up all numbers

print(sum); // 60
```