import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { VariableValidatedEvent } from '../variable-validated-event';
import { PrimitiveVariableValidatorState } from './primitive-variable-validator-state';

export class PrimitiveVariableValidatedEvent<T = any>
    extends
    VariableValidatedEvent
{
    public get state(): PrimitiveVariableValidatorState<T>
    {
        return reinterpretCast<PrimitiveVariableValidatorState<T>>(super.state);
    }

    public constructor(isValid: boolean, hasWarnings: boolean, state: PrimitiveVariableValidatorState<T>)
    {
        super(isValid, hasWarnings, state);
    }
}
