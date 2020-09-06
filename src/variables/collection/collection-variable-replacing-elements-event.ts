import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableCancellableElementsEvent } from './collection-variable-cancellable-elements-event.abstract';
import { UpdateRef } from '../../update-ref';

export class CollectionVariableReplacingElementsEvent<TKey = any, TElement = any>
    extends
    CollectionVariableCancellableElementsEvent<TKey, TElement>
{
    public readonly elementsToReplace: ReadonlyArray<UpdateRef<TElement>>;

    public constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        elementsToReplace: ReadonlyArray<UpdateRef<TElement>>)
    {
        super(originalValue, currentValue);
        this.elementsToReplace = elementsToReplace;
    }

    public cancelAll(): void
    {
        for (const element of this.elementsToReplace)
            this.cancel(element.value);
    }

    public getAcceptedElements(): Iterable<UpdateRef<TElement>>
    {
        return this.getAcceptedRange(this.elementsToReplace, e => e.value);
    }
}
