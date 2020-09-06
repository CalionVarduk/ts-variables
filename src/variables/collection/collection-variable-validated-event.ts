import { Nullable } from 'frl-ts-utils/lib/types';
import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { CollectionVariableValidatorState } from './collection-variable-validator-state';
import { VariableValidatedEvent } from '../variable-validated-event';

export class CollectionVariableValidatedEvent<TKey = any, TElement = any>
    extends
    VariableValidatedEvent
{
    public get state(): CollectionVariableValidatorState<TKey, TElement>
    {
        return reinterpretCast<CollectionVariableValidatorState<TKey, TElement>>(super.state);
    }

    public get source(): Nullable<object>
    {
        return this._source;
    }

    private readonly _source: Nullable<object>;

    public constructor(
        isValid: boolean,
        hasWarnings: boolean,
        state: CollectionVariableValidatorState<TKey, TElement>,
        source: Nullable<object>)
    {
        super(isValid, hasWarnings, state);
        this._source = source;
    }
}
