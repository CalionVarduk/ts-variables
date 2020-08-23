import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidatorState } from '../variable-validator-state';

export class PrimitiveVariableValidatorState<T = any>
    extends
    VariableValidatorState
{
    public static CreateEmpty<U>(): PrimitiveVariableValidatorState<U>
    {
        return new PrimitiveVariableValidatorState<U>(null, null, null);
    }

    public readonly currentValue: Nullable<DeepReadonly<T>>;

    public constructor(
        currentValue: Nullable<DeepReadonly<T>>,
        errors: Nullable<ReadonlyArray<string>>,
        warnings: Nullable<ReadonlyArray<string>>)
    {
        super(errors, warnings);
        this.currentValue = currentValue;
    }
}
