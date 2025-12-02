import { ListDataSource } from '../data-source';

export class LdsField {
    constructor(
        public name: string,
        public title?: string,
        public dataType?: string,
        public visible?: boolean,
        public sortable?: boolean,
        public sort1Name?: string,
        public sort1Dir?: string,
        public sort2Name?: string,
        public sort2Dir?: string,
    ) {
        if (visible === undefined) {
            this.visible = true;
        }
        if (sort1Name === undefined) {
            this.sort1Name = name;
        }
    }

    public dataSource?: ListDataSource<any>;
    public visibleCondition?: any;
    
    toggleVisible(callStateChanged?: boolean): void {
        this.visible = !this.visible;
        this.dataSource?.onFieldChanged.emit('field.toggleVisible');
        if (callStateChanged === true) {
            this.dataSource?.onStateChanged.emit('field.toggleVisible');
        }
    }
}

