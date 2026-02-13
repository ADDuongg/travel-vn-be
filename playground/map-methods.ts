// map-methods.ts
// Demo Map<K,V> trong JS/TS
export {};

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
