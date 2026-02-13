/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
/* eslint-disable no-prototype-builtins */
// object-methods.ts
// Demo các phương thức hay dùng với Object
export {};

type User = {
  id: number;
  name: string;
  age?: number;
};

const user: User = {
  id: 1,
  name: 'Alice',
  age: 20,
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
console.log('Object.assign mergedObj:', mergedObj);

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

console.log(
  '===================== CÁC KHÁI NIỆM NÂNG CAO VỀ OBJECT =====================',
);

// ===================== CÁC KHÁI NIỆM NÂNG CAO VỀ OBJECT =====================

// 1. Shallow copy vs Deep copy với object lồng nhau

type NestedUser = {
  id: number;
  name: string;
  address: {
    city: string;
    street: string;
  };
};

const nestedUser: NestedUser = {
  id: 1,
  name: 'Alice',
  address: {
    city: 'Hanoi',
    street: 'Kim Ma',
  },
};

// shallowCopy chỉ copy level 1, object con vẫn là cùng reference
const shallowCopyUser = { ...nestedUser };

// deep copy đơn giản bằng JSON (mất function, Date, Map/Set,... nên chỉ phù hợp data đơn giản)
const deepCopyUser = JSON.parse(JSON.stringify(nestedUser)) as NestedUser;

nestedUser.address.city = 'Saigon';

console.log('nestedUser.address.city:', nestedUser.address.city);
console.log(
  'shallowCopyUser.address.city (bị ảnh hưởng):',
  shallowCopyUser.address.city,
);
console.log(
  'deepCopyUser.address.city (KHÔNG bị ảnh hưởng):',
  deepCopyUser.address.city,
);

// 2. Property Descriptor & Object.defineProperty

const product: Record<string, unknown> = {};

Object.defineProperty(product, 'price', {
  value: 100_000,
  writable: false, // không cho gán lại
  enumerable: true, // xuất hiện trong Object.keys / for...in
  configurable: false, // không cho xoá hoặc redefine
});

console.log(
  'price descriptor:',
  Object.getOwnPropertyDescriptor(product, 'price'),
);

// thử gán lại (trong strict mode sẽ báo lỗi, ngoài ra thì bị ignore)
// (product as any).price = 200_000;
console.log('product.price (vẫn là 100000):', (product as any).price);

// 3. Getter / Setter trên object

const account = {
  _balance: 0,

  get balance() {
    console.log('getter balance được gọi');
    return this._balance;
  },

  set balance(value: number) {
    if (value < 0) {
      throw new Error('Balance cannot be negative');
    }
    console.log('setter balance được gọi với:', value);
    this._balance = value;
  },
};

account.balance = 500; // gọi setter
console.log('account.balance:', account.balance); // gọi getter

// 4. Prototype & Object.create

const animal = {
  speak() {
    console.log(`Animal speaking, name = ${(this as any).name ?? 'unknown'}`);
  },
};

const dog = Object.create(animal); // dog.__proto__ === animal
(dog as any).name = 'Milu';

dog.speak();
console.log('dog hasOwnProperty("speak"):', dog.hasOwnProperty('speak'));
console.log(
  'Object.getPrototypeOf(dog) === animal:',
  Object.getPrototypeOf(dog) === animal,
);

// 5. Một chút TypeScript nâng cao với Object (keyof, Record, Partial, Pick,...)

type UserSettings = {
  theme: 'light' | 'dark';
  language: 'vi' | 'en';
  notifications: boolean;
};

// Record: map từ key -> value type
const defaultSettings: Record<keyof UserSettings, unknown> = {
  theme: 'light',
  language: 'vi',
  notifications: true,
};

// Partial: tất cả field đều optional (thường dùng cho update)
type UserSettingsPatch = Partial<UserSettings>;

const patchSettings = (
  current: UserSettings,
  patch: UserSettingsPatch,
): UserSettings => ({
  ...current,
  ...patch,
});

const currentSettings: UserSettings = {
  theme: 'dark',
  language: 'en',
  notifications: true,
};

const updatedSettings = patchSettings(currentSettings, {
  language: 'vi',
});

console.log('defaultSettings:', defaultSettings);
console.log('currentSettings:', currentSettings);
console.log('updatedSettings (sau patch):', updatedSettings);
