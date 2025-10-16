import { LdsViewState } from "./viewstate.model";

export class LdsCacheModel {
    id!: string;
    pathName!: string;
    type!: string;
    state!: LdsViewState;
    filters!: any;
    fieldList?: any[];
    date!: string;
}

