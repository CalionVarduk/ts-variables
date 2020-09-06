import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { CollectionVariableElementChangeType } from './collection-variable-element-change-type.enum';

export abstract class CollectionVariableElementChange<TKey = any, TElement = any>
{
    public readonly changeType: CollectionVariableElementChangeType;
    public readonly key: DeepReadonly<TKey>;
    public readonly originalElement: Nullable<DeepReadonly<TElement>>;
    public readonly currentElement: Nullable<DeepReadonly<TElement>>;
    public abstract get elementChanges(): Nullable<object>;

    public constructor(
        key: DeepReadonly<TKey>,
        originalElement: Nullable<DeepReadonly<TElement>>,
        currentElement: Nullable<DeepReadonly<TElement>>,
        changeType: CollectionVariableElementChangeType)
    {
        this.key = key;
        this.originalElement = originalElement;
        this.currentElement = currentElement;
        this.changeType = changeType;
    }
}
