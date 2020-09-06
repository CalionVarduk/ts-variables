import { IReadonlyKeyedCollection, Iteration } from 'frl-ts-utils/lib/collections';
import { CollectionVariableCancellableElementsEvent } from './collection-variable-cancellable-elements-event.abstract';

export abstract class CollectionVariableElementsEvent<TKey = any, TElement = any>
{
    public get originalValue(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return this.base.originalValue;
    }

    public get currentValue(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return this.base.currentValue;
    }

    protected readonly base: CollectionVariableCancellableElementsEvent<TKey, TElement>;

    protected constructor(base: CollectionVariableCancellableElementsEvent<TKey, TElement>)
    {
        this.base = base;
    }

    public abstract getIgnoredElements(): Iterable<TElement>;

    protected getIgnoredElementRange(expected: Iterable<TElement>, actual: Iterable<TElement>): Iterable<TElement>
    {
        return Iteration.FilterNotNull(
            Iteration.LeftJoin(
                expected, e => this.currentValue.primaryLookup.getEntityKey(e),
                actual, e => this.currentValue.primaryLookup.getEntityKey(e),
                (e, a) => e !== a ? e : null,
                this.currentValue.primaryLookup.keyStringifier));
    }
}
