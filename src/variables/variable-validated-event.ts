import { VariableValidatorState } from './variable-validator-state';

export class VariableValidatedEvent
{
    public get state(): VariableValidatorState
    {
        return this._state;
    }

    public readonly isValid: boolean;
    public readonly hasWarnings: boolean;

    private readonly _state: VariableValidatorState;

    public constructor(isValid: boolean, hasWarnings: boolean, state: VariableValidatorState)
    {
        this.isValid = isValid;
        this.hasWarnings = hasWarnings;
        this._state = state;
    }
}
