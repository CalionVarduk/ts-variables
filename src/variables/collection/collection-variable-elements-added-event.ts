import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { CollectionVariableElementsEvent } from './collection-variable-elements-event.abstract';
import { CollectionVariableAddingElementsEvent } from './collection-variable-adding-elements-event';

export class CollectionVariableElementsAddedEvent<TKey = any, TElement = any>
    extends
    CollectionVariableElementsEvent<TKey, TElement>
{
    public readonly addedElements: ReadonlyArray<TElement>;

    public constructor(
        base: CollectionVariableAddingElementsEvent<TKey, TElement>,
        addedElements: ReadonlyArray<TElement>)
    {
        super(base);
        this.addedElements = addedElements;
    }

    public getIgnoredElements(): Iterable<TElement>
    {
        const base = reinterpretCast<CollectionVariableAddingElementsEvent<TKey, TElement>>(this.base);
        return this.getIgnoredElementRange(base.elementsToAdd, this.addedElements);
    }
}
