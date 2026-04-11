/* eslint-disable @typescript-eslint/no-unused-vars */
// array-methods.ts
// Demo các phương thức hay dùng của Array trong JS/TS
export {};

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
  { id: 2, title: 'Learn React', done: true },
];

// Thêm 1 todo (KHÔNG mutate mảng cũ)
const addTodoImmutable = (list: Todo[], todo: Todo): Todo[] => [...list, todo];

// Sửa 1 todo theo id (dùng map, KHÔNG mutate)
const toggleTodo = (list: Todo[], id: number): Todo[] =>
  list.map((t) => (t.id === id ? { ...t, done: !t.done } : t));

console.log(
  'immutable add:',
  addTodoImmutable(todos, { id: 3, title: 'Learn Node', done: false }),
);
console.log('immutable toggle:', toggleTodo(todos, 1));
