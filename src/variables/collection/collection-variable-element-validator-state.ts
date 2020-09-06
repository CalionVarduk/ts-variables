import { DeepReadonly, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidatorState } from '../variable-validator-state';
import { IVariable } from '../variable.interface';

export class CollectionVariableElementValidatorState<TKey = any, TElement = any>
{
    public readonly key: DeepReadonly<TKey>;
    public readonly element: DeepReadonly<TElement>;
    public readonly state: VariableValidatorState;

    public constructor(key: DeepReadonly<TKey>, element: TElement & IVariable)
    {
        this.key = key;
        this.element = toDeepReadonly(element);
        this.state = element.validator.state;
    }
}
