import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { CollectionVariableElementsEvent } from './collection-variable-elements-event.abstract';
import { CollectionVariableReplacingElementsEvent } from './collection-variable-replacing-elements-event';
import { UpdateRef } from '../../update-ref';

export class CollectionVariableElementsReplacedEvent<TKey = any, TElement = any>
    extends
    CollectionVariableElementsEvent<TKey, TElement>
{
    public readonly replacedElements: ReadonlyArray<UpdateRef<TElement>>;

    public constructor(
        base: CollectionVariableReplacingElementsEvent<TKey, TElement>,
        replacedElements: ReadonlyArray<UpdateRef<TElement>>)
    {
        super(base);
        this.replacedElements = replacedElements;
    }

    public getIgnoredElements(): Iterable<TElement>
    {
        const base = reinterpretCast<CollectionVariableReplacingElementsEvent<TKey, TElement>>(this.base);
        return this.getIgnoredElementRange(
            Iteration.Map(base.elementsToReplace, e => e.value),
            Iteration.Map(this.replacedElements, e => e.value));
    }
}
