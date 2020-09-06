import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableCancellableElementsEvent } from './collection-variable-cancellable-elements-event.abstract';

export class CollectionVariableRemovingElementsEvent<TKey = any, TElement = any>
    extends
    CollectionVariableCancellableElementsEvent<TKey, TElement>
{
    public readonly elementsToRemove: ReadonlyArray<TElement>;

    public constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        elementsToRemove: ReadonlyArray<TElement>)
    {
        super(originalValue, currentValue);
        this.elementsToRemove = elementsToRemove;
    }

    public cancelAll(): void
    {
        for (const element of this.elementsToRemove)
            this.cancel(element);
    }

    public getAcceptedElements(): Iterable<TElement>
    {
        return this.getAcceptedRange(this.elementsToRemove, e => e);
    }
}
