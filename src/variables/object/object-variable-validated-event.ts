import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { VariableValidatedEvent } from '../variable-validated-event';
import { ObjectVariableValidatorState } from './object-variable-validator-state.abstract';

export class ObjectVariableValidatedEvent
    extends
    VariableValidatedEvent
{
    public get state(): ObjectVariableValidatorState
    {
        return reinterpretCast<ObjectVariableValidatorState>(super.state);
    }

    public get source(): Nullable<object>
    {
        return this._source;
    }

    private readonly _source: Nullable<object>;

    public constructor(isValid: boolean, hasWarnings: boolean, state: ObjectVariableValidatorState, source: Nullable<object>)
    {
        super(isValid, hasWarnings, state);
        this._source = source;
    }
}
