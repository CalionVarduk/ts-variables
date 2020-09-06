import { IReadonlyUnorderedMap, IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { VariableValidatorState } from '../variable-validator-state';
import { CollectionVariableElementValidatorState } from './collection-variable-element-validator-state';

export abstract class CollectionVariableValidatorState<TKey = any, TElement = any>
    extends
    VariableValidatorState
{
    public abstract get currentValue(): IReadonlyKeyedCollection<TKey, TElement>;
    public abstract get invalidElements(): IReadonlyUnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>;
    public abstract get elementsWithWarnings(): IReadonlyUnorderedMap<TKey, CollectionVariableElementValidatorState<TKey, TElement>>;

    protected constructor()
    {
        super();
    }
}
