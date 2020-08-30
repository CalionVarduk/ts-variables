import { MapEntry } from 'frl-ts-utils/lib/collections';
import { IVariableValidator } from '../variable-validator.interface';
import { ObjectVariableValidatorState } from './object-variable-validator-state.abstract';
import { IVariable } from '../variable.interface';

export interface IObjectVariableValidator
    extends
    IVariableValidator
{
    readonly state: ObjectVariableValidatorState;

    getValidProperties(): Iterable<MapEntry<string, IVariable>>;
    getInvalidProperties(): Iterable<MapEntry<string, IVariable>>;
    getPropertiesWithWarnings(): Iterable<MapEntry<string, IVariable>>;
}
