import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableCancellableElementsEvent } from './collection-variable-cancellable-elements-event.abstract';

export class CollectionVariableAddingElementsEvent<TKey = any, TElement = any>
    extends
    CollectionVariableCancellableElementsEvent<TKey, TElement>
{
    public readonly elementsToAdd: ReadonlyArray<TElement>;

    public constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        elementsToAdd: ReadonlyArray<TElement>)
    {
        super(originalValue, currentValue);
        this.elementsToAdd = elementsToAdd;
    }

    public cancelAll(): void
    {
        for (const element of this.elementsToAdd)
            this.cancel(element);
    }

    public getAcceptedElements(): Iterable<TElement>
    {
        return this.getAcceptedRange(this.elementsToAdd, e => e);
    }
}
