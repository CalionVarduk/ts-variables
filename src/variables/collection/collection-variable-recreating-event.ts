import { Nullable, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { isNull } from 'frl-ts-utils/lib/functions';
import { IReadonlyKeyedCollection, Iteration } from 'frl-ts-utils/lib/collections';
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

export class CollectionVariableRecreatingEvent<TKey = any, TElement = any>
{
    public readonly originalValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly currentValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly nextValue: IReadonlyKeyedCollection<TKey, TElement>;
    public cancel: boolean;

    private readonly _changeTracker: ICollectionVariableChangeTracker<TKey, TElement>;

    public constructor(
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        nextValue: IReadonlyKeyedCollection<TKey, TElement>,
        changeTracker: ICollectionVariableChangeTracker<TKey, TElement>)
    {
        this.originalValue = changeTracker.originalValue;
        this.currentValue = currentValue;
        this.nextValue = nextValue;
        this._changeTracker = changeTracker;
        this.cancel = false;
    }

    public getElementsToAdd(): Iterable<TElement>
    {
        return getChangeRange(this.nextValue, this.currentValue,
            (next, current) => isNull(current) ? next : null);
    }

    public getElementsToRemove(): Iterable<TElement>
    {
        return getChangeRange(this.currentValue, this.nextValue,
            (current, next) => isNull(next) ? current : null);
    }

    public getElementsToReplace(): Iterable<UpdateRef<TElement>>
    {
        return getChangeRange(this.nextValue, this.currentValue,
            (next, current) =>
                isNull(current) ||
                this._changeTracker.areElementsEqual(
                    toDeepReadonly(next), toDeepReadonly(current)) ?
                    null :
                    new UpdateRef<TElement>(next, current));
    }

    public getElementsToPersist(): Iterable<TElement>
    {
        return getChangeRange(this.nextValue, this.currentValue,
            (next, current) =>
                !isNull(current) &&
                this._changeTracker.areElementsEqual(
                    toDeepReadonly(next), toDeepReadonly(current)) ?
                    next :
                    null);
    }
}
