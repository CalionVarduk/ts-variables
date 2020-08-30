import { MapEntry } from 'frl-ts-utils/lib/collections';
import { VariableValidatorState } from '../variable-validator-state';
import { IVariable } from '../variable.interface';

export class ObjectVariablePropertyValidatorState
{
    public readonly name: string;
    public readonly state: VariableValidatorState;

    public constructor(property: MapEntry<string, IVariable>)
    {
        this.name = property.key;
        this.state = property.value.validator.state;
    }
}
