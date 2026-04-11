// set-methods.ts
// Demo Set<T> và các phép toán tập hợp
export {};

// Set<T>: tập hợp các giá trị KHÔNG trùng nhau
const set = new Set<number>();

// add
set.add(1);
set.add(2);
set.add(2); // bị bỏ qua vì đã có 2

// has
console.log('set has 2?', set.has(2)); // true

// delete
set.delete(1);

// size
console.log('set size:', set.size);

// clear
// set.clear();

// Duyệt Set
for (const value of set) {
  console.log('for..of set:', value);
}

set.forEach((value) => {
  console.log('forEach set:', value);
});

// Chuyển Set <-> Array
const setToArray = Array.from(set); // hoặc [...set]
const arrayToSet = new Set([1, 2, 2, 3, 4]);
console.log('setToArray:', setToArray);
console.log('arrayToSet:', arrayToSet);

// Ví dụ: loại bỏ phần tử trùng trong mảng
const withDup = [1, 1, 2, 3, 3, 4];
const unique = Array.from(new Set(withDup)); // [1,2,3,4]
console.log('unique:', unique);

// Lưu ý:
// - MUTATE: add, delete, clear
// - KHÔNG MUTATE: has, size, duyệt forEach/for..of

// Các phép toán tập hợp nâng cao
const setA = new Set([1, 2, 3, 4]);
const setB = new Set([3, 4, 5, 6]);

const union = (a: Set<number>, b: Set<number>): Set<number> =>
  new Set([...a, ...b]);

const intersection = (a: Set<number>, b: Set<number>): Set<number> =>
  new Set([...a].filter((x) => b.has(x)));

const difference = (a: Set<number>, b: Set<number>): Set<number> =>
  new Set([...a].filter((x) => !b.has(x)));

console.log('set union:', union(setA, setB)); // {1,2,3,4,5,6}
console.log('set intersection:', intersection(setA, setB)); // {3,4}
console.log('set difference A-B:', difference(setA, setB)); // {1,2}
