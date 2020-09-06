import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { VariableChangeEvent } from '../variable-change-event';
import { CollectionVariableElementChange } from './collection-variable-element-change';

export class CollectionVariableElementChangeEvent<TKey = any, TElement = any>
    extends
    VariableChangeEvent
{
    public get source(): VariableChangeEvent
    {
        return reinterpretCast<VariableChangeEvent>(super.source);
    }
    public get change(): CollectionVariableElementChange<TKey, TElement>
    {
        return reinterpretCast<CollectionVariableElementChange<TKey, TElement>>(super.change);
    }

    public constructor(change: CollectionVariableElementChange<TKey, TElement>, source: VariableChangeEvent)
    {
        super(change, source);
    }
}
