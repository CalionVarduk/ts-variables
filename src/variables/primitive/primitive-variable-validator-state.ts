import { Nullable, DeepReadonly } from 'frl-ts-utils/lib/types';
import { VariableValidatorState } from '../variable-validator-state';
import { VariableValidationResult } from '../variable-validation-result';

export class PrimitiveVariableValidatorState<T = any>
    extends
    VariableValidatorState
{
    public static CreateEmpty<U>(): PrimitiveVariableValidatorState<U>
    {
        return new PrimitiveVariableValidatorState<U>(null, null, null);
    }

    public static CreateFromResult<U>(
        currentValue: Nullable<DeepReadonly<U>>,
        result: VariableValidationResult):
        PrimitiveVariableValidatorState<U>
    {
        return new PrimitiveVariableValidatorState<U>(currentValue, result.errors, result.warnings);
    }

    public readonly currentValue: Nullable<DeepReadonly<T>>;
    public readonly errors: Nullable<ReadonlyArray<string>>;
    public readonly warnings: Nullable<ReadonlyArray<string>>;

    public constructor(
        currentValue: Nullable<DeepReadonly<T>>,
        errors: Nullable<ReadonlyArray<string>>,
        warnings: Nullable<ReadonlyArray<string>>)
    {
        super();
        this.currentValue = currentValue;
        this.errors = errors;
        this.warnings = warnings;
    }
}
