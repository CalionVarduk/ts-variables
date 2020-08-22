import { IVariableValidatorState } from './variable-validator-state.interface';

export class VariableValidatedEvent
{
    public readonly isValid: boolean;
    public readonly hasWarnings: boolean;
    public readonly state: IVariableValidatorState;

    public constructor(isValid: boolean, hasWarnings: boolean, state: IVariableValidatorState)
    {
        this.isValid = isValid;
        this.hasWarnings = hasWarnings;
        this.state = state;
    }
}
