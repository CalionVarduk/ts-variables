import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { CollectionVariableElementsEvent } from './collection-variable-elements-event.abstract';
import { CollectionVariableRemovingElementsEvent } from './collection-variable-removing-elements-event';

export class CollectionVariableElementsRemovedEvent<TKey = any, TElement = any>
    extends
    CollectionVariableElementsEvent<TKey, TElement>
{
    public readonly removedElements: ReadonlyArray<TElement>;

    public constructor(
        base: CollectionVariableRemovingElementsEvent<TKey, TElement>,
        removedElements: ReadonlyArray<TElement>)
    {
        super(base);
        this.removedElements = removedElements;
    }

    public getIgnoredElements(): Iterable<TElement>
    {
        const base = reinterpretCast<CollectionVariableRemovingElementsEvent<TKey, TElement>>(this.base);
        return this.getIgnoredElementRange(base.elementsToRemove, this.removedElements);
    }
}
