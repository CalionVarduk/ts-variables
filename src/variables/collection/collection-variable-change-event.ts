import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { VariableChangeEvent } from '../variable-change-event';
import { CollectionVariableElementChange } from './collection-variable-element-change';

export class CollectionVariableChangeEvent<TKey = any, TElement = any>
    extends
    VariableChangeEvent
{
    public get change(): ReadonlyArray<CollectionVariableElementChange<TKey, TElement>>
    {
        return reinterpretCast<ReadonlyArray<CollectionVariableElementChange<TKey, TElement>>>(super.change);
    }

    public constructor(change: ReadonlyArray<CollectionVariableElementChange<TKey, TElement>>, source: Nullable<object> = null)
    {
        super(change, source);
    }
}
