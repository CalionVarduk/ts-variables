import { IReadonlyKeyedCollection } from 'frl-ts-utils/lib/collections';
import { CollectionVariableCancellableElementsEvent } from './collection-variable-cancellable-elements-event.abstract';
import { UpdateRef } from '../../update-ref';

export class CollectionVariableSettingElementsEvent<TKey = any, TElement = any>
    extends
    CollectionVariableCancellableElementsEvent<TKey, TElement>
{
    public readonly elementsToAdd: ReadonlyArray<TElement>;
    public readonly elementsToReplace: ReadonlyArray<UpdateRef<TElement>>;

    public constructor(
        originalValue: IReadonlyKeyedCollection<TKey, TElement>,
        currentValue: IReadonlyKeyedCollection<TKey, TElement>,
        elementsToAdd: ReadonlyArray<TElement>,
        elementsToReplace: ReadonlyArray<UpdateRef<TElement>>)
    {
        super(originalValue, currentValue);
        this.elementsToAdd = elementsToAdd;
        this.elementsToReplace = elementsToReplace;
    }

    public cancelAll(): void
    {
        for (const element of this.elementsToAdd)
            this.cancel(element);

        for (const element of this.elementsToReplace)
            this.cancel(element.value);
    }

    public getAcceptedElementsToAdd(): Iterable<TElement>
    {
        return this.getAcceptedRange(this.elementsToAdd, e => e);
    }

    public getAcceptedElementsToReplace(): Iterable<UpdateRef<TElement>>
    {
        return this.getAcceptedRange(this.elementsToReplace, e => e.value);
    }
}
