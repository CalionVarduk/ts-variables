import { IEvent } from 'frl-ts-utils/lib/events';
import { IVariableValidatorState } from './variable-validator-state.interface';
import { VariableValidatedEvent } from './variable-validated-event';

export interface IVariableValidator
{
    readonly isBusy: boolean;
    readonly isAttached: boolean;
    readonly isValid: boolean;
    readonly hasWarnings: boolean;
    readonly state: IVariableValidatorState;
    readonly onValidated: IEvent<VariableValidatedEvent>;

    detach(): void;
    attach(): void;
    validate(): Promise<void>;
}
