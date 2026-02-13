// js-method-cheatsheet.ts
// Tổng hợp các phương thức hay dùng trong JS cho Array, Object, Map, Set, Stack
// File này viết bằng TypeScript, bạn có thể import vào đâu đó hoặc chạy bằng ts-node để xem log.

// ===================== ARRAY =====================
// Tóm tắt nhanh:
// - MUTATE (thay đổi mảng gốc):
//   push, pop, shift, unshift, splice, sort, reverse, fill, copyWithin
// - KHÔNG MUTATE (trả về mảng / giá trị MỚI, không đụng mảng gốc):
//   map, filter, slice, concat, flat, flatMap, reduce, some, every,
//   find, findIndex, includes, indexOf/lastIndexOf, join, forEach (chỉ duyệt)

const numbers: number[] = [1, 2, 3, 4, 5];

// ---- Duyệt mảng ----

// forEach: duyệt từng phần tử, KHÔNG trả về mảng mới
numbers.forEach((value, index, arr) => {
  console.log('forEach:', { value, index, arrLength: arr.length });
});

// map: tạo mảng mới từ mảng cũ
const doubled = numbers.map((n) => n * 2);
console.log('map:', doubled);

// filter: lọc mảng theo điều kiện
const even = numbers.filter((n) => n % 2 === 0);
console.log('filter:', even);

// reduce: gộp các phần tử thành một giá trị
const sum = numbers.reduce((acc, curr) => acc + curr, 0);
console.log('reduce sum:', sum);

// some: có ÍT NHẤT 1 phần tử thỏa điều kiện?
const hasOdd = numbers.some((n) => n % 2 === 1);
console.log('some odd?:', hasOdd);

// every: TẤT CẢ phần tử thỏa điều kiện?
const allPositive = numbers.every((n) => n > 0);
console.log('every > 0?:', allPositive);

// find: trả về PHẦN TỬ đầu tiên đúng điều kiện (hoặc undefined)
const firstGreater3 = numbers.find((n) => n > 3);
console.log('find > 3:', firstGreater3);

// findIndex: trả về INDEX đầu tiên đúng điều kiện (hoặc -1)
const firstGreater3Index = numbers.findIndex((n) => n > 3);
console.log('findIndex > 3:', firstGreater3Index);

// ---- Thêm / Xoá / Cắt / Nối ----

const arr1 = [1, 2, 3];

// push: thêm cuối mảng, TRẢ về length mới
arr1.push(4); // arr1: [1,2,3,4]

// pop: xoá cuối, TRẢ về phần tử bị xoá
const last = arr1.pop(); // last: 4, arr1: [1,2,3]

// unshift: thêm đầu mảng
arr1.unshift(0); // arr1: [0,1,2,3]

// shift: xoá đầu mảng
const first = arr1.shift(); // first: 0, arr1: [1,2,3]

// splice: thêm/xoá ở vị trí bất kỳ (LÀM THAY ĐỔI mảng gốc)
const spliceArr = [1, 2, 3, 4, 5];
// xoá 2 phần tử từ index 1 (2,3)
const removed = spliceArr.splice(1, 2); // removed: [2,3], spliceArr: [1,4,5]
// chèn thêm 99,100 tại index 1
spliceArr.splice(1, 0, 99, 100); // spliceArr: [1,99,100,4,5]

// slice: cắt mảng (KHÔNG làm thay đổi mảng gốc)
const originArray = [10, 20, 30, 40, 50];
const sliced = originArray.slice(1, 4); // [20,30,40]

// concat: nối mảng (KHÔNG mutate)
const a1 = [1, 2];
const a2 = [3, 4];
const merged = a1.concat(a2); // [1,2,3,4]

// fill: GHI ĐÈ toàn bộ (hoặc 1 đoạn) mảng bằng 1 giá trị (MUTATE)
const fillArr = new Array(5).fill(0); // [0,0,0,0,0]
fillArr.fill(1, 2, 4); // [0,0,1,1,0]

// copyWithin: copy 1 đoạn trong mảng sang vị trí khác (MUTATE)
const copyWithinArr = [1, 2, 3, 4, 5];
// từ index 0..1 copy sang vị trí bắt đầu 2  -> [1,2,1,2,5]
copyWithinArr.copyWithin(2, 0, 2);

// ---- Sắp xếp / Đảo / Chuỗi ----

// sort: sắp xếp (CÓ mutate mảng gốc!)
const sortArr = [3, 1, 4, 2];
sortArr.sort(); // sort dạng string: [1,2,3,4]
sortArr.sort((x, y) => y - x); // sort số giảm dần: [4,3,2,1]

// reverse: đảo ngược (mutate)
sortArr.reverse();

// join: ghép mảng thành string
const fruits = ['apple', 'banana', 'orange'];
console.log('join:', fruits.join(', ')); // "apple, banana, orange"

// includes: kiểm tra có phần tử không
console.log('includes banana?', fruits.includes('banana'));

// indexOf / lastIndexOf
console.log('indexOf banana:', fruits.indexOf('banana'));

// flat / flatMap (ES2019+)
const nested = [1, [2, 3], [4, [5]]];
console.log('flat(1):', nested.flat(1)); // [1,2,3,4,[5]]
console.log('flat(2):', nested.flat(2)); // [1,2,3,4,5]

// ---- Mẫu cập nhật IMMUTABLE (hay dùng trong React/Redux) ----

type Todo = { id: number; title: string; done: boolean };

const todos: Todo[] = [
  { id: 1, title: 'Learn TS', done: false },
  { id: 2, title: 'Learn React', done: true }
];

// Thêm 1 todo (KHÔNG mutate mảng cũ)
const addTodoImmutable = (list: Todo[], todo: Todo): Todo[] => [...list, todo];

// Sửa 1 todo theo id (dùng map, KHÔNG mutate)
const toggleTodo = (list: Todo[], id: number): Todo[] =>
  list.map((t) => (t.id === id ? { ...t, done: !t.done } : t));

console.log(
  'immutable add:',
  addTodoImmutable(todos, { id: 3, title: 'Learn Node', done: false })
);
console.log('immutable toggle:', toggleTodo(todos, 1));

// ===================== OBJECT =====================

type User = {
  id: number;
  name: string;
  age?: number;
};

const user: User = {
  id: 1,
  name: 'Alice',
  age: 20
};

// Object.keys: mảng key (string)
const userKeys = Object.keys(user);
console.log('Object.keys:', userKeys);

// Object.values: mảng value
const userValues = Object.values(user);
console.log('Object.values:', userValues);

// Object.entries: mảng [key, value]
const userEntries = Object.entries(user);
console.log('Object.entries:', userEntries);

// Object.fromEntries: chuyển lại từ [key, value][] -> object
const rebuiltUser = Object.fromEntries(userEntries);
console.log('Object.fromEntries:', rebuiltUser);

// Object.assign: gộp object (shallow copy)
const base = { a: 1, b: 2 };
const extra = { b: 3, c: 4 };
const mergedObj = Object.assign({}, base, extra); // { a:1, b:3, c:4 }

// Spread operator (...): clone + merge
const clonedUser = { ...user };
const userWithAddress = { ...user, address: 'Hanoi' };
console.log('spread clonedUser:', clonedUser);
console.log('spread userWithAddress:', userWithAddress);

// hasOwnProperty: kiểm tra object TỰ có key đó hay không
console.log('hasOwnProperty id:', user.hasOwnProperty('id'));

// Optional chaining & nullish coalescing (TS/ES2020+)
// address chưa tồn tại nên sẽ dùng 'Unknown'
const city = (user as any).address?.city ?? 'Unknown';
console.log('city:', city);

// Một số lưu ý nâng cao:
// - MUTATE: gán trực tiếp user.name = '...', delete user.age,
//   Object.assign(target, ...) sẽ mutate "target"
// - KHÔNG MUTATE: Object.keys/values/entries, Object.fromEntries,
//   clone bằng spread ({...user}), JSON.parse(JSON.stringify(user)) (deep clone đơn giản)

// Ví dụ MUTATE vs IMMUTABLE:
const mutableUser = user;
mutableUser.name = 'Bob'; // MUTATE object gốc (user)

const immutableUser = { ...user, name: 'Charlie' }; // tạo object mới, user không đổi
console.log('mutableUser:', mutableUser);
console.log('immutableUser:', immutableUser);

// Object.freeze: đóng băng (chống bị mutate ở mức nông - shallow)
const frozen = Object.freeze({ x: 1, y: 2 });
// (frozen as any).x = 2; // trong strict mode sẽ báo lỗi, ngoài ra thì bị ignore
console.log('frozen:', frozen);

// ===================== MAP =====================

// Map<K,V>: key có thể là bất kỳ kiểu (object, number, string,...)
const map = new Map<string, number>();

// set
map.set('apple', 10);
map.set('banana', 20);

// get
console.log('map get apple:', map.get('apple')); // 10

// has
console.log('map has banana?', map.has('banana')); // true

// delete
map.delete('apple');

// size
console.log('map size:', map.size);

// clear
// map.clear();

// Duyệt Map
for (const [key, value] of map) {
  console.log('for..of map:', key, value);
}

map.forEach((value, key) => {
  console.log('forEach map:', key, value);
});

// keys / values / entries
const mapKeys = Array.from(map.keys());
const mapValues = Array.from(map.values());
const mapEntries = Array.from(map.entries());
console.log({ mapKeys, mapValues, mapEntries });

// Lưu ý:
// - MUTATE: set, delete, clear
// - KHÔNG MUTATE: get, has, size, forEach, keys/values/entries

// Clone Map (KHÔNG mutate map cũ)
const clonedMap = new Map(map);
console.log('clonedMap:', clonedMap);

// Chuyển Map <-> Object
const mapToObj = Object.fromEntries(map); // { banana: 20 }
const objToMap = new Map(Object.entries({ cat: 1, dog: 2 }));
console.log('mapToObj:', mapToObj);
console.log('objToMap:', objToMap);

// ===================== SET =====================

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

// ===================== STACK (LIFO) =====================
// Stack thường được cài bằng Array với push/pop

class Stack<T> {
  private items: T[] = [];

  // đẩy phần tử lên đỉnh stack
  push(item: T): void {
    this.items.push(item);
  }

  // lấy phần tử ở đỉnh ra (và xoá khỏi stack)
  pop(): T | undefined {
    return this.items.pop();
  }

  // xem phần tử ở đỉnh nhưng không xoá
  peek(): T | undefined {
    return this.items[this.items.length - 1];
  }

  // số phần tử
  size(): number {
    return this.items.length;
  }

  // stack có rỗng không
  isEmpty(): boolean {
    return this.items.length === 0;
  }

  // xoá hết
  clear(): void {
    this.items = [];
  }

  // chuyển Stack thành mảng (immutable)
  toArray(): T[] {
    return [...this.items];
  }
}

// Ví dụ sử dụng Stack
const stack = new Stack<number>();
stack.push(10);
stack.push(20);
console.log('stack peek:', stack.peek()); // 20
console.log('stack pop:', stack.pop()); // 20
console.log('stack size:', stack.size()); // 1
console.log('stack isEmpty:', stack.isEmpty()); // false
stack.clear();
console.log('stack isEmpty after clear:', stack.isEmpty()); // true
console.log('stack toArray:', stack.toArray());

