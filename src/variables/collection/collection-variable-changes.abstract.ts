import { IReadonlyUnorderedMap, IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableElementChange } from './collection-variable-element-change';

export abstract class CollectionVariableChanges<TKey = any, TElement = any>
{
    public abstract get currentValue(): IReadonlyKeyedCollection<TKey, TElement>;
    public abstract get elements(): IReadonlyUnorderedMap<TKey, CollectionVariableElementChange<TKey, TElement>>;

    protected constructor() {}
}
