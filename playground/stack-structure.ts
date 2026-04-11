// stack-structure.ts
// Demo cấu trúc dữ liệu Stack (LIFO) cài bằng Array
export {};

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
