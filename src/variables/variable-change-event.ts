import { Nullable } from 'frl-ts-utils/lib/types';

export class VariableChangeEvent
{
    public get source(): Nullable<object>
    {
        return this._source;
    }
    public get change(): Nullable<object>
    {
        return this._change;
    }

    private readonly _source: Nullable<object>;
    private readonly _change: Nullable<object>;

    public constructor(change: Nullable<object>, source: Nullable<object> = null)
    {
        this._source = source;
        this._change = change;
    }
}
