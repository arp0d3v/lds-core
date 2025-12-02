/**
 * Pagination state for ListDataSource
 */
export interface LdsPaginationState {
    enabled: boolean;
    pageIndex: number;
    pageSize: number;
    totalPageCount: number;
    pages: number[];
    startPagingIndex: number;
    endPagingIndex: number;
    startItemIndex: number;
    endItemIndex: number;
    buttonCount: number;
}

/**
 * View state for ListDataSource
 */
export class LdsViewState {
    constructor(
        public htmlId: string,
        pageIndex: number,
        pageSize: number,
        totalItemCount: number,
        public sort1Name?: string,
        public sort1Dir?: string
    ) {
        // Initialize pagination state
        this.pagination = {
            enabled: false,
            pageIndex: pageIndex,
            pageSize: pageSize,
            totalPageCount: 1,
            pages: [],
            startPagingIndex: 0,
            endPagingIndex: 0,
            startItemIndex: 0,
            endItemIndex: 0,
            buttonCount: 7
        };
        
        // Initialize total item count (view-level)
        this.totalItemCount = totalItemCount;
    }
    
    // Sorting
    sort2Name?: string;
    sort2Dir?: string;
    
    // Pagination (nested config)
    pagination: LdsPaginationState;
    
    // Total item count (view-level, used by pagination calculation)
    totalItemCount: number;
    
    // UI state
    showSpinner = false;
    areaExpanded = false;
    
    // Additional data
    data: any = {};
    sourceUrl?: string;
    queryString?: string;
}

