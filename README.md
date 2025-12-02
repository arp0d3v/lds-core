# @arp0d3v/lds-core

> Framework-independent data source management for tables, lists, and grids

[![npm version](https://badge.fury.io/js/%40arp0d3v%2Flds-core.svg)](https://www.npmjs.com/package/@arp0d3v/lds-core)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

---

## Features

- ✅ **Framework-Independent** - Works with Angular, React, Vue, Svelte, or vanilla JS
- ✅ **Zero Dependencies** - Pure TypeScript, no external libraries
- ✅ **Custom Event System** - No RxJS required
- ✅ **TypeScript First** - Full type safety and IntelliSense
- ✅ **Lightweight** - ~15KB minified
- ✅ **Pagination** - Built-in pagination support
- ✅ **Sorting** - Single and multi-column sorting
- ✅ **Filtering** - Flexible filter management
- ✅ **Routing Support** - URL-based state management with query params
- ✅ **State Caching** - Persist state in localStorage/sessionStorage
- ✅ **Memory Safe** - Built-in dispose() pattern

---

## Installation

```bash
npm install @arp0d3v/lds-core
```

Or with yarn:

```bash
yarn add @arp0d3v/lds-core
```

---

## Quick Start

```typescript
import { ListDataSource, LdsField } from '@arp0d3v/lds-core';

// Create a data source
const dataSource = new ListDataSource('myList', 'remote', {
    sort: { defaultDir: 'asc' },
    pagination: {
        enabled: true,
        pageSize: 20
    },
    saveState: true
});

// Define fields
dataSource.setFields([
    new LdsField('id', 'ID', 'number'),
    new LdsField('name', 'Name', 'string'),
    new LdsField('email', 'Email', 'string'),
    new LdsField('createdAt', 'Created', 'datetime')
]);

// Listen to events
dataSource.onDataLoaded.subscribe(data => {
    console.log('Loaded:', data.items.length, 'items');
    console.log('Total:', data.total);
});

// Load data
dataSource.setData({
    items: [
        { id: 1, name: 'John Doe', email: 'john@example.com', createdAt: '2024-01-15' },
        { id: 2, name: 'Jane Smith', email: 'jane@example.com', createdAt: '2024-01-16' }
    ],
    total: 2
});

// Cleanup
dataSource.dispose();
```

---

## ⚠️ Breaking Changes in v2.1.0

If you're upgrading from v2.0.0 or earlier, note these breaking changes:

- **Field Properties:** `orderable` → `sortable`
- **State Properties:** `order1Name`/`order1Dir` → `sort1Name`/`sort1Dir`
- **State Properties:** `order2Name`/`order2Dir` → `sort2Name`/`sort2Dir`

**Migration:**
```typescript
// Old (v2.0.0)
new LdsField('name', 'Name', 'string', true, true, 'order1Name', 'asc')
dataSource.state.order1Name

// New (v2.1.0)
new LdsField('name', 'Name', 'string', true, true, 'sort1Name', 'asc')
dataSource.state.sort1Name
```

---

## Core Concepts

### ListDataSource

The main class for managing data:

```typescript
const ds = new ListDataSource<MyType>(
    'uniqueId',      // Unique identifier
    'remote',        // 'remote' or 'local'
    config           // Configuration
);
```

### LdsField

Define your data columns:

```typescript
new LdsField(
    'fieldName',     // Property name
    'Display Title', // Column title
    'string',        // Data type
    true,            // Visible (default: true)
    true             // Sortable (default: true)
);
```

### Events

```typescript
dataSource.onDataRequested.subscribe(() => {
    // Fetch data from API
});

dataSource.onDataLoaded.subscribe(data => {
    // Data loaded successfully
});

dataSource.onSortChanged.subscribe(fieldName => {
    // Sort changed
});

dataSource.onPaginationChanged.subscribe(state => {
    // Page or page size changed
});

dataSource.onNavigateRequested.subscribe(eventName => {
    // Navigation requested (when useRouting is enabled)
});
```

---

## Routing Support

Enable URL-based state management for better user experience and shareable links:

```typescript
const dataSource = new ListDataSource('myList', 'remote', {
    useRouting: true,  // Enable routing
    pagination: {
        enabled: true,
        pageSize: 20
    },
    sort: {
        defaultDir: 'desc'
    }
});

// Get query parameters for current state
const queryParams = dataSource.getQueryParams();
// Returns: { pageIndex: 0, pageSize: 20, sort1Name: 'name', sort1Dir: 'desc', ...filters }

// Apply query parameters from URL
dataSource.applyQueryParams({
    pageIndex: '2',
    pageSize: '50',
    sort1Name: 'email',
    sort1Dir: 'asc',
    searchText: 'john'
});

// Listen for navigation requests
dataSource.onNavigateRequested.subscribe(eventName => {
    const params = dataSource.getQueryParams();
    // Navigate using your routing library
    router.navigate([], { queryParams: params });
});
```

**Note:** Routing integration is framework-specific. See `@arp0d3v/lds-angular` for Angular Router integration.

---

## API Reference

### Methods

- `setFields(fields: LdsField[])` - Set field definitions
- `setData(data: { items: T[], total: number })` - Set current page data
- `setSourceItems(items: T[])` - Set all items (local mode)
- `setPageSize(size: number)` - Set page size
- `loadPage(pageIndex: number)` - Load specific page
- `loadNextPage()` - Load next page
- `reload()` - Reload data
- `field(name: string)` - Get field by name
- `getQueryParams(includePagination?: boolean)` - Get query params for routing
- `applyQueryParams(params: any, customFieldTypes?: object)` - Apply query params
- `dispose()` - Cleanup resources

### Properties

- `items: T[]` - Current page items
- `sourceItems: T[]` - All items (local mode)
- `pages: LdsPageData[]` - All loaded pages
- `fields: LdsField[]` - Field definitions
- `hasData: boolean` - Has items
- `isLoading: boolean` - Is loading
- `isLastPage: boolean` - Is on last page
- `pageIndex: number` - Current page (0-based)
- `pageSize: number` - Items per page
- `totalCount: number` - Total items across all pages
- `pagination: LdsPaginationState` - Pagination state
- `state: LdsViewState` - Complete state
- `filters: any` - Filter object

### Built-in TrackBy

```typescript
// For multi-page rendering
dataSource.trackByPageIndex(index, page);
```

---

## Framework Integration

### Angular

Use with `@arp0d3v/lds-angular`:

```bash
npm install @arp0d3v/lds-core @arp0d3v/lds-angular
```

See [@arp0d3v/lds-angular](https://github.com/arp0d3v/lds-angular) for Angular components.

### React (Future)

```bash
npm install @arp0d3v/lds-core @arp0d3v/lds-react
```

### Vue (Future)

```bash
npm install @arp0d3v/lds-core @arp0d3v/lds-vue
```

### Vanilla JS

```html
<script src="https://unpkg.com/@arp0d3v/lds-core@2.1.0/dist/index.js"></script>
<script>
  const { ListDataSource, LdsField } = LdsCore;
  const ds = new ListDataSource('myList', 'local', {});
</script>
```

---

## Documentation

- [Quick Start](https://github.com/arp0d3v/lds-core/blob/main/docs/01-QUICK-START.md)
- [API Reference](https://github.com/arp0d3v/lds-core/blob/main/docs/16-API-REFERENCE.md)
- [Advanced Patterns](https://github.com/arp0d3v/lds-core/blob/main/docs/17-ADVANCED-PATTERNS.md)
- [Examples](https://github.com/arp0d3v/lds-core/blob/main/docs/18-EXAMPLES.md)

---

## License

MIT © [Arash Pouya](https://github.com/arp0d3v)

---

## Author

**Arash Pouya** ([@arp0d3v](https://github.com/arp0d3v))

Programming since 17. C# ASP.NET developer with expertise in Angular, TypeScript, and web development.

---

## Contributing

Contributions are welcome! Please open an issue or submit a pull request.

---

## Support

- 🐛 [Report a bug](https://github.com/arp0d3v/lds-core/issues)
- 💡 [Request a feature](https://github.com/arp0d3v/lds-core/issues)
- 📖 [Read the docs](https://github.com/arp0d3v/lds-core/blob/main/docs/README.md)

