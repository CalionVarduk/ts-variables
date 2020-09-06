import { reinterpretCast } from 'frl-ts-utils/lib/functions';
import { DeepReadonly, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { CollectionVariableValidatedEvent } from './collection-variable-validated-event';
import { VariableValidatedEvent } from '../variable-validated-event';
import { CollectionVariableValidatorState } from './collection-variable-validator-state';

export class CollectionVariableElementValidatedEvent<TKey = any, TElement = any>
    extends
    CollectionVariableValidatedEvent<TKey, TElement>
{
    public get source(): VariableValidatedEvent
    {
        return reinterpretCast<VariableValidatedEvent>(super.source);
    }

    public readonly key: DeepReadonly<TKey>;
    public readonly element: DeepReadonly<TElement>;
    public readonly hasValidityChanged: boolean;

    public constructor(
        key: DeepReadonly<TKey>,
        element: TElement,
        hasValidityChanged: boolean,
        isValid: boolean,
        hasWarnings: boolean,
        state: CollectionVariableValidatorState<TKey, TElement>,
        source: VariableValidatedEvent)
    {
        super(isValid, hasWarnings, state, source);
        this.key = key;
        this.element = toDeepReadonly(element);
        this.hasValidityChanged = hasValidityChanged;
    }
}
