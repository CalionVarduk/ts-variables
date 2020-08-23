import { IEvent } from 'frl-ts-utils/lib/events';
import { VariableValidatorState } from './variable-validator-state';
import { VariableValidatedEvent } from './variable-validated-event';

export interface IVariableValidator
{
    readonly isBusy: boolean;
    readonly isAttached: boolean;
    readonly isValid: boolean;
    readonly hasWarnings: boolean;
    readonly state: VariableValidatorState;
    readonly onValidated: IEvent<VariableValidatedEvent>;

    detach(): void;
    attach(): void;
    validate(): Promise<void>;
}
