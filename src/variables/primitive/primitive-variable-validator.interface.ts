import { IVariableValidator } from '../variable-validator.interface';
import { PrimitiveVariableValidatorState } from './primitive-variable-validator-state';

export interface IPrimitiveVariableValidator<T = any>
    extends
    IVariableValidator
{
    readonly state: PrimitiveVariableValidatorState<T>;
}
