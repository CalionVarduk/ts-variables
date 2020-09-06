import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { Iteration } from 'frl-ts-utils/lib/collections';
import { CollectionVariableElementsEvent } from './collection-variable-elements-event.abstract';
import { CollectionVariableSettingElementsEvent } from './collection-variable-setting-elements-event';
import { UpdateRef } from '../../update-ref';

export class CollectionVariableElementsSetEvent<TKey = any, TElement = any>
    extends
    CollectionVariableElementsEvent<TKey, TElement>
{
    public readonly addedElements: ReadonlyArray<TElement>;
    public readonly replacedElements: ReadonlyArray<UpdateRef<TElement>>;

    public constructor(
        base: CollectionVariableSettingElementsEvent<TKey, TElement>,
        addedElements: ReadonlyArray<TElement>,
        replacedElements: ReadonlyArray<UpdateRef<TElement>>)
    {
        super(base);
        this.addedElements = addedElements;
        this.replacedElements = replacedElements;
    }

    public getIgnoredElements(): Iterable<TElement>
    {
        const base = reinterpretCast<CollectionVariableSettingElementsEvent<TKey, TElement>>(this.base);

        return Iteration.Concat(
            this.getIgnoredElementRange(
                Iteration.Map(base.elementsToReplace, e => e.value),
                Iteration.Map(this.replacedElements, e => e.value)),
            this.getIgnoredElementRange(base.elementsToAdd, this.addedElements));
    }
}
