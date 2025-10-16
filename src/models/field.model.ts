import { ListDataSource } from '../data-source';

export class LdsField {
    constructor(
        public name: string,
        public title?: string,
        public dataType?: string,
        public visible?: boolean,
        public orderable?: boolean,
        public order1Name?: string,
        public order1Dir?: string,
        public order2Name?: string,
        public order2Dir?: string,
    ) {
        if (visible === undefined) {
            this.visible = true;
        }
        if (order1Name === undefined) {
            this.order1Name = name;
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

