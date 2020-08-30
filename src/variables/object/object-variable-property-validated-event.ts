import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { ObjectVariableValidatedEvent } from './object-variable-validated-event';
import { ObjectVariableValidatorState } from './object-variable-validator-state.abstract';
import { VariableValidatedEvent } from '../variable-validated-event';

export class ObjectVariablePropertyValidatedEvent
    extends
    ObjectVariableValidatedEvent
{
    public get source(): VariableValidatedEvent
    {
        return reinterpretCast<VariableValidatedEvent>(super.source);
    }

    public readonly propertyName: string;
    public readonly hasValidityChanged: boolean;

    public constructor(
        propertyName: string,
        hasValidityChanged: boolean,
        isValid: boolean,
        hasWarnings: boolean,
        state: ObjectVariableValidatorState,
        source: VariableValidatedEvent)
    {
        super(isValid, hasWarnings, state, source);
        this.propertyName = propertyName;
        this.hasValidityChanged = hasValidityChanged;
    }
}
