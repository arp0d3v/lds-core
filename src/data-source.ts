import { LdsEventEmitter } from "./events";
import { LdsCacheModel, LdsConfig, LdsField, LdsInputModel, LdsPageData, LdsViewState } from "./models";

export class ListDataSource<T> {
    state: LdsViewState;
    cache: LdsCacheModel;
    config: LdsConfig

    tempDate: any;
    filters: any;
    fieldList: LdsField[];
    fieldListBackup?: LdsField[];
    currentItem?: T;

    sortItem1: LdsField | undefined;
    sortItem2: LdsField | undefined;
    sortList1: LdsField[];
    sortList2: LdsField[];
    appliedSortName?: string;

    isLoading = false;
    isConfigured = false;
    isNew = true;

    onNavigateRequested = new LdsEventEmitter<any>();
    onDataRequested = new LdsEventEmitter<any>();
    onDataLoading = new LdsEventEmitter<any>();
    onDataLoaded = new LdsEventEmitter<LdsInputModel>();
    onSortChanged = new LdsEventEmitter<any>();
    onPaginationChanged = new LdsEventEmitter<any>();
    onStateChanged = new LdsEventEmitter<string>();
    onFieldChanged = new LdsEventEmitter<string>();
    protected _pages: LdsPageData[];
    protected _items: T[];
    protected _sourceItems: T[];
    private _fieldMap: Map<string, LdsField>;
    private _isDisposed = false;
    constructor(public id: string, public type: string, ldsConfig: LdsConfig, cache?: LdsCacheModel) {
        let htmlId = 'lds' + new Date().getTime().toString() + Math.random().toString(36).substring(2, 9);
        this.config = Object.assign({}, ldsConfig);
        if (cache) {
            this.isNew = false;
            this.cache = cache;
            this.state = cache.state;
            this.filters = cache.filters;
        } else {
            this.cache = new LdsCacheModel();
            const defaultPageSize = this.config.pagination?.pageSize || 10;
            this.state = new LdsViewState(htmlId, 0, defaultPageSize, 0);

            // Initialize pagination from config
            this.state.pagination.enabled = this.config.pagination?.enabled || false;
            this.state.pagination.buttonCount = this.config.pagination?.buttonCount || 7;

            if (this.state.pagination.enabled) {
                this.updatePaginationState();
            }
        }
        if (!this.filters) {
            this.filters = {};
        }
        this.tempDate = {};
        this.fieldList = [];
        this._sourceItems = [];
        this._items = [];
        this._pages = [];
        this.sortList1 = [];
        this.sortList2 = [];
        this._fieldMap = new Map();
    }
    setFields(fields: LdsField[], callStateChanged?: boolean): void {
        if (this._checkDisposed('setFields')) { return; }

        this.sortList1 = [];
        this.sortList2 = [];
        this._fieldMap.clear();

        this.fieldListBackup = fields.map(f => {
            const clone = new LdsField(f.name, f.title, f.dataType, f.visible, f.sortable, f.sort1Name, f.sort1Dir, f.sort2Name, f.sort2Dir);
            return Object.assign(clone, f);
        });
        let fieldData: any;
        let field: LdsField;
        for (let i = 0; i < fields.length; i++) {
            fieldData = fields[i];
            if ((fieldData instanceof LdsField) === false) {
                field = new LdsField(fieldData.name, fieldData.title, fieldData.dataType, fieldData.visible, fieldData.sortable, fieldData.sort1Name);
                Object.assign(field, fieldData);
                fields[i] = field;
            } else {
                field = fieldData;
            }
            field.dataSource = this;

            // Add to Map for O(1) lookup
            this._fieldMap.set(field.name, field);

            if (field.sortable !== false) {
                if (field.sort1Name === undefined) { field.sort1Name = field.name; }
                if (field.sort1Dir === undefined) { field.sort1Dir = this.config.sort.defaultDir; }
                if (field.sort2Dir === undefined) { field.sort2Dir = this.config.sort.defaultDir; }
                this.sortList1.push(field);
                this.sortList2.push(field);
                if (field.name == this.state.sort1Name) { this.sortItem1 = field; }
                if (field.name == this.state.sort2Name) { this.sortItem2 = field; }
            }
            if (!this.cache.fieldList || !this.config.saveState) { continue; }
            const cachedField = this.cache.fieldList?.find(x => x.name == field.name);
            if (cachedField) {
                field.visible = cachedField.visible;
            }
        }
        this.fieldList = fields;
        if (callStateChanged === true) {
            this.onStateChanged.emit('setFields');
        }
    }
    setData(data: LdsInputModel): void {
        if (this._checkDisposed('setData')) { return; }

        if (!data) {
            console.warn('setData called with null/undefined data');
            data = { items: [], total: 0 };
        }

        if (!data.items) { data.items = []; }
        this.setItems(data.items);

        // Validate and use total
        this.state.totalItemCount = (data.total !== null && data.total !== undefined)
            ? data.total
            : data.items.length;

        this.updatePaginationState();
    }
    setItems(items: T[]): void {
        if (this._checkDisposed('setItems')) { return; }

        if (!items) { items = []; }
        items.forEach((item: any, i: number) => {
            item.RowNumberLds = (this.pageIndex * this.pageSize) + i + 1;
        });
        this._items = items;
        let page = this._pages.find(x => x.pageIndex == this.state.pagination.pageIndex);
        if (page) {
            page.items = items;
        } else {
            page = { pageIndex: this.state.pagination.pageIndex, items: items };
            this._pages = [...this._pages, page];
        }
    }
    setSourceItems(items: T[]): void {
        if (this._checkDisposed('setSourceItems')) { return; }

        if (!items) { items = []; }
        this._sourceItems = items;
        this.state.totalItemCount = items.length;
        this.updatePaginationState();
    }
    setSourceUrl(url: string): void {
        this.state.sourceUrl = url;
    }
    reload(eventName?: any): void {
        if (this._checkDisposed('reload')) { return; }

        if (this.state.sort1Dir === undefined) { this.state.sort1Dir = this.config.sort.defaultDir; }
        if (this.state.sort1Name === undefined) { this.state.sort1Name = this.config.sort.defaultName; }
        if (this.hasData) {
            this.updatePaginationState();
        }
        this.onDataRequested.emit(eventName || 'reload');
    }
    loadPage(pageIndex: number): void {
        if (this.state.pagination.pageIndex == pageIndex) { return; }
        this.state.pagination.pageIndex = pageIndex;
        this.updatePaginationState();
        this.reload('loadPage');
    }
    changeSort(fieldName?: string | undefined, direction?: string | undefined): void {
        const state = this.state;
        if (state.sort1Name == fieldName) {
            state.sort1Dir = this._toggleSortDir(state.sort1Dir);
        } else {
            state.sort1Name = fieldName;
            state.sort1Dir = direction || this.config.sort.defaultDir;
        }
        this.onSortChanged.emit(fieldName);
    }
    /**
     * Sets the page size (items per page)
     * @param size - Number of items per page
     * 
     * @example
     * dataSource.setPageSize(20);
     */
    setPageSize(size: number): void {
        if (size <= 0) {
            console.warn('Page size must be greater than 0');
            return;
        }
        this.state.pagination.pageSize = size;
    }

    changePageSize(value: number): void {
        if (this.state.pagination.pageSize == value) { return; }
        this.state.pagination.pageSize = value;
        this.updatePaginationState();
        this.reload('changePageSize');
    }
    field(name: string, condition?: boolean): LdsField | undefined {
        if (this._checkDisposed('field')) { return; }

        // O(1) Map lookup instead of O(n) array.find()
        const col = this._fieldMap.get(name);
        if (!col) {
            console.log(`field ${name} not found.`);
            return;
        }
        col.visibleCondition = condition;
        if (condition !== undefined) {
            col.visible = condition;
        }
        return col;
    }
    clearFilters(): void {
        this.filters = {};
        this.state.pagination.pageIndex = 0;
    }
    resetFilters(): void {
        this.filters = {};
        this.state.pagination.pageIndex = 0;
        if (this.config.useRouting === true) {
            this.onNavigateRequested.emit('resetFilters');
        } else {
            this.reload('resetFilters');
        }
    }
    getFilters(): void {
        let filters: any = {};
        if (this.state.pagination.pageSize <= 0) {
            this.state.pagination.pageSize = this.config.pagination?.pageSize || 10;
        }
        filters.pageIndex = this.state.pagination.pageIndex;
        filters.pageSize = this.state.pagination.pageSize;
        Object.assign(filters, this.filters);
        filters.pageIndex = this.state.pagination.pageIndex;
        filters.pageSize = this.state.pagination.pageSize;
        filters.sort1Name = this.state.sort1Name || this.config.sort.defaultName;
        filters.sort1Dir = this.state.sort1Dir || this.config.sort.defaultDir;
        filters.sort2Name = this.state.sort2Name;
        filters.sort2Dir = this.state.sort2Dir;
        return filters;
    }
    search() {
        this.state.pagination.pageIndex = 0;
        if (this.config.useRouting) {
            this.filters.pageIndex = this.state.pagination.pageIndex;
            this.filters.pageSize = this.state.pagination.pageSize;
        }
        if (this.config.useRouting === true) {
            this.onNavigateRequested.emit('search');
        } else {
            this.reload('search');
        }
    }
    /**
     * Gets query parameters object for current filters and pagination state.
     * Useful for URL navigation when useRouting is enabled.
     * 
     * @param includePagination - Whether to include pagination params (pageIndex, pageSize). Default: true
     * @returns Object with filters and pagination parameters
     * 
     * @example
     * // In component when useRouting is enabled:
     * const queryParams = this.dataSource.getQueryParams();
     * this.router.navigate([], { queryParams, queryParamsHandling: 'merge' });
     */
    getQueryParams(includePagination: boolean = true): any {
        const queryParams: any = this.getFilters();

        // Add pagination params if enabled and requested
        if (includePagination && this.state.pagination.enabled) {
            queryParams.pageIndex = this.state.pagination.pageIndex;
            queryParams.pageSize = this.state.pagination.pageSize;
        }

        return queryParams;
    }
    /**
     * Applies query parameters to filters with proper type conversion.
     * Converts string query params to their correct data types (number, boolean, etc.)
     * based on field definitions.
     * Also applies pagination parameters (pageIndex, pageSize) if present.
     * 
     * @param params - Query parameters object (typically from route.queryParams)
     * @param customFieldTypes - Optional map of field names to data types for fields not in fieldList
     * 
     * @example
     * // In component ngOnInit:
     * this.route.queryParams.subscribe(params => {
     *   this.dataSource.applyQueryParams(params, { 'CatId2': 'number' });
     * });
     */
    applyQueryParams(params: any, customFieldTypes?: { [key: string]: string }): void {
        if (this._checkDisposed('applyQueryParams')) { return; }

        // Handle pagination parameters first
        if (params.pageIndex !== null && params.pageIndex !== undefined && params.pageIndex !== '') {
            const pageIndex = Number(params.pageIndex);
            if (!isNaN(pageIndex) && pageIndex >= 0) {
                // Enable pagination if pageIndex is provided
                this.state.pagination.enabled = true;
                this.state.pagination.pageIndex = pageIndex;
            }
        }

        if (params.pageSize !== null && params.pageSize !== undefined && params.pageSize !== '') {
            const pageSize = Number(params.pageSize);
            if (!isNaN(pageSize) && pageSize > 0) {
                // Enable pagination if pageSize is provided
                this.state.pagination.enabled = true;
                this.state.pagination.pageSize = pageSize;
            }
        }

        // Build field type map from dataSource fields
        const fieldTypeMap = new Map<string, string>();
        this.fieldList.forEach(field => {
            if (field.dataType) {
                fieldTypeMap.set(field.name, field.dataType);
            }
        });

        // Merge custom field types if provided
        if (customFieldTypes) {
            Object.keys(customFieldTypes).forEach(key => {
                fieldTypeMap.set(key, customFieldTypes[key]);
            });
        }

        // Apply filter params with type conversion (skip pagination params)
        Object.keys(params).forEach(key => {
            // Skip pagination parameters as they're already handled
            if (key === 'pageIndex' || key === 'pageSize') {
                return;
            }

            const value = params[key];

            // Skip empty values
            if (value === null || value === undefined || value === '') {
                return;
            }

            // Determine data type from field map or default to string
            const dataType = fieldTypeMap.get(key) || 'string';

            // Convert value based on data type
            switch (dataType) {
                case 'number':
                    const numValue = Number(value);
                    if (!isNaN(numValue)) {
                        this.filters[key] = numValue;
                    }
                    break;
                case 'boolean':
                    this.filters[key] = value === 'true' || value === true || value === '1' || value === 1;
                    break;
                default:
                    this.filters[key] = value;
                    break;
            }
        });

        // Update pagination state after applying params
        if (this.state.pagination.enabled) {
            this.updatePaginationState();
        }
    }
    get pageIndex(): number {
        return this.state.pagination.pageIndex || 0;
    }
    get sourceItems(): T[] {
        return this._sourceItems;
    }
    get items(): T[] {
        return this._items;
    }
    get pages(): LdsPageData[] {
        return this._pages;
    }
    get fields(): LdsField[] {
        return this.fieldList;
    }
    get hasData(): boolean {
        return this.items != null && this.items.length > 0;
    }
    get pageSize(): number {
        return this.state.pagination.pageSize;
    }
    get totalCount(): number {
        return this.state.totalItemCount;
    }
    get htmlId(): string {
        return this.state.htmlId;
    }
    get isLastPage() {
        return this.pagination.totalPageCount == this.pagination.pageIndex + 1;
    }
    loadNextPage() {
        if (this.pagination.totalPageCount - 1 < this.pagination.pageIndex + 1) {
            return;
        }
        this.loadPage(this.pagination.pageIndex + 1);
    }
    /**
     * Convenient access to pagination state
     * @returns LdsPaginationState object
     * 
     * @example
     * // Instead of: dataSource.state.pagination.pageIndex
     * // Use: dataSource.pagination.pageIndex
     * const currentPage = dataSource.pagination.pageIndex;
     * const buttonCount = dataSource.pagination.buttonCount;
     */
    get pagination() {
        return this.state.pagination;
    }

    /**
     * TrackBy function for *ngFor over dataSource.pages
     * Improves performance by allowing Angular to reuse DOM elements
     * 
     * @example
     * <div *ngFor="let page of dataSource.pages; trackBy: dataSource.trackByPageIndex">
     */
    trackByPageIndex(index: number, page: LdsPageData): number {
        return page.pageIndex;
    }

    private updatePaginationState() {
        const pag = this.state.pagination;
        const state = this.state;
        const oldPag = Object.assign({}, pag);

        if (!pag.enabled) {
            pag.totalPageCount = 1;
            pag.startPagingIndex = 0;
            pag.endPagingIndex = 0;
            pag.startItemIndex = 0;
            pag.endItemIndex = 0;
            pag.pageIndex = -1;
            pag.pageSize = 0;
            pag.pages = [];
            if (pag.pageIndex !== oldPag.pageIndex || pag.pageSize !== oldPag.pageSize) {
                this.onPaginationChanged.emit(this.state);
            }
            return;
        }

        // Get buttonCount from state (already initialized from config)
        const buttonCount = pag.buttonCount || 7;
        const halfButtons = Math.floor(buttonCount / 2);

        pag.totalPageCount = Math.ceil(state.totalItemCount / pag.pageSize);
        pag.startItemIndex = pag.pageIndex * pag.pageSize;
        pag.endItemIndex = pag.startItemIndex + pag.pageSize;
        if (pag.endItemIndex > state.totalItemCount) {
            pag.endItemIndex = state.totalItemCount;
        }

        // Calculate paging range based on buttonCount
        if (pag.pageIndex + halfButtons >= pag.totalPageCount) {
            // Near the end - show last N pages
            pag.endPagingIndex = pag.totalPageCount - 1;
        } else {
            // Show current page + halfButtons ahead
            pag.endPagingIndex = pag.pageIndex + halfButtons;
        }

        // Ensure we show at least buttonCount pages if available
        if (pag.endPagingIndex < buttonCount - 1 && pag.totalPageCount > buttonCount - 1) {
            pag.endPagingIndex = buttonCount - 1;
        }

        // Calculate start index to show buttonCount pages
        pag.startPagingIndex = pag.endPagingIndex - buttonCount + 1;
        if (pag.startPagingIndex < 0) {
            pag.startPagingIndex = 0;
        }

        // Build pages array
        pag.pages = [];
        for (let i = pag.startPagingIndex; i <= pag.endPagingIndex; i++) {
            pag.pages.push(i);
        }

        // Validate current page index
        if (pag.totalPageCount != 0 && pag.pageIndex > 0 && pag.pageIndex >= pag.totalPageCount) {
            pag.pageIndex = pag.totalPageCount - 1;
        }

        if (pag.pageIndex !== oldPag.pageIndex || pag.pageSize !== oldPag.pageSize || pag.totalPageCount !== oldPag.totalPageCount) {
            this.onPaginationChanged.emit(this.state);
        }
    }

    toggleAreaExpanded() {
        this.state.areaExpanded = !this.state.areaExpanded;
        this.onStateChanged.emit('toggleAreaExpanded');
    }
    private _toggleSortDir(dir?: string): string {
        if (dir == 'asc') { return 'desc'; }
        if (dir == 'desc') { return 'asc'; }
        return 'desc';
    }
    clearState() {
        this.state.sort1Dir = undefined;
        this.state.sort2Dir = undefined;
        this.state.sort1Name = undefined;
        this.state.sort2Name = undefined;
        this.state.pagination.pageIndex = 0;
        this.state.pagination.pageSize = this.config.pagination?.pageSize || 10;

        this.onStateChanged.emit('clearState');
    }
    clearData() {
        if (this._checkDisposed('clearData')) { return; }

        this._items = [];
        this.state.totalItemCount = 0;
        this.updatePaginationState();
        this.onStateChanged.emit('clearData');
    }

    /**
     * Disposes the DataSource and cleans up all resources
     * IMPORTANT: Call this in component's ngOnDestroy() to prevent memory leaks
     * 
     * @example
     * ngOnDestroy() {
     *   this.dataSource.dispose();
     * }
     */
    public dispose(): void {
        if (this._isDisposed) { return; }

        // Complete all EventEmitters to release subscribers
        this.onDataRequested.complete();
        this.onNavigateRequested.complete();
        this.onDataLoading.complete();
        this.onDataLoaded.complete();
        this.onSortChanged.complete();
        this.onPaginationChanged.complete();
        this.onStateChanged.complete();
        this.onFieldChanged.complete();

        // Clear references to allow garbage collection
        this._items = [];
        this._sourceItems = [];
        this._pages = [];
        this.fieldList = [];
        this.sortList1 = [];
        this.sortList2 = [];
        this._fieldMap.clear();

        this._isDisposed = true;
    }

    /**
     * Checks if the DataSource has been disposed
     */
    public get isDisposed(): boolean {
        return this._isDisposed;
    }

    /**
     * Guards against operations on disposed DataSource
     */
    private _checkDisposed(methodName: string): boolean {
        if (this._isDisposed) {
            console.warn(`${methodName}() called on disposed DataSource`);
            return true;
        }
        return false;
    }

    /**
     * Completely resets the DataSource - clears filters, state, and data
     */
    public reset(): void {
        if (this._checkDisposed('reset')) { return; }

        this.clearFilters();
        this.clearState();
        this.clearData();
    }
}
