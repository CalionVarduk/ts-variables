import { IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { ObjectVariableValue } from './object-variable-value';
import { ObjectVariablePropertyChange } from './object-variable-property-change';

export abstract class ObjectVariableChanges
{
    public abstract get currentValue(): ObjectVariableValue;
    public abstract get properties(): IReadonlyUnorderedMap<string, ObjectVariablePropertyChange>;

    protected constructor() {}
}
