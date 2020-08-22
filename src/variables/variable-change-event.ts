import { Nullable } from 'frl-ts-utils/lib/types';

export class VariableChangeEvent
{
    public readonly source: Nullable<object>;
    public readonly change: Nullable<object>;

    public constructor(source: Nullable<object>, change: Nullable<object>)
    {
        this.source = source;
        this.change = change;
    }
}
