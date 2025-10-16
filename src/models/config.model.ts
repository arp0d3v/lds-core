export interface LdsConfig {
    saveState?: boolean,
    storage: string,
    debugMode?: number,
    sort: {
        defaultDir?: string,
        defaultName?: string,
        classNameDefault?: string,
        classNameDesc?: string,
        classNameAsc?: string,
        icon?: string
    },
    pagination: {
        enabled?: boolean,
        pageSize?: number,
        buttonCount?: number,
        firstTitle?: string,
        lastTitle?: string,
        nextTitle?: string,
        prevTitle?: string,
    },
    http: {
        method?: string,
    },
}

export const defaultLdsConfig: LdsConfig = {
    debugMode: 0,
    storage: 'session',
    pagination: {
        enabled: false,
        pageSize: 10,
        buttonCount: 7,
        firstTitle: 'First',
        lastTitle: 'Last',
        nextTitle: 'Next',
        prevTitle: 'Prev',
    },
    sort: {
        defaultDir: 'desc',
        classNameAsc: 'lds-sort-asc',
        classNameDefault: 'lds-sort',
        classNameDesc: 'lds-sort-desc',
    },
    http: {
        method: 'GET'
    }
}

