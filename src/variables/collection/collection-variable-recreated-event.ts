import { Nullable, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { isNull } from 'frl-ts-utils/lib/functions';
import { IReadonlyKeyedCollection, Iteration } from 'frl-ts-utils/lib/collections';
import { CollectionVariableRecreationSource } from './collection-variable-recreation-source.enum';
import { ICollectionVariableChangeTracker } from './collection-variable-change-tracker.interface';
import { UpdateRef } from '../../update-ref';

function getChangeRange<TKey, TElement, TResult>(
    outer: IReadonlyKeyedCollection<TKey, TElement>,
    inner: IReadonlyKeyedCollection<TKey, TElement>,
    resultMapper: (o: TElement, i: Nullable<TElement>) => Nullable<TResult>):
    Iterable<TResult>
{
    return Iteration.FilterNotNull(
        Iteration.LeftJoin(
            outer.entities(), e => outer.primaryLookup.getEntityKey(e),
            inner.entities(), e => inner.primaryLookup.getEntityKey(e),
            resultMapper,
            outer.primaryLookup.keyStringifier));
}

export class CollectionVariableRecreatedEvent<TKey = any, TElement = any>
{
    public readonly originalValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly previousValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly currentValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly recreationSource: CollectionVariableRecreationSource;

    private readonly _changeTracker: ICollectionVariableChangeTracker<TKey, TElement>;

    public constructor(
        previousValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        recreationSource: CollectionVariableRecreationSource,
        changeTracker: ICollectionVariableChangeTracker<TKey, TElement>)
    {
        this.originalValue = changeTracker.originalValue;
        this.previousValue = previousValue;
        this.currentValue = currentValue;
        this.recreationSource = recreationSource;
        this._changeTracker = changeTracker;
    }

    public getAddedElements(): Iterable<TElement>
    {
        return getChangeRange(this.currentValue, this.previousValue,
            (current, previous) => isNull(previous) ? current : null);
    }

    public getRemovedElements(): Iterable<TElement>
    {
        return getChangeRange(this.previousValue, this.currentValue,
            (previous, current) => isNull(current) ? previous : null);
    }

    public getReplacedElements(): Iterable<UpdateRef<TElement>>
    {
        return getChangeRange(this.currentValue, this.previousValue,
            (current, previous) =>
                isNull(previous) ||
                this._changeTracker.areElementsEqual(
                    toDeepReadonly(current), toDeepReadonly(previous)) ?
                    null :
                    new UpdateRef<TElement>(current, previous));
    }

    public getPersistedElements(): Iterable<TElement>
    {
        return getChangeRange(this.currentValue, this.previousValue,
            (current, previous) =>
                !isNull(previous) &&
                this._changeTracker.areElementsEqual(
                    toDeepReadonly(current), toDeepReadonly(previous)) ?
                    current :
                    null);
    }
}
