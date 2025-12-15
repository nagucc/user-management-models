# User Management Models

一个用TypeScript编写的用户角色管理库，提供灵活的存储抽象和强大的可扩展性功能。

## 特性

- 📋 完整的用户和角色管理API
- 🔌 可插拔的存储适配器系统
  - 内存存储（开发和测试用）
  - 文件系统存储（简单持久化）
- 🔌 插件系统，轻松扩展功能
- 🔗 强大的钩子系统，支持在操作前后执行自定义逻辑
- 🔄 事务支持，确保数据一致性
- ⚡ 高性能的查询系统，支持筛选、排序和分页
- 🏷️ 用户和角色标签系统，支持自定义属性

## 安装

```bash
npm install user-management-models
```

## 快速开始

### 基本用法

```typescript
import { createUserManagement } from 'user-management-models';

// 创建实例
const userManagement = createUserManagement();

// 初始化
await userManagement.initialize();

// 创建用户
const user = await userManagement.users.createUser({
  username: 'john_doe',
  email: 'john@example.com',
  passwordHash: 'hashed_password' // 注意：库不处理密码哈希，需要外部完成
});

// 创建角色
const role = await userManagement.roles.createRole({
  name: 'Admin',
  description: '系统管理员'
});

// 为用户分配角色
await userManagement.assignRole(user.id, role.id);

// 获取用户的所有角色
const userRoles = await userManagement.users.getUserRoles(user.id);
```

### 使用不同的存储适配器

```typescript
import { createUserManagement } from 'user-management-models';
import { FileSystemAdapter } from 'user-management-models/adapters/FileSystemAdapter';

// 创建实例并配置文件系统适配器
const userManagement = createUserManagement({
  adapter: 'fileSystem'
});

// 或者注册自定义适配器
userManagement.registerAdapter('customAdapter', CustomAdapterClass);
userManagement.updateConfig({ adapter: 'customAdapter' });

// 初始化
await userManagement.initialize();
```

## API参考

### UserManagement类

主要入口类，提供完整的用户角色管理功能。

#### 初始化和关闭

```typescript
// 初始化实例
await userManagement.initialize();

// 更新配置
userManagement.updateConfig({ adapter: 'memory' });

// 关闭实例
await userManagement.shutdown();
```

#### 用户管理

通过`userManagement.users`访问用户管理功能：

```typescript
// 创建用户
const user = await userManagement.users.createUser({ username, email, passwordHash });

// 获取单个用户
const user = await userManagement.users.getUserById(userId);

// 获取用户列表（支持分页、筛选和排序）
const { items, total } = await userManagement.users.getUsers({
  filter: { username: 'john' },
  sort: { createdAt: 'desc' },
  limit: 10,
  offset: 0
});

// 更新用户
const updatedUser = await userManagement.users.updateUser(userId, { email: 'new@example.com' });

// 删除用户
const success = await userManagement.users.deleteUser(userId);

// 获取用户的所有角色
const roles = await userManagement.users.getUserRoles(userId);
```

#### 角色管理

通过`userManagement.roles`访问角色管理功能：

```typescript
// 创建角色
const role = await userManagement.roles.createRole({ name, description });

// 获取单个角色
const role = await userManagement.roles.getRoleById(roleId);

// 获取角色列表
const { items, total } = await userManagement.roles.getRoles({});

// 更新角色
const updatedRole = await userManagement.roles.updateRole(roleId, { description: '新描述' });

// 删除角色
const success = await userManagement.roles.deleteRole(roleId);

// 获取拥有特定角色的所有用户
const users = await userManagement.roles.getRoleUsers(roleId);
```

#### 用户-角色关联

```typescript
// 为用户分配角色
await userManagement.assignRole(userId, roleId);

// 移除用户角色
await userManagement.removeRole(userId, roleId);
```

#### 事务支持

```typescript
try {
  // 开始事务
  await userManagement.beginTransaction();
  
  // 执行一系列操作
  await userManagement.users.createUser({...});
  await userManagement.roles.createRole({...});
  
  // 提交事务
  await userManagement.commit();
} catch (error) {
  // 发生错误，回滚事务
  await userManagement.rollback();
}
```

#### 钩子系统

钩子系统允许你在操作前后执行自定义逻辑：

```typescript
// 注册钩子
userManagement.registerHook('user.preCreate', async (data) => {
  // 在创建用户前执行验证
  if (!data.userData.username || data.userData.username.length < 3) {
    throw new Error('用户名必须至少包含3个字符');
  }
  
  // 可以修改传入的数据
  data.userData.tags = data.userData.tags || {};
  data.userData.tags.source = 'registration';
  
  return data;
});

// 监听用户创建后的事件
userManagement.registerHook('user.postCreate', async (data) => {
  // 记录日志或执行其他操作
  console.log(`用户已创建: ${data.user.username}`);
});
```

#### 插件系统

```typescript
// 注册插件
userManagement.registerPlugin({
  name: 'my-plugin',
  version: '1.0.0',
  initialize: async () => {
    console.log('插件初始化');
    // 执行初始化操作，如注册钩子、适配器等
  },
  shutdown: async () => {
    console.log('插件关闭');
  }
});

// 查看已注册的插件
const plugins = userManagement.getRegisteredPlugins();
```

## 存储适配器

库内置两种存储适配器：

### MemoryAdapter

内存存储适配器，适用于开发和测试场景：

```typescript
// 默认就是内存适配器，无需额外配置
const userManagement = createUserManagement({ adapter: 'memory' });
```

### FileSystemAdapter

文件系统存储适配器，提供简单的持久化功能：

```typescript
const userManagement = createUserManagement({
  adapter: 'fileSystem',
  // 可选的自定义数据目录
  dataDir: './user-data'
});
```

### 创建自定义适配器

你可以创建自定义适配器来连接到其他存储系统：

```typescript
import { StorageAdapter } from 'user-management-models';

class MyCustomAdapter implements StorageAdapter {
  // 实现所有必要的方法...
  async initialize(options?: any): Promise<void> { /* ... */ }
  async shutdown(): Promise<void> { /* ... */ }
  async createUser(user: any): Promise<any> { /* ... */ }
  // ...更多方法
}

// 注册自定义适配器
userManagement.registerAdapter('myCustomAdapter', MyCustomAdapter);
```

## 类型定义

库提供完整的TypeScript类型定义，确保类型安全：

```typescript
import { User, Role, UserRole, QueryOptions } from 'user-management-models';
```

## 开发和测试

```bash
# 克隆仓库
git clone https://github.com/nagucc/user-management-models.git
cd user-management-models

# 安装依赖
npm install

# 构建项目
npm run build

# 运行测试
npm test

# 类型检查
npm run typecheck

# 代码风格检查
npm run lint
```

## 许可证

[ISC License](LICENSE)

