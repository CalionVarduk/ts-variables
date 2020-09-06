import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { UpdateRef } from '../../update-ref';
import { IVariableChangeTracker } from '../variable-change-tracker.interface';
import { CollectionVariableChanges } from './collection-variable-changes.abstract';

export interface ICollectionVariableChangeTracker<TKey = any, TElement = any>
    extends
    IVariableChangeTracker<IReadonlyKeyedCollection<TKey, TElement>>
{
    readonly changes: CollectionVariableChanges<TKey, TElement>;

    areElementsEqual(first: Nullable<DeepReadonly<TElement>>, second: Nullable<DeepReadonly<TElement>>): boolean;
    getAddedElements(): Iterable<TElement>;
    getRemovedElements(): Iterable<TElement>;
    getReplacedElements(): Iterable<UpdateRef<TElement>>;
    getChangedElements(): Iterable<TElement>;
    getUnchagedElements(): Iterable<TElement>;
}
