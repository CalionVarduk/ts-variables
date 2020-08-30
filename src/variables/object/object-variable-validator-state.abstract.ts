import { IReadonlyUnorderedMap } from 'frl-ts-utils/lib/collections';
import { VariableValidatorState } from '../variable-validator-state';
import { ObjectVariableValue } from './object-variable-value';
import { ObjectVariablePropertyValidatorState } from './object-variable-property-validator-state';

export abstract class ObjectVariableValidatorState
    extends
    VariableValidatorState
{
    public abstract get currentValue(): ObjectVariableValue;
    public abstract get invalidProperties(): IReadonlyUnorderedMap<string, ObjectVariablePropertyValidatorState>;
    public abstract get propertiesWithWarnings(): IReadonlyUnorderedMap<string, ObjectVariablePropertyValidatorState>;

    protected constructor()
    {
        super();
    }
}
