import { DeepReadonly, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { deepReadonlyCast } from 'frl-ts-utils/lib/functions';
import { IReadonlyKeyedCollection, UnorderedSet, Iteration } from 'frl-ts-utils/lib/collections';

export abstract class CollectionVariableCancellableElementsEvent<TKey = any, TElement = any>
{
    public readonly originalValue: IReadonlyKeyedCollection<TKey, TElement>;
    public readonly currentValue: IReadonlyKeyedCollection<TKey, TElement>;

    private readonly _cancelledKeys: UnorderedSet<TKey>;

    protected constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>)
    {
        this.originalValue = originalValue;
        this.currentValue = currentValue;
        this._cancelledKeys = new UnorderedSet<TKey>(currentValue.primaryLookup.keyStringifier);
    }

    public abstract cancelAll(): void;

    public cancel(element: TElement): void
    {
        const key = this.currentValue.primaryLookup.getEntityKey(toDeepReadonly(element));
        this.cancelKey(key);
    }

    public cancelKey(key: DeepReadonly<TKey>): void
    {
        this._cancelledKeys.tryAdd(deepReadonlyCast(key));
    }

    public isCancelled(element: DeepReadonly<TElement>): boolean
    {
        const key = this.currentValue.primaryLookup.getEntityKey(element);
        return this.isKeyCancelled(key);
    }

    public isKeyCancelled(key: DeepReadonly<TKey>): boolean
    {
        return this._cancelledKeys.has(key);
    }

    protected getAcceptedRange<TResult>(
        source: Iterable<TResult>,
        elementSelector: (obj: TResult) => TElement):
        Iterable<TResult>
    {
        return Iteration.Filter(
            source, obj =>
            {
                const element = elementSelector(obj);
                return !this.isCancelled(toDeepReadonly(element));
            });
    }
}
